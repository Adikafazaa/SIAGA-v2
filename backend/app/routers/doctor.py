"""Doctor / Clinical Management DPJP Portal (/v1/doctor)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..deps import require_role
from ..schemas import MedicalRecordCreate

router = APIRouter(prefix="/v1/doctor", tags=["doctor"])


@router.get("/patients")
def patients(user: dict = Depends(require_role("doctor", "admin"))):
    """Daftar pasien + asesmen terakhir (antrean DPJP)."""
    out = []
    for p in db.list_users_by_role("patient"):
        assessments = db.list_assessments(p["uid"])
        out.append({
            "uid": p["uid"],
            "displayName": p.get("displayName", ""),
            "email": p.get("email", ""),
            "latestAssessment": assessments[0] if assessments else None,
        })
    return out


@router.get("/patients/{patient_uid}")
def patient_detail(patient_uid: str, user: dict = Depends(require_role("doctor", "admin"))):
    profile = db.get_user(patient_uid)
    if not profile or profile.get("role") != "patient":
        raise HTTPException(404, "Patient not found")
    return {
        "profile": profile,
        "assessments": db.list_assessments(patient_uid),
        "medicalRecords": db.list_medical_records(patient_uid),
        "chatSessions": [
            {k: s.get(k) for k in ("sessionId", "title", "status", "lastActivityAt")}
            for s in db.list_chat_sessions(patient_uid)
        ],
    }


@router.post("/records")
def add_record(body: MedicalRecordCreate, user: dict = Depends(require_role("doctor", "admin"))):
    patient = db.get_user(body.patientUid)
    if not patient or patient.get("role") != "patient":
        raise HTTPException(404, "Patient not found")
    return db.save_medical_record(user["uid"], body.patientUid, body.notes)
