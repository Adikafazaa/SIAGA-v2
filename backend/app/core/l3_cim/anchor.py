"""L3/CIM - Detektor Jangkar Referensial (sidik jari Crescendo, Bab 3 §4).

Crescendo bekerja dengan MERUJUK balasan model sendiri untuk melangkah maju.
Jangkar = cosine(embed(user_N), embed(sistem_(N-1))). Koreksi baseline
dilakukan CIMAccumulator (percakapan normal juga merujuk balasan).
"""
from __future__ import annotations

import numpy as np


def anchor_similarity(vec_user: np.ndarray, vec_prev_system: np.ndarray | None) -> float:
    """Jangkar mentah 0..1. Tanpa output sistem sebelumnya -> 0.0."""
    if vec_prev_system is None:
        return 0.0
    cos = float(np.dot(vec_user, vec_prev_system))
    return max(0.0, min(1.0, cos))
