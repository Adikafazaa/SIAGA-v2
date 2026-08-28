"""Orkestrator mesin SIAGA v2 - L0..L3 -> fusi -> keputusan (tanpa panggil LLM).

Pemanggilan Local AI LLM ada di layer router (mendukung streaming). Engine
hanya memutuskan: ALLOW/WATCH -> teruskan; PROBE -> tantangan; BLOCK -> putus.
State sesi disimpan sebagai hash + fitur, TANPA teks mentah (zero-plaintext).
"""
from __future__ import annotations

import time
from dataclasses import dataclass

from .config import (
    CIM_DECAY_LAMBDA,
    CIM_W1,
    CIM_W2,
    CIM_W3,
    DIRECTION_WINDOW_K,
    DB_PATH,
)
from .core import fusion
from .core.l0_canonicalize import canonicalize
from .core.l1_onnx_engine import get_engine as get_l1
from .core.l2_context import evaluate as l2_evaluate
from .core.l3_cim.anchor import anchor_similarity
from .core.l3_cim.momentum import CIMAccumulator, CIMState
from .core.l3_cim.state import SessionStore, TurnRecord, token_hash
from .core.l3_cim.trajectory import RESURGENCE_MIN_RISK, TrajectoryGraph
from .probe.clinical_canary import ProbeVerdict, build_probe, evaluate_reply
from .probe.protocol import escalation_level, should_probe
from .schemas import (
    ExplanationItem,
    InspectRequest,
    InspectResponse,
    ProbeActionOut,
    ProbeVerifyResponse,
    SignalBreakdown,
)

ENGINE_VERSION = "siaga-cim-v0"
RESURGENCE_GAMMA_FLOOR = 0.75


@dataclass
class _SessionRuntime:
    graph: TrajectoryGraph


class SIAGAEngine:
    def __init__(self, db_path=DB_PATH) -> None:
        self.l1 = get_l1()
        self.store = SessionStore(db_path)
        self.accumulator = CIMAccumulator(
            w1=CIM_W1, w2=CIM_W2, w3=CIM_W3, lam=CIM_DECAY_LAMBDA,
            window_k=DIRECTION_WINDOW_K,
        )
        self._runtimes: dict[str, _SessionRuntime] = {}

    def _runtime(self, session_id: str) -> _SessionRuntime:
        rt = self._runtimes.get(session_id)
        if rt is None:
            graph = TrajectoryGraph()
            for turn, vec, risk, momentum in self.store.load_embeddings(session_id):
                graph.add(turn, vec, risk, momentum)
            rt = _SessionRuntime(graph=graph)
            self._runtimes[session_id] = rt
        return rt

    def inspect(self, req: InspectRequest) -> InspectResponse:
        t_total = time.perf_counter()
        self.store.cleanup_expired()

        sess = self.store.get_session(req.session_id)
        if sess is not None and sess.blocked:
            return self._frozen_response(req, sess)

        t0 = time.perf_counter()
        l0 = canonicalize(req.text)
        l0_ms = (time.perf_counter() - t0) * 1000

        t0 = time.perf_counter()
        vec = self.l1.embed(l0.clean_text)
        sig = self.l1.score(l0.clean_text)
        risk_r = self.l1.risk_position(vec, sig.intent)
        l1_ms = (time.perf_counter() - t0) * 1000

        vec_prev_sys = (
            self.l1.embed(canonicalize(req.prev_system_output).clean_text)
            if req.prev_system_output
            else None
        )
        anchor_raw = anchor_similarity(vec, vec_prev_sys)

        t0 = time.perf_counter()
        sess = sess or self.store.get_session(req.session_id)
        burst = self.store.turns_last_minute(req.session_id) if sess else 0
        l2s = l2_evaluate(l0.clean_text, turns_last_minute=burst)
        l2_ms = (time.perf_counter() - t0) * 1000

        self.store.ensure_session(req.session_id, req.channel_owned, req.channel)
        sess = self.store.get_session(req.session_id)
        state = CIMState(
            momentum_prev=(sess.momentum_override if sess.momentum_override is not None
                           else sess.momentum_prev),
            risk_history=sess.risk_history,
            delta_history=sess.delta_history,
            anchor_baseline=sess.anchor_baseline,
        )
        if sess.momentum_override is not None:
            self.store.clear_momentum_override(req.session_id)

        t0 = time.perf_counter()
        rt = self._runtime(req.session_id)
        resurgence = rt.graph.add(req.turn, vec, risk_r, state.momentum_prev)
        gamma_floor = 0.0
        if resurgence is not None and resurgence.linked_risk >= RESURGENCE_MIN_RISK:
            gamma_floor = RESURGENCE_GAMMA_FLOOR
        step = self.accumulator.step(state, risk_r, anchor_raw, self.l1.harm_similarity(vec),
                                     gamma_floor=gamma_floor)
        if rt.graph.nodes:
            rt.graph.nodes[-1].momentum = step.momentum
        if resurgence is not None and resurgence.linked_risk >= RESURGENCE_MIN_RISK:
            boost = (resurgence.linked_momentum
                     + self.accumulator.w3 * risk_r
                     + self.accumulator.w1 * step.delta * step.direction)
            step.momentum = max(step.momentum, min(1.0, boost))
        cim_ms = (time.perf_counter() - t0) * 1000

        score = fusion.fuse(step.momentum, sig.intent, l2s.context_risk)
        baseline_single = risk_r
        baseline_max = max(sess.baseline_max, baseline_single)

        decision = fusion.decide(score, step.direction, step.delta)
        can_probe, _ = should_probe(score, req.channel_owned, sess.probe_count)
        probe_action: ProbeActionOut | None = None
        if decision == "probe":
            if can_probe:
                action = build_probe(escalation_level(score), req.session_id)
                self.store.issue_probe(req.session_id, action.level, action.probe_type,
                                       action.canary_token or "")
                probe_action = ProbeActionOut(
                    triggered=True, level=action.level,
                    probe_type=action.probe_type, injected_prompt=action.injected_prompt,
                )
            else:
                decision = "watch"

        uncertainty = fusion.uncertainty(score, sig.intent, step.momentum)

        self.store.record_turn(
            req.session_id,
            rec=self._turn_record(req, step, sig, l2s, baseline_single, decision),
            embedding=vec,
            text_hash=token_hash(l0.clean_text),
            anchor_baseline=state.anchor_baseline,
            baseline_max=baseline_max,
        )
        self.store.mark_decision(req.session_id, decision, req.turn)
        self.store.record_turn_anchor_baseline(
            req.session_id,
            fusion.advance_anchor_baseline(state.anchor_baseline, anchor_raw, step.delta),
        )

        explanation = fusion.explain(req.turn, step, sig, l0.anomalies, l2s.notes,
                                     resurgence, score, decision)

        return InspectResponse(
            decision=decision,
            score=round(score, 4),
            uncertainty=round(uncertainty, 4),
            turn=req.turn,
            ttd=self.store.get_session(req.session_id).ttd_turn,
            signals=SignalBreakdown(
                momentum=round(step.momentum, 4),
                direction=round(step.direction, 4),
                anchor=round(anchor_raw, 4),
                provenance=round(sig.provenance, 4),
                intent=round(sig.intent, 4),
                l2_context=round(l2s.context_risk, 4),
                l0_anomalies=l0.anomalies,
                l2_notes=l2s.notes,
                baseline_single=round(baseline_single, 4),
            ),
            probe_action=probe_action,
            explanation=explanation,
            baseline_per_message_max=round(baseline_max, 4),
            baseline_stateless_decision=fusion.stateless_decision(baseline_single),
            session_blocked=False,
            latency_ms=self._latency(l0_ms, l1_ms, l2_ms, cim_ms, t_total),
        )

    def probe_verify(self, session_id: str, reply_raw: str) -> ProbeVerifyResponse:
        pending = self.store.pending_probe(session_id)
        if pending is None:
            return ProbeVerifyResponse(
                session_id=session_id, outcome="no_pending_probe", decision="allow",
                score=0.0, reason="Tidak ada probe tertunda pada sesi ini.",
            )
        level, probe_type, canary_token = pending
        reply = canonicalize(reply_raw).clean_text
        verdict: ProbeVerdict = evaluate_reply(probe_type, canary_token, reply)
        sess = self.store.get_session(session_id)
        turn = (sess.turns_count or 0) + 1

        if verdict.outcome == "bot_confirmed":
            self.store.resolve_probe(session_id, "bot_confirmed")
            self.store.freeze_session(session_id, turn)
            self.store.record_turn(
                session_id,
                rec=self._simple_record(turn, 1.0, 1.0, "block"),
                embedding=self.l1.embed(reply),
                text_hash=token_hash(reply),
                anchor_baseline=sess.anchor_baseline,
                baseline_max=sess.baseline_max,
            )
            return ProbeVerifyResponse(
                session_id=session_id, outcome="bot_confirmed", decision="block",
                score=1.0, reason=verdict.reason, turn=turn,
                ttd=sess.ttd_turn or turn, session_blocked=True,
            )
        if verdict.outcome == "human":
            self.store.resolve_probe(session_id, "human")
            damped = 0.6 * (sess.momentum_prev or 0.0)
            self.store.mark_decision(session_id, "watch", turn, momentum_override=damped)
            return ProbeVerifyResponse(
                session_id=session_id, outcome="human", decision="watch",
                score=round(damped, 4), reason=verdict.reason, turn=turn,
                ttd=sess.ttd_turn, session_blocked=False,
            )
        self.store.resolve_probe(session_id, "ambiguous")
        return ProbeVerifyResponse(
            session_id=session_id, outcome="ambiguous", decision="watch",
            score=round(sess.momentum_prev or 0.0, 4), reason=verdict.reason,
            turn=turn, ttd=sess.ttd_turn, session_blocked=False,
        )

    def _frozen_response(self, req: InspectRequest, sess) -> InspectResponse:
        return InspectResponse(
            decision="block",
            score=1.0,
            uncertainty=0.0,
            turn=req.turn,
            ttd=sess.ttd_turn,
            signals=SignalBreakdown(
                momentum=1.0, direction=1.0, anchor=0.0, provenance=0.0, intent=0.0,
                l2_context=0.0, l0_anomalies=[], l2_notes=[], baseline_single=1.0,
            ),
            explanation=[ExplanationItem(
                turn=req.turn,
                reason="Sesi dibekukan: adversarial agent terkonfirmasi lewat "
                       "Reverse Turing Probe / blokir permanen.",
            )],
            baseline_per_message_max=sess.baseline_max,
            baseline_stateless_decision="block",
            session_blocked=True,
            latency_ms={"l0": 0.0, "l1": 0.0, "l2": 0.0, "cim": 0.0, "total": 0.0},
        )

    def _turn_record(self, req, step, sig, l2s, baseline_single, decision) -> TurnRecord:
        return TurnRecord(
            turn_index=req.turn, risk_r=step.risk_r, delta=step.delta,
            intent=sig.intent, provenance=sig.provenance, l2=l2s.context_risk,
            momentum=step.momentum, direction=step.direction, anchor=step.anchor,
            baseline_single=baseline_single, decision=decision,
        )

    def _simple_record(self, turn, risk, momentum, decision) -> TurnRecord:
        return TurnRecord(
            turn_index=turn, risk_r=risk, delta=0.0, intent=0.0, provenance=0.0,
            l2=0.0, momentum=momentum, direction=0.0, anchor=0.0,
            baseline_single=1.0, decision=decision,
        )

    def _latency(self, l0_ms, l1_ms, l2_ms, cim_ms, t_total) -> dict[str, float]:
        return {
            "l0": round(l0_ms, 2),
            "l1": round(l1_ms, 2),
            "l2": round(l2_ms, 2),
            "cim": round(cim_ms, 2),
            "total": round((time.perf_counter() - t_total) * 1000, 2),
        }

    def close(self) -> None:
        self.store.close()


_engine: SIAGAEngine | None = None


def get_engine_instance() -> SIAGAEngine:
    global _engine
    if _engine is None:
        _engine = SIAGAEngine()
    return _engine
