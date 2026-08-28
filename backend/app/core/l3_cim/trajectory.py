"""L3/CIM - Graf Lintasan Semantik (DAG, PRD §5.1.B).

Percakapan disimpan sebagai graf, bukan daftar (Bab 4 §2 Langkah 6):
setiap turn menjadi simpul; simpul baru terhubung langsung ke simpul
historis dengan kesamaan semantik > 0.80. Penyerang yang berpura-pura
ganti topik lalu kembali ke niat jahat tetap terhubung ke simpul risiko
yang sama -> graf MENOLAK reset memori / menggagalkan manipulasi peluruhan
(momentum simpul lama direinstasi). Kasus uji wajib Bab 4: "naik 4 putaran,
ganti topik total 3 putaran, kembali -> BLOCK".

Implementasi v0 in-memory per sesi (ringan: <100 simpul/sesi), dibangun
ulang dari embedding yang dipersistenkan DuckDB saat sesi dimuat ulang.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from ...config import SIM_THRESHOLD_TRAJECTORY

# Simpul lama hanya dianggap "titik risiko" bila cukup berbahaya - obrolan
# jinak yang melompat-lompat topik TIDAK boleh memicu reinstasi momentum.
RESURGENCE_MIN_RISK = 0.50
RESURGENCE_MIN_MOMENTUM = 0.40


@dataclass
class TrajNode:
    turn: int
    vec: np.ndarray
    risk: float
    momentum: float


@dataclass
class Resurgence:
    linked_turn: int
    similarity: float
    linked_risk: float
    linked_momentum: float


@dataclass
class TrajectoryGraph:
    nodes: list[TrajNode] = field(default_factory=list)

    def add(self, turn: int, vec: np.ndarray, risk: float, momentum: float) -> Resurgence | None:
        """Tambah simpul + tautkan ke seluruh simpul historis mirip
        (cos > ambang). Kembalikan Resurgence bila simpul baru kembali ke
        wilayah semantik risiko lama (di luar dua turn terakhir)."""
        node = TrajNode(turn=turn, vec=vec, risk=risk, momentum=momentum)
        self.nodes.append(node)
        if len(self.nodes) < 4:
            return None  # graf terlalu muda untuk mendeteksi pola kembali

        recent = {n.turn for n in self.nodes[-3:-1]}
        best: Resurgence | None = None
        for other in self.nodes[:-1]:
            if other.turn in recent:
                continue  # tetangga sekuensial - bukan pola "kembali"
            sim = float(np.dot(vec, other.vec))
            if sim > SIM_THRESHOLD_TRAJECTORY:
                candidate = Resurgence(other.turn, sim, other.risk, other.momentum)
                if other.risk >= RESURGENCE_MIN_RISK and other.momentum >= RESURGENCE_MIN_MOMENTUM:
                    if best is None or candidate.linked_momentum > best.linked_momentum:
                        best = candidate
        return best
