"""L3/CIM - Session Store DuckDB (PRD §8.1: No Raw Text Policy).

Yang BOLEH disimpan: session_id, turn_index, vector_embedding (float32),
skor/fitur per turn, token_hash (SHA-256), keputusan, TTL.
Yang DILARANG disimpan: teks mentah pengguna. Teks dibuang dari RAM setelah
inferensi turn selesai (Bab 4 Alur 1: "TEKS MENTAH TIDAK DISIMPAN").
"""
from __future__ import annotations

import hashlib
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import duckdb
import numpy as np

from ...config import SESSION_TTL_HOURS


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def token_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass
class SessionState:
    session_id: str
    momentum_prev: float
    risk_history: list[float]
    delta_history: list[float]
    anchor_baseline: float
    baseline_max: float
    probe_count: int
    blocked: bool
    blocked_at_turn: int | None
    ttd_turn: int | None
    turns_count: int
    momentum_override: float | None


@dataclass
class TurnRecord:
    turn_index: int
    risk_r: float
    delta: float
    intent: float
    provenance: float
    l2: float
    momentum: float
    direction: float
    anchor: float
    baseline_single: float
    decision: str


class SessionStore:
    """DuckDB embedded, satu koneksi + lock (uvicorn single worker)."""

    def __init__(self, db_path: Path | str, ttl_hours: int = SESSION_TTL_HOURS) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.ttl = timedelta(hours=ttl_hours)
        self._lock = threading.RLock()
        self._con = duckdb.connect(str(self.db_path))
        self._migrate()

    def _migrate(self) -> None:
        with self._lock:
            self._con.execute("""
                CREATE TABLE IF NOT EXISTS sessions(
                    session_id VARCHAR PRIMARY KEY,
                    created_ts TIMESTAMP, updated_ts TIMESTAMP, expires_ts TIMESTAMP,
                    blocked BOOLEAN DEFAULT FALSE, blocked_at_turn INTEGER,
                    probe_count INTEGER DEFAULT 0, anchor_baseline DOUBLE DEFAULT 0.0,
                    baseline_max DOUBLE DEFAULT 0.0, turns_count INTEGER DEFAULT 0,
                    ttd_turn INTEGER, momentum_override DOUBLE
                );
                CREATE TABLE IF NOT EXISTS turn_features(
                    session_id VARCHAR, turn_index INTEGER, created_ts TIMESTAMP,
                    embedding BLOB, risk_r DOUBLE, delta DOUBLE, intent DOUBLE,
                    provenance DOUBLE, l2 DOUBLE, momentum DOUBLE, direction DOUBLE,
                    anchor DOUBLE, baseline_single DOUBLE, decision VARCHAR,
                    token_hash VARCHAR,
                    PRIMARY KEY (session_id, turn_index)
                );
                CREATE TABLE IF NOT EXISTS probes(
                    session_id VARCHAR, level INTEGER, probe_type VARCHAR,
                    canary_token VARCHAR, issued_ts TIMESTAMP,
                    resolved_ts TIMESTAMP, outcome VARCHAR
                );
                CREATE TABLE IF NOT EXISTS probe_meta(
                    session_id VARCHAR, channel_owned BOOLEAN, channel VARCHAR,
                    PRIMARY KEY (session_id)
                );
            """)

    # ── TTL (PRD: otomatis dibersihkan 24 jam) ──────────────────────────────
    def cleanup_expired(self) -> int:
        with self._lock:
            now = utcnow()
            expired = self._con.execute(
                "SELECT session_id FROM sessions WHERE expires_ts < ?", [now]
            ).fetchall()
            if not expired:
                return 0
            ids = [r[0] for r in expired]
            placeholders = ",".join("?" for _ in ids)
            for table in ("turn_features", "probes", "probe_meta"):
                self._con.execute(f"DELETE FROM {table} WHERE session_id IN ({placeholders})", ids)
            self._con.execute(f"DELETE FROM sessions WHERE session_id IN ({placeholders})", ids)
            return len(ids)

    # ── Sesi ────────────────────────────────────────────────────────────────
    def get_session(self, session_id: str) -> SessionState | None:
        with self._lock:
            row = self._con.execute(
                """SELECT session_id, anchor_baseline, baseline_max, probe_count,
                          blocked, blocked_at_turn, ttd_turn, turns_count, momentum_override
                   FROM sessions WHERE session_id = ?""",
                [session_id],
            ).fetchone()
        if row is None:
            return None
        (sid, anchor_base, base_max, probes, blocked, blocked_turn, ttd, count, override) = row
        turns = self._con.execute(
            """SELECT risk_r, delta FROM turn_features
               WHERE session_id = ? ORDER BY turn_index""",
            [session_id],
        ).fetchall()
        momentum = self._con.execute(
            """SELECT momentum FROM turn_features WHERE session_id = ?
               ORDER BY turn_index DESC LIMIT 1""",
            [session_id],
        ).fetchone()
        return SessionState(
            session_id=sid,
            momentum_prev=float(momentum[0]) if momentum else (override or 0.0),
            risk_history=[float(r[0]) for r in turns],
            delta_history=[float(r[1]) for r in turns],
            anchor_baseline=float(anchor_base or 0.0),
            baseline_max=float(base_max or 0.0),
            probe_count=int(probes or 0),
            blocked=bool(blocked),
            blocked_at_turn=blocked_turn,
            ttd_turn=ttd,
            turns_count=int(count or 0),
            momentum_override=float(override) if override is not None else None,
        )

    def ensure_session(self, session_id: str, channel_owned: bool, channel: str) -> None:
        with self._lock:
            now = utcnow()
            exists = self._con.execute(
                "SELECT 1 FROM sessions WHERE session_id = ?", [session_id]
            ).fetchone()
            if exists:
                self._con.execute(
                    "UPDATE sessions SET updated_ts = ?, expires_ts = ? WHERE session_id = ?",
                    [now, now + self.ttl, session_id],
                )
            else:
                self._con.execute(
                    """INSERT INTO sessions(session_id, created_ts, updated_ts, expires_ts)
                       VALUES (?, ?, ?, ?)""",
                    [session_id, now, now, now + self.ttl],
                )
            self._con.execute(
                """INSERT INTO probe_meta(session_id, channel_owned, channel)
                   VALUES (?, ?, ?) ON CONFLICT DO NOTHING""",
                [session_id, channel_owned, channel],
            )

    def record_turn(self, session_id: str, rec: TurnRecord, embedding: np.ndarray,
                    text_hash: str, anchor_baseline: float,
                    baseline_max: float) -> None:
        with self._lock:
            now = utcnow()
            self._con.execute(
                """INSERT INTO turn_features(session_id, turn_index, created_ts, embedding,
                       risk_r, delta, intent, provenance, l2, momentum, direction,
                       anchor, baseline_single, decision, token_hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    session_id, rec.turn_index, now,
                    embedding.astype(np.float32).tobytes(),
                    rec.risk_r, rec.delta, rec.intent, rec.provenance, rec.l2,
                    rec.momentum, rec.direction, rec.anchor, rec.baseline_single,
                    rec.decision, text_hash,
                ],
            )
            self._con.execute(
                """UPDATE sessions SET updated_ts = ?, expires_ts = ?, anchor_baseline = ?,
                       baseline_max = ?, turns_count = turns_count + 1
                   WHERE session_id = ?""",
                [now, now + self.ttl, anchor_baseline, baseline_max, session_id],
            )

    def record_turn_anchor_baseline(self, session_id: str, anchor_baseline: float) -> None:
        """Simpan baseline jangkar sesi (dipakai koreksi turn berikutnya)."""
        with self._lock:
            self._con.execute(
                "UPDATE sessions SET anchor_baseline = ? WHERE session_id = ?",
                [anchor_baseline, session_id],
            )

    def mark_decision(self, session_id: str, decision: str, turn: int,
                      momentum_override: float | None = None) -> None:
        with self._lock:
            if decision == "block":
                self._con.execute(
                    """UPDATE sessions SET blocked = TRUE, blocked_at_turn = ?,
                           ttd_turn = COALESCE(ttd_turn, ?) WHERE session_id = ?""",
                    [turn, turn, session_id],
                )
            elif decision == "probe":
                # TTD dihitung saat probe/blok pertama (Bab 5: "DIBLOKIR pada
                # T5 - TTD: 4 putaran" = deteksi di T4), bukan saat WATCH.
                self._con.execute(
                    "UPDATE sessions SET ttd_turn = COALESCE(ttd_turn, ?) WHERE session_id = ?",
                    [turn, session_id],
                )
            if momentum_override is not None:
                self._con.execute(
                    "UPDATE sessions SET momentum_override = ? WHERE session_id = ?",
                    [momentum_override, session_id],
                )

    def freeze_session(self, session_id: str, turn: int) -> None:
        """Blokir permanen hasil konfirmasi probe (skor 1.00, Bab 3 §4)."""
        with self._lock:
            self._con.execute(
                """UPDATE sessions SET blocked = TRUE, blocked_at_turn = ?,
                       ttd_turn = COALESCE(ttd_turn, ?), momentum_override = 1.0
                   WHERE session_id = ?""",
                [turn, turn, session_id],
            )

    # ── Probe ───────────────────────────────────────────────────────────────
    def issue_probe(self, session_id: str, level: int, probe_type: str,
                    canary_token: str) -> None:
        with self._lock:
            self._con.execute(
                """INSERT INTO probes(session_id, level, probe_type, canary_token,
                       issued_ts, resolved_ts, outcome)
                   VALUES (?, ?, ?, ?, ?, NULL, 'pending')""",
                [session_id, level, probe_type, canary_token, utcnow()],
            )
            self._con.execute(
                "UPDATE sessions SET probe_count = probe_count + 1 WHERE session_id = ?",
                [session_id],
            )

    def pending_probe(self, session_id: str) -> tuple[int, str, str] | None:
        with self._lock:
            row = self._con.execute(
                """SELECT level, probe_type, canary_token FROM probes
                   WHERE session_id = ? AND outcome = 'pending'
                   ORDER BY issued_ts DESC LIMIT 1""",
                [session_id],
            ).fetchone()
        return (int(row[0]), row[1], row[2]) if row else None

    def resolve_probe(self, session_id: str, outcome: str) -> None:
        with self._lock:
            self._con.execute(
                """UPDATE probes SET outcome = ?, resolved_ts = ?
                   WHERE session_id = ? AND outcome = 'pending'""",
                [outcome, utcnow(), session_id],
            )

    def channel_owned(self, session_id: str) -> bool:
        with self._lock:
            row = self._con.execute(
                "SELECT channel_owned FROM probe_meta WHERE session_id = ?", [session_id]
            ).fetchone()
        return bool(row[0]) if row else False

    def turns_last_minute(self, session_id: str) -> int:
        with self._lock:
            row = self._con.execute(
                """SELECT COUNT(*) FROM turn_features
                   WHERE session_id = ? AND created_ts > ?""",
                [session_id, utcnow() - timedelta(seconds=60)],
            ).fetchone()
        return int(row[0]) if row else 0

    def clear_momentum_override(self, session_id: str) -> None:
        with self._lock:
            self._con.execute(
                "UPDATE sessions SET momentum_override = NULL WHERE session_id = ?",
                [session_id],
            )

    def load_embeddings(self, session_id: str) -> list[tuple[int, np.ndarray, float, float]]:
        """(turn, embedding, risk_r, momentum) untuk membangun ulang graf."""
        with self._lock:
            rows = self._con.execute(
                """SELECT turn_index, embedding, risk_r, momentum FROM turn_features
                   WHERE session_id = ? ORDER BY turn_index""",
                [session_id],
            ).fetchall()
        return [
            (int(r[0]), np.frombuffer(r[1], dtype=np.float32), float(r[2]), float(r[3]))
            for r in rows
        ]

    # ── Telemetri dasbor (GET /v1/session/{id}/metrics) ─────────────────────
    def session_metrics(self, session_id: str) -> dict | None:
        with self._lock:
            sess = self._con.execute(
                """SELECT session_id, blocked, blocked_at_turn, probe_count,
                          baseline_max, ttd_turn, turns_count, created_ts, expires_ts
                   FROM sessions WHERE session_id = ?""",
                [session_id],
            ).fetchone()
            if sess is None:
                return None
            turns = self._con.execute(
                """SELECT turn_index, momentum, direction, anchor, intent,
                          provenance, l2, baseline_single, decision
                   FROM turn_features WHERE session_id = ? ORDER BY turn_index""",
                [session_id],
            ).fetchall()
            probe_rows = self._con.execute(
                """SELECT level, probe_type, outcome, issued_ts FROM probes
                   WHERE session_id = ? ORDER BY issued_ts""",
                [session_id],
            ).fetchall()
        (sid, blocked, blocked_turn, probes, base_max, ttd, count, created, expires) = sess
        return {
            "session_id": sid,
            "blocked": bool(blocked),
            "blocked_at_turn": blocked_turn,
            "probe_count": int(probes or 0),
            "baseline_per_message_max": float(base_max or 0.0),
            "turns_to_detection": ttd,
            "turns_count": int(count or 0),
            "expires_at": expires.isoformat() if expires else None,
            "turns": [
                {
                    "turn": t[0], "momentum": t[1], "direction": t[2],
                    "anchor": t[3], "intent": t[4], "provenance": t[5],
                    "l2_context": t[6], "baseline_single": t[7],
                    "decision": t[8],
                }
                for t in turns
            ],
            "probes": [
                {"level": p[0], "probe_type": p[1], "outcome": p[2]}
                for p in probe_rows
            ],
        }

    def close(self) -> None:
        with self._lock:
            self._con.close()
