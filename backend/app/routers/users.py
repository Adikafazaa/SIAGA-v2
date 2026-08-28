"""Autentikasi & Pengguna (/v1/users) - profil, onboarding, verifikasi SIP."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..deps import get_current_user
from ..schemas import LicenseVerifyRequest, OnboardingRequest, UserOut

router = APIRouter(prefix="/v1/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


@router.post("/onboarding", response_model=UserOut)
def onboarding(body: OnboardingRequest, user: dict = Depends(get_current_user)):
    """Lengkapi profil dasar (pasien) / input No. SIP 8-digit (dokter)."""
    data: dict = {"role": body.role, "preferences": body.preferences,
                  "onboardingCompleted": True}
    if body.displayName:
        data["displayName"] = body.displayName
    if body.role == "doctor":
        if not body.doctorLicenseId or len(body.doctorLicenseId) != 8 \
                or not body.doctorLicenseId.isdigit():
            raise HTTPException(422, "Nomor SIP dokter wajib 8 digit angka")
        data["doctorLicenseId"] = body.doctorLicenseId
        data["licenseVerified"] = True  # ponytail: cek format; registry SIP eksternal di Fase 2
    updated = db.upsert_user(user["uid"], data)
    return UserOut(**updated)


@router.post("/verify-license", response_model=UserOut)
def verify_license(body: LicenseVerifyRequest, user: dict = Depends(get_current_user)):
    if user.get("role") != "doctor":
        raise HTTPException(403, "Hanya dokter yang dapat memverifikasi SIP")
    updated = db.upsert_user(user["uid"],
                             {"doctorLicenseId": body.doctorLicenseId,
                              "licenseVerified": True})
    return UserOut(**updated)
