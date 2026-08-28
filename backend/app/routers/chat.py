"""Layanan Chat & AI (/v1/chat) - guardrail SIAGA -> Local AI LLM."""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from .. import db
from ..deps import get_current_user
from ..engine import get_engine_instance
from ..llm_client import generate_reply, stream_reply
from ..schemas import (
    ChatMessageIn,
    ChatMessageOut,
    ChatResponse,
    ChatSessionOut,
    CreateSessionRequest,
    InspectRequest,
    ProbeVerifyRequest,
    StatefulMetrics,
)

router = APIRouter(prefix="/v1/chat", tags=["chat"])

BLOCK_REPLY = (
    "Akses dibatasi. Sistem mendeteksi anomali pada pola percakapan ini. "
    "Jika Anda manusia yang sah, hubungi tim dukungan untuk pemulihan sesi."
)


def _run_guardrail(session_id: str, content: str, prev_system_output: str | None):
    engine = get_engine_instance()
    sess = engine.store.get_session(session_id)
    turn = (sess.turns_count or 0) + 1 if sess else 1
    req = InspectRequest(
        session_id=session_id, turn=turn, text=content,
        prev_system_output=prev_system_output, channel_owned=True, channel="psycho_web",
    )
    return engine.inspect(req)


def _metrics(ins) -> StatefulMetrics:
    return StatefulMetrics(
        momentum=ins.signals.momentum,
        direction_consistency=ins.signals.direction,
        anchor_score=ins.signals.anchor,
        turns_to_detection=ins.ttd,
    )


def _save_turn(session_id: str, patient_uid: str, content: str, reply: str,
               ins, decision_final: str) -> None:
    risk = ins.signals.momentum if decision_final in ("probe",) else ins.score
    db.add_message(session_id, "user", content, risk_score=round(risk, 4),
                   decision=decision_final.upper())
    db.add_message(session_id, "assistant", reply, risk_score=round(ins.score, 4),
                   decision=decision_final.upper())
    status_map = {"block": "blocked", "probe": "flagged", "watch": "flagged"}
    update = {"status": status_map[decision_final]} if decision_final in status_map else {}
    db.update_chat_session(session_id, update)
    db.add_security_log(
        session_id=session_id, patient_uid=patient_uid, risk_score=ins.score,
        decision=decision_final.upper(),
        explanation="; ".join(e.reason for e in ins.explanation)[:500],
        latency_ms=ins.latency_ms.get("total"),
    )


@router.post("/message", response_model=ChatResponse)
def send_message(body: ChatMessageIn, user: dict = Depends(get_current_user)):
    # 1. Sesi: pakai yang ada (milik user) atau buat baru
    if body.session_id:
        session = db.get_chat_session(body.session_id)
        if not session or session.get("patientUid") != user["uid"]:
            raise HTTPException(404, "Session not found")
        session_id = body.session_id
    else:
        session = db.create_chat_session(user["uid"], body.content[:60])
        session_id = session["sessionId"]

    history = db.list_messages(session_id)
    prev_system = next((m["content"] for m in reversed(history) if m["role"] == "assistant"), None)

    # 2. Guardrail L0-L3
    ins = _run_guardrail(session_id, body.content, prev_system)

    # 3. Keputusan
    if ins.decision == "block":
        reply = BLOCK_REPLY
        status = "BLOCKED"
    elif ins.decision == "probe":
        reply = ins.probe_action.injected_prompt if ins.probe_action else BLOCK_REPLY
        status = "BLOCKED"
    else:
        reply = _generate_sync(history, body.content)
        status = "ALLOWED"

    _save_turn(session_id, user["uid"], body.content, reply, ins, ins.decision)

    reason = None
    if ins.decision == "block":
        reason = "Cumulative risk threshold exceeded."
    elif ins.decision == "probe" and ins.probe_action:
        reason = f"Reverse Turing Probe level {ins.probe_action.level} ({ins.probe_action.probe_type})."

    return ChatResponse(
        session_id=session_id, status=status, decision=ins.decision.upper(),
        reply=reply, risk_score=ins.score, reason=reason,
        stateful_metrics=_metrics(ins), latency_ms=ins.latency_ms,
        explanation=ins.explanation,
    )


def _generate_sync(history: list[dict], content: str) -> str:
    return asyncio.run(generate_reply(history, content))


@router.post("/stream")
async def stream_message(body: ChatMessageIn, user: dict = Depends(get_current_user)):
    if body.session_id:
        session = db.get_chat_session(body.session_id)
        if not session or session.get("patientUid") != user["uid"]:
            raise HTTPException(404, "Session not found")
        session_id = body.session_id
    else:
        session = db.create_chat_session(user["uid"], body.content[:60])
        session_id = session["sessionId"]

    history = db.list_messages(session_id)
    prev_system = next((m["content"] for m in reversed(history) if m["role"] == "assistant"), None)
    ins = _run_guardrail(session_id, body.content, prev_system)

    async def event_gen():
        yield f"event: guardrail\ndata: {json.dumps({'decision': ins.decision.upper(), 'risk_score': ins.score, 'session_id': session_id, 'stateful_metrics': _metrics(ins).model_dump(), 'latency_ms': ins.latency_ms}, ensure_ascii=False)}\n\n"

        if ins.decision == "block":
            reply = BLOCK_REPLY
            yield f"event: token\ndata: {json.dumps({'t': reply}, ensure_ascii=False)}\n\n"
        elif ins.decision == "probe":
            reply = ins.probe_action.injected_prompt if ins.probe_action else BLOCK_REPLY
            yield f"event: token\ndata: {json.dumps({'t': reply}, ensure_ascii=False)}\n\n"
        else:
            parts: list[str] = []
            try:
                async for tok in stream_reply(history, body.content):
                    parts.append(tok)
                    yield f"event: token\ndata: {json.dumps({'t': tok}, ensure_ascii=False)}\n\n"
            except Exception:
                pass
            reply = "".join(parts).strip() or "(balasan kosong)"

        _save_turn(session_id, user["uid"], body.content, reply, ins, ins.decision)
        yield f"event: done\ndata: {json.dumps({'session_id': session_id, 'decision': ins.decision.upper()})}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/probe/verify")
def probe_verify(body: ProbeVerifyRequest, user: dict = Depends(get_current_user)):
    session = db.get_chat_session(body.session_id)
    if not session or session.get("patientUid") != user["uid"]:
        raise HTTPException(404, "Session not found")
    engine = get_engine_instance()
    res = engine.probe_verify(body.session_id, body.reply)
    if res.outcome in ("bot_confirmed", "human", "ambiguous"):
        db.add_message(body.session_id, "user", body.reply,
                       risk_score=res.score, decision=res.decision.upper())
        if res.session_blocked:
            db.update_chat_session(body.session_id, {"status": "blocked"})
        db.add_security_log(
            session_id=body.session_id, patient_uid=user["uid"], risk_score=res.score,
            decision=res.decision.upper(), explanation=res.reason,
        )
    return res


@router.get("/sessions", response_model=list[ChatSessionOut])
def list_sessions(user: dict = Depends(get_current_user)):
    return [ChatSessionOut(**s) for s in db.list_chat_sessions(user["uid"])]


@router.post("/sessions", response_model=ChatSessionOut)
def create_session(body: CreateSessionRequest, user: dict = Depends(get_current_user)):
    s = db.create_chat_session(user["uid"], body.title)
    return ChatSessionOut(**s)


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
def get_messages(session_id: str, user: dict = Depends(get_current_user)):
    session = db.get_chat_session(session_id)
    if not session or session.get("patientUid") != user["uid"]:
        raise HTTPException(404, "Session not found")
    return [ChatMessageOut(**m) for m in db.list_messages(session_id)]


@router.get("/sessions/{session_id}/metrics")
def session_metrics(session_id: str, user: dict = Depends(get_current_user)):
    """Metrik CIM per sesi (kurva momentum, keputusan per turn) - feed Live Guard Monitor."""
    engine = get_engine_instance()
    metrics = engine.store.session_metrics(session_id)
    if metrics is None:
        raise HTTPException(404, "No guardrail state for this session")
    return metrics
