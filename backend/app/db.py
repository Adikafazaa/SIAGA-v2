"""Repository data aplikasi: Firestore (produksi) atau SQLite lokal (fallback).

Jika firebase-admin terpasang DAN kredensial diset (FIREBASE_CREDENTIALS_PATH /
GOOGLE_APPLICATION_CREDENTIALS), semua operasi ke Cloud Firestore sesuai
Modules/database.md. Tanpa itu, fallback SQLite lokal agar prototipe tetap
jalan 1-perintah tanpa akun GCP.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .config import FIREBASE_CREDENTIALS_PATH, LOCAL_DB_PATH

_firestore = None


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _try_init_firestore():
    global _firestore
    if _firestore is not None:
        return _firestore
    import os

    cred_path = FIREBASE_CREDENTIALS_PATH or os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    if not cred_path or not Path(cred_path).is_file():
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _firestore = firestore.client()
        return _firestore
    except Exception:
        return None


# ── SQLite fallback ─────────────────────────────────────────────────────────
_sql_lock = threading.Lock()
_sql: sqlite3.Connection | None = None

# (dokumen, penyimpanan dokumen Firestore; pembungkus data JSON)
_DOCS = (
    "users", "chatSessions", "messages", "clinicalAssessments",
    "medicalRecords", "securityLogs",
)


def _sql_conn() -> sqlite3.Connection:
    global _sql
    with _sql_lock:
        if _sql is None:
            LOCAL_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            _sql = sqlite3.connect(str(LOCAL_DB_PATH), check_same_thread=False)
            _sql.row_factory = sqlite3.Row
            for col in _DOCS:
                _sql.execute(
                    f"CREATE TABLE IF NOT EXISTS {col}("
                    "doc_id TEXT PRIMARY KEY, data TEXT NOT NULL)"
                )
            _sql.commit()
        return _sql


def _sql_get(col: str, doc_id: str) -> dict | None:
    row = _sql_conn().execute(
        f"SELECT data FROM {col} WHERE doc_id = ?", (doc_id,)
    ).fetchone()
    return json.loads(row[0]) if row else None


def _sql_set(col: str, doc_id: str, data: dict) -> None:
    _sql_conn().execute(
        f"INSERT INTO {col}(doc_id, data) VALUES(?, ?) "
        "ON CONFLICT(doc_id) DO UPDATE SET data = excluded.data",
        (doc_id, json.dumps(data, ensure_ascii=False)),
    )
    _sql_conn().commit()


def _sql_all(col: str) -> list[dict]:
    rows = _sql_conn().execute(f"SELECT data FROM {col}").fetchall()
    return [json.loads(r[0]) for r in rows]


# ── Operasi generik ─────────────────────────────────────────────────────────
def _put(col: str, doc_id: str, data: dict) -> None:
    fs = _try_init_firestore()
    if fs is not None:
        fs.collection(col).document(doc_id).set(data, merge=True)
    else:
        _sql_set(col, doc_id, data)


def _get(col: str, doc_id: str) -> dict | None:
    fs = _try_init_firestore()
    if fs is not None:
        snap = fs.collection(col).document(doc_id).get()
        return snap.to_dict() if snap.exists else None
    return _sql_get(col, doc_id)


def _all(col: str) -> list[dict]:
    fs = _try_init_firestore()
    if fs is not None:
        return [d.to_dict() | {"docId": d.id} for d in fs.collection(col).stream()]
    return _sql_all(col)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ── Users ───────────────────────────────────────────────────────────────────
def get_user(uid: str) -> dict | None:
    return _get("users", uid)


def upsert_user(uid: str, data: dict) -> dict:
    existing = get_user(uid) or {}
    merged = {
        "uid": uid,
        "displayName": "",
        "email": "",
        "photoURL": "",
        "provider": "password",
        "role": "patient",
        "doctorLicenseId": None,
        "licenseVerified": False,
        "onboardingCompleted": False,
        "preferences": {},
        "createdAt": _utcnow_iso(),
    } | existing | data | {"uid": uid, "updatedAt": _utcnow_iso()}
    _put("users", uid, merged)
    return merged


def list_users_by_role(role: str) -> list[dict]:
    return [u for u in _all("users") if u.get("role") == role]


# ── Chat sessions & messages ────────────────────────────────────────────────
def create_chat_session(patient_uid: str, title: str) -> dict:
    doc = {
        "sessionId": "",
        "patientUid": patient_uid,
        "title": title[:80] or "Sesi Konseling",
        "status": "active",
        "createdAt": _utcnow_iso(),
        "lastActivityAt": _utcnow_iso(),
    }
    sid = new_id("sess")
    doc["sessionId"] = sid
    _put("chatSessions", sid, doc)
    return doc


def get_chat_session(session_id: str) -> dict | None:
    return _get("chatSessions", session_id)


def update_chat_session(session_id: str, data: dict) -> None:
    existing = get_chat_session(session_id) or {}
    _put("chatSessions", session_id, existing | data | {"lastActivityAt": _utcnow_iso()})


def list_chat_sessions(patient_uid: str) -> list[dict]:
    return sorted(
        [s for s in _all("chatSessions") if s.get("patientUid") == patient_uid],
        key=lambda s: s.get("lastActivityAt", ""), reverse=True,
    )


def add_message(session_id: str, role: str, content: str,
                risk_score: float | None = None, decision: str | None = None) -> dict:
    mid = new_id("msg")
    doc = {
        "messageId": mid,
        "sessionId": session_id,
        "role": role,
        "content": content,
        "riskScore": risk_score,
        "decision": decision,
        "createdAt": _utcnow_iso(),
    }
    _put("messages", mid, doc)
    return doc


def list_messages(session_id: str) -> list[dict]:
    return sorted(
        [m for m in _all("messages") if m.get("sessionId") == session_id],
        key=lambda m: m.get("createdAt", ""),
    )


# ── Assessments ─────────────────────────────────────────────────────────────
def save_assessment(patient_uid: str, data: dict) -> dict:
    aid = new_id("asm")
    doc = {"assessmentId": aid, "patientUid": patient_uid,
           "completedAt": _utcnow_iso()} | data
    _put("clinicalAssessments", aid, doc)
    return doc


def list_assessments(patient_uid: str) -> list[dict]:
    return sorted(
        [a for a in _all("clinicalAssessments") if a.get("patientUid") == patient_uid],
        key=lambda a: a.get("completedAt", ""), reverse=True,
    )


# ── Medical records ─────────────────────────────────────────────────────────
def save_medical_record(doctor_uid: str, patient_uid: str, notes: str) -> dict:
    rid = new_id("rec")
    doc = {
        "recordId": rid,
        "patientUid": patient_uid,
        "assignedDoctorUid": doctor_uid,
        "notes": notes,  # ponytail: plaintext; enkripsi at-rest saat integrasi KMS
        "updatedAt": _utcnow_iso(),
    }
    _put("medicalRecords", rid, doc)
    return doc


def list_medical_records(patient_uid: str) -> list[dict]:
    return sorted(
        [r for r in _all("medicalRecords") if r.get("patientUid") == patient_uid],
        key=lambda r: r.get("updatedAt", ""), reverse=True,
    )


# ── Security logs ───────────────────────────────────────────────────────────
def add_security_log(session_id: str, patient_uid: str, risk_score: float,
                     decision: str, explanation: str, latency_ms: float | None = None) -> dict:
    lid = new_id("log")
    doc = {
        "logId": lid,
        "sessionId": session_id,
        "patientUid": patient_uid,
        "riskScore": risk_score,
        "decision": decision,
        "explanation": explanation,
        "latencyMs": latency_ms,
        "timestamp": _utcnow_iso(),
    }
    _put("securityLogs", lid, doc)
    return doc


def list_security_logs(limit: int = 100) -> list[dict]:
    logs = sorted(_all("securityLogs"), key=lambda l: l.get("timestamp", ""), reverse=True)
    return logs[:limit]
