"""Clinical Assessment Hub (/v1/assessments) - PHQ-9 & GAD-7, skor server-side."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..deps import get_current_user
from ..schemas import AssessmentSubmit

router = APIRouter(prefix="/v1/assessments", tags=["assessments"])

INSTRUMENTS: dict[str, dict] = {
    "PHQ-9": {
        "name": "Patient Health Questionnaire-9",
        "scale": "Depresi",
        "maxScore": 27,
        "options": ["Tidak pernah (0)", "Beberapa hari (1)", "Lebih dari setengah hari (2)", "Hampir setiap hari (3)"],
        "questions": [
            "Kurangnya minat atau kesenangan dalam melakukan sesuatu",
            "Merasa sedih, murung, atau putus asa",
            "Sulit tidur, sering terbangun, atau tidur berlebihan",
            "Merasa lelah atau kurang energi",
            "Nafsu makan buruk atau makan berlebihan",
            "Merasa buruk tentang diri sendiri atau merasa gagal",
            "Sulit berkonsentrasi, misalnya membaca atau menonton TV",
            "Bergerak atau berbicara sangat lambat / gelisah berlebihan",
            "Pikiran bahwa lebih baik mati atau ingin menyakiti diri",
        ],
        "severity": [(5, "minimal"), (10, "mild"), (15, "moderate"), (20, "moderately_severe"), (28, "severe")],
    },
    "GAD-7": {
        "name": "Generalized Anxiety Disorder-7",
        "scale": "Kecemasan",
        "maxScore": 21,
        "options": ["Tidak pernah (0)", "Beberapa hari (1)", "Lebih dari setengah hari (2)", "Hampir setiap hari (3)"],
        "questions": [
            "Merasa gugup, cemas, atau tegang",
            "Tidak mampu berhenti merasa khawatir",
            "Terlalu khawatir tentang berbagai hal",
            "Sulit bersantai",
            "Sangat gelisah sehingga sulit untuk diam",
            "Mudah terganggu atau tersinggung",
            "Merasa takut seolah sesuatu mengerikan mungkin terjadi",
        ],
        "severity": [(5, "minimal"), (10, "mild"), (15, "moderate"), (22, "severe")],
    },
}

SAFETY_ITEM = {"PHQ-9": 8}  # item 9 PHQ-9: pikiran menyakiti diri


def _severity(instrument: dict, score: int) -> str:
    for threshold, label in instrument["severity"]:
        if score < threshold:
            return label
    return "severe"


@router.get("/instruments")
def instruments():
    return INSTRUMENTS


@router.post("")
def submit(body: AssessmentSubmit, user: dict = Depends(get_current_user)):
    instrument = INSTRUMENTS.get(body.type)
    if instrument is None:
        raise HTTPException(404, "Instrumen tidak dikenal")
    n = len(instrument["questions"])
    if len(body.answers) != n or not all(isinstance(a, int) and 0 <= a <= 3 for a in body.answers):
        raise HTTPException(422, f"answers wajib {n} angka integer 0-3")

    total = sum(body.answers)
    doc = db.save_assessment(
        user["uid"],
        {
            "type": body.type,
            "totalScore": total,
            "severityLevel": _severity(instrument, total),
            "answers": {str(i): a for i, a in enumerate(body.answers)},
            "requiresClinicalAttention":
                any(body.answers[i] >= 2 for i in [SAFETY_ITEM.get(body.type, -1)] if i >= 0)
                or total >= 15,
        },
    )
    return doc


@router.get("")
def history(user: dict = Depends(get_current_user)):
    return db.list_assessments(user["uid"])
