"""Fusi sinyal + kalibrasi + kebijakan keputusan (Bab 3 §3.2, Bab 4 §1).

Dipisahkan dari engine.py agar tanggung jawab jelas:
  * engine.py  = orchestrator (alur kerja, I/O store, pengukuran latensi)
  * fusion.py  = matematika & aturan keputusan MURNI (tanpa I/O, mudah diuji)

  skor    = 0.80·momentum + 0.15·intent + 0.05·l2           (fusi PRD §5)
  keputusan = BLOCK >= 0.80 · PROBE 0.60-0.79 · WATCH (arah naik) · ALLOW
"""
from __future__ import annotations

from ..config import (
    DIRECTION_WINDOW_K,
    THRESHOLD_BLOCK,
    THRESHOLD_PROBE,
    WATCH_DIRECTION,
    WATCH_SCORE_MIN,
)
from ..schemas import ExplanationItem
from .l1_onnx_engine import L1Signal
from .l3_cim.momentum import CIMStep
from .l3_cim.trajectory import RESURGENCE_MIN_RISK, Resurgence

W_MOMENTUM = 0.80   # bobot fusi PRD §5: momentum inti
W_INTENT = 0.15     # bobot fusi: intent koersif L1
W_L2 = 0.05         # bobot fusi: konteks L2
ANCHOR_BASELINE_ALPHA = 0.7   # EMA baseline jangkar pada turn non-eskalasi
ANCHOR_BASELINE_BETA = 0.3
ESCALATION_DELTA_MAX = 0.05   # delta <= ini dianggap turn non-eskalasi


def fuse(momentum: float, intent: float, l2_risk: float) -> float:
    """Fusi linier ternormalisasi 0..1 (PRD §5 / Bab 3 §3.2)."""
    return max(0.0, min(1.0, W_MOMENTUM * momentum + W_INTENT * intent + W_L2 * l2_risk))


def stateless_decision(score: float) -> str:
    """Keputusan filter stateless (baseline pembanding, Bab 5 §2 desain #2)."""
    if score >= THRESHOLD_BLOCK:
        return "block"
    if score >= THRESHOLD_PROBE:
        return "probe"
    return "allow"


def decide(score: float, direction: float, delta: float) -> str:
    """Keputusan stateful (Bab 3 §3.2): di bawah ambang probe tetap WATCH
    bila arah sudah konsisten naik - "aman" dilarang untuk lintasan menaik."""
    if score >= THRESHOLD_BLOCK:
        return "block"
    if score >= THRESHOLD_PROBE:
        return "probe"
    if score >= WATCH_SCORE_MIN and direction >= WATCH_DIRECTION and delta > 0:
        return "watch"
    return "allow"


def uncertainty(score: float, intent: float, momentum: float) -> float:
    """Ketidakpastian dilaporkan, bukan disembunyikan (Bab 4 §1): puncak
    dekat ambang + hukuman bila sinyal saling bertentangan."""
    d_probe = abs(score - THRESHOLD_PROBE)
    d_block = abs(score - THRESHOLD_BLOCK)
    margin = min(d_probe, d_block) / 0.20
    conflict = abs(intent - momentum) > 0.35
    unc = (1.0 - margin) * 0.8 + (0.2 if conflict else 0.0)
    return max(0.0, min(1.0, unc))


def advance_anchor_baseline(anchor_baseline: float, anchor_raw: float, delta: float) -> float:
    """Baseline jangkar hanya berubah pada turn NON-eskalasi (delta kecil) -
    jangkar penyerang yang selalu naik tidak menaikkan baseline-nya sendiri."""
    if delta <= ESCALATION_DELTA_MAX:
        return ANCHOR_BASELINE_ALPHA * anchor_baseline + ANCHOR_BASELINE_BETA * anchor_raw
    return anchor_baseline


def explain(
    turn: int,
    step: CIMStep,
    sig: L1Signal,
    l0_anomalies: list[str],
    l2_notes: list[str],
    resurgence: Resurgence | None,
    score: float,
    decision: str,
) -> list[ExplanationItem]:
    """Penjelasan per-turn yang dapat diaudit (Bab 4 §1: setiap keputusan
    harus bisa dijelaskan)."""
    out: list[ExplanationItem] = []
    if step.delta > 0 and step.direction >= 0.5:
        out.append(ExplanationItem(turn=turn,
                                   reason=f"arah konsisten naik ({step.direction:.2f}, "
                                          f"jendela {DIRECTION_WINDOW_K} putaran)"))
    if step.anchor > 0.05:
        out.append(ExplanationItem(turn=turn,
                                   reason=f"jangkar referensial {step.anchor:.2f} "
                                          "ke output sistem (sidik jari crescendo)"))
    if sig.intent >= 0.5:
        out.append(ExplanationItem(turn=turn,
                                   reason=f"intent koersif {sig.intent:.2f}"))
    for a in l0_anomalies:
        out.append(ExplanationItem(turn=turn, reason=f"L0 anomali: {a}"))
    for n in l2_notes:
        out.append(ExplanationItem(turn=turn, reason=f"L2 konteks: {n}"))
    if resurgence is not None and resurgence.linked_risk >= RESURGENCE_MIN_RISK:
        out.append(ExplanationItem(
            turn=turn,
            reason=f"kembali ke wilayah semantik risiko turn {resurgence.linked_turn} "
                   f"(cos {resurgence.similarity:.2f}) - graf menolak reset memori",
        ))
    if decision == "block":
        out.append(ExplanationItem(
            turn=turn,
            reason=f"skor {score:.2f} >= ambang blokir 0.80 - eskalasi lintasan "
                   "menuju data terproteksi (pola Vastaamo extortion)",
        ))
    return out or [ExplanationItem(turn=turn, reason="sinyal di bawah ambang; ALLOW")]
