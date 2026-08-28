"""L3/CIM - Conversational Intent Momentum (inti klaim kebaruan, Bab 3 §4).

Formula akumulasi (PRD §5.1.A / Bab 4 §2 Langkah 1-5):

    r_N      = proyeksi posisi risiko turn N (0..1)                    [L1]
    delta_N  = r_N - r_(N-1)
    arah_N   = konsistensi tanda delta pada jendela geser K
    anchor_N = cos(v(U_N), v(Sistem_N-1)) * I(delta_N > 0)   (terkoreksi)
    gamma_N  = exp(-lambda * SemanticDistance(v_N, v_harm_cluster))
    M_N      = clamp(gamma_N * M_(N-1)
                     + w1 * delta_N * arah_N
                     + w2 * anchor_N * arah_N
                     + w3 * r_N, 0, 1)

Delta dan jangkar DIKALIKAN arah (Bab 4 Langkah 5): tanpa arah konsisten,
keduanya tidak berkontribusi - inilah alasan obrolan normal yang melompat
tidak menumpuk kecurigaan.
"""
from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field


@dataclass
class CIMStep:
    risk_r: float
    delta: float
    direction: float
    anchor: float          # jangkar efektif (terkoreksi baseline)
    decay: float           # gamma_N
    momentum: float        # M_N


@dataclass
class CIMState:
    """State sesi minimal yang dimuat dari session store (bukan teks)."""
    momentum_prev: float = 0.0
    risk_history: list[float] = field(default_factory=list)
    delta_history: list[float] = field(default_factory=list)
    anchor_baseline: float = 0.0


class CIMAccumulator:
    def __init__(
        self,
        w1: float,
        w2: float,
        w3: float,
        lam: float,
        window_k: int,
    ) -> None:
        self.w1, self.w2, self.w3, self.lam, self.k = w1, w2, w3, lam, window_k

    def direction(self, delta_history: list[float]) -> float:
        """Arah_N = proporsi delta positif pada jendela K terakhir (Bab 4
        Langkah 2, formula PRD §5.1.A: dibagi K penuh, bukan jumlah delta).
        Tanpa riwayat delta -> 0.0 (netral, tak menambah)."""
        recent = [d for d in delta_history if abs(d) > 0.0]
        if not recent:
            return 0.0
        positives = sum(1 for d in recent if d > 0)
        return positives / self.k

    def decay_factor(self, harm_similarity: float) -> float:
        """gamma_N = exp(-lambda * SemanticDistance) - peluruhan adaptif
        (Bab 4 Langkah 4): topik bergeser jauh dari klaster bahaya ->
        momentum diluruhkan."""
        semantic_distance = 1.0 - harm_similarity
        return math.exp(-self.lam * semantic_distance)

    def effective_anchor(self, anchor_raw: float, delta: float, baseline: float) -> float:
        """Jangkar terkoreksi (Bab 4 Langkah 3): percakapan normal juga
        merujuk balasan sebelumnya, jadi kurangi baseline sesi; hanya
        berkontribusi saat delta > 0 (I(delta_N > 0) pada formula PRD)."""
        if delta <= 0:
            return 0.0
        return max(0.0, min(1.0, anchor_raw - baseline))

    def step(
        self,
        state: CIMState,
        risk_r: float,
        anchor_raw: float,
        harm_similarity: float,
        gamma_floor: float = 0.0,
    ) -> CIMStep:
        delta = risk_r - state.risk_history[-1] if state.risk_history else 0.0
        # Formula PRD §5.1.A: Arah_N = (1/K) * Σ_{i=0..K-1} I(Δ_{N-i} > 0)
        # - jendela mencakup Δ_N saat ini (i=0) plus K-1 delta sebelumnya.
        window = ([delta] + state.delta_history[-(self.k - 1):])[-self.k:]
        direction = self.direction(window)
        anchor_eff = self.effective_anchor(anchor_raw, delta, state.anchor_baseline)
        gamma = max(self.decay_factor(harm_similarity), gamma_floor)
        momentum = (
            gamma * state.momentum_prev
            + self.w1 * delta * direction
            + self.w2 * anchor_eff * direction
            + self.w3 * risk_r
        )
        return CIMStep(
            risk_r=risk_r,
            delta=delta,
            direction=direction,
            anchor=anchor_eff,
            decay=gamma,
            momentum=max(0.0, min(1.0, momentum)),
        )

    @staticmethod
    def advance_state(state: CIMState, step: CIMStep, anchor_raw: float) -> None:
        """Mutasi state untuk turn berikutnya (dipanggil engine setelah
        menulis ke store). Baseline jangkar hanya di-update saat turn TIDAK
        mengeskalasi (delta <= 0.05) - jadi jangkar penyerang yang selalu
        naik tidak menaikkan baseline-nya sendiri."""
        state.risk_history.append(step.risk_r)
        state.delta_history.append(step.delta)
        state.momentum_prev = step.momentum
        if step.delta <= 0.05:
            state.anchor_baseline = 0.7 * state.anchor_baseline + 0.3 * anchor_raw
