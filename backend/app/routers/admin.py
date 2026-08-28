"""Security & System Telemetry SOC (/v1/admin) - dashboard keamanan SIAGA."""
from __future__ import annotations

import statistics
import time

import httpx
from fastapi import APIRouter, Depends

from ..config import LLM_BASE_URL, LLM_MODEL, LLM_PROVIDER, LLM_TIMEOUT_SECONDS
from ..deps import require_role
from ..db import list_security_logs

router = APIRouter(prefix="/v1/admin", tags=["admin"])


@router.get("/security-logs")
def security_logs(limit: int = 100, user: dict = Depends(require_role("admin", "doctor"))):
    return list_security_logs(limit)


@router.get("/telemetry")
def telemetry(user: dict = Depends(require_role("admin", "doctor"))):
    """Ringkasan SOC: distribusi keputusan, skor risiko, latensi guardrail."""
    logs = list_security_logs(limit=1000)
    decisions = {"ALLOW": 0, "WATCH": 0, "PROBE": 0, "BLOCK": 0}
    latencies: list[float] = []
    scores: list[float] = []
    for log in logs:
        decisions[log.get("decision", "ALLOW")] = decisions.get(log.get("decision", "ALLOW"), 0) + 1
        if isinstance(log.get("latencyMs"), (int, float)):
            latencies.append(log["latencyMs"])
        if isinstance(log.get("riskScore"), (int, float)):
            scores.append(log["riskScore"])
    return {
        "totalInspected": len(logs),
        "decisions": decisions,
        "blockRate": round(decisions.get("BLOCK", 0) / len(logs), 4) if logs else 0.0,
        "riskScore": {
            "avg": round(statistics.fmean(scores), 4) if scores else 0.0,
            "max": round(max(scores), 4) if scores else 0.0,
        },
        "guardrailLatencyMs": {
            "p50": round(statistics.median(latencies), 2) if latencies else None,
            "p95": round(sorted(latencies)[int(len(latencies) * 0.95) - 1], 2)
                   if len(latencies) >= 20 else (round(max(latencies), 2) if latencies else None),
        },
        "recentLogs": logs[:20],
    }


@router.get("/llm-status")
async def llm_status(user: dict = Depends(require_role("admin", "doctor"))):
    """Local AI Status: ketersediaan server LLM + latensi koneksi."""
    base = LLM_BASE_URL.rstrip("/")
    url = f"{base}/api/tags" if LLM_PROVIDER.lower() == "ollama" else (
        f"{base}/models" if base.endswith("/v1") else f"{base}/v1/models")
    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(min(LLM_TIMEOUT_SECONDS, 10), connect=3.0)) as cx:
            resp = await cx.get(url, headers={"Authorization": "Bearer x"} if LLM_PROVIDER != "ollama" else {})
            ms = round((time.perf_counter() - t0) * 1000, 2)
            return {"online": resp.status_code == 200, "provider": LLM_PROVIDER,
                    "baseUrl": LLM_BASE_URL, "model": LLM_MODEL, "latencyMs": ms}
    except Exception as exc:
        return {"online": False, "provider": LLM_PROVIDER, "baseUrl": LLM_BASE_URL,
                "model": LLM_MODEL, "latencyMs": None, "error": str(exc)[:200]}
