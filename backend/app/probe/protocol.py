"""Protokol Reverse Turing Probe - gerbang etis & tangga eskalasi (Bab 4 §3).

Empat aturan pembatas yang semua disengaja:
  1. Maksimal 2 probe per sesi.
  2. Berhenti pada tingkat pertama yang memberi jawaban jelas.
  3. Ambigu -> kembali ke WATCH, bukan BLOCK (ketidakpastian bukan bukti).
  4. Prasyarat etis diperiksa SEBELUM tingkat 1:
     saluran kami sendiri (channel_owned) + skor di zona abu-abu.
"""
from __future__ import annotations

from ..config import PROBE_MAX_PER_SESSION, THRESHOLD_BLOCK, THRESHOLD_PROBE


def escalation_level(score: float) -> int:
    """Peta skor zona abu-abu ke tingkat tangga (PRD §5.4)."""
    if score < 0.68:
        return 1
    if score < 0.75:
        return 2
    return 3


def should_probe(
    score: float,
    channel_owned: bool,
    probe_count: int,
) -> tuple[bool, str]:
    """Prasyarat etis (Bab 4 §3: diperiksa lebih dulu, sebelum tingkat 1)."""
    if not (THRESHOLD_PROBE <= score < THRESHOLD_BLOCK):
        return False, f"skor {score:.2f} di luar zona abu-abu"
    if not channel_owned:
        return False, "prasyarat etis: probe hanya pada kanal yang kami kendalikan (channel_owned=false)"
    if probe_count >= PROBE_MAX_PER_SESSION:
        return False, f"batas {PROBE_MAX_PER_SESSION} probe per sesi tercapai"
    return True, "prasyarat etis terpenuhi"
