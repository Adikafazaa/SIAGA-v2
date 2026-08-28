"""Dependensi otentikasi: Firebase ID token (produksi) / token dev (fallback).

Produksi: frontend mengirim `Authorization: Bearer <Firebase ID token>`;
token diverifikasi Firebase Admin SDK.
Tanpa kredensial Firebase (dev lokal): terima `Bearer dev-<uid>` agar
prototipe tetap teruji end-to-end.
"""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status

from . import db
from .config import FIREBASE_CREDENTIALS_PATH

_firebase_auth = None
try:
    if FIREBASE_CREDENTIALS_PATH:
        from firebase_admin import auth as _fb_auth

        _firebase_auth = _fb_auth
except Exception:
    _firebase_auth = None


def get_current_user(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    uid: str = "dev-user"
    email: str = ""
    display_name: str = ""

    if _firebase_auth is not None:
        try:
            decoded = _firebase_auth.verify_id_token(token)
            uid = decoded.get("uid", "")
            email = decoded.get("email", "")
            display_name = decoded.get("name", "")
        except Exception as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}")
    elif token.count(".") == 2:
        # JWT format (e.g. Firebase ID token directly from client in local dev without service account JSON)
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False})
            uid = decoded.get("user_id") or decoded.get("sub") or decoded.get("uid") or "firebase-user"
            email = decoded.get("email", "")
            display_name = decoded.get("name", "")
        except Exception:
            uid = token
    elif token.startswith(("dev-", "dev.", "demo-", "demo.")):
        uid = token
        for prefix in ("dev-token-", "demo-token-", "dev.", "demo.", "dev-", "demo-"):
            if uid.startswith(prefix):
                uid = uid[len(prefix):]
                break
        uid = uid.strip() or "dev-user"
    else:
        uid = token or "dev-user"

    user = db.get_user(uid)
    if not user:
        init_data: dict = {}
        if email:
            init_data["email"] = email
        if display_name:
            init_data["displayName"] = display_name
        
        # Auto-assign initial role based on UID if not specified
        lower_uid = uid.lower()
        if "doctor" in lower_uid or "dokter" in lower_uid:
            init_data["role"] = "doctor"
            init_data["doctorLicenseId"] = "87654321"
            init_data["licenseVerified"] = True
            init_data["onboardingCompleted"] = True
        elif "admin" in lower_uid or "soc" in lower_uid:
            init_data["role"] = "admin"
            init_data["onboardingCompleted"] = True
        else:
            init_data["role"] = "patient"
            init_data["onboardingCompleted"] = True
        user = db.upsert_user(uid, init_data)
    return user


def require_role(*roles: str):
    def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires role: {'/'.join(roles)}")
        return user
    return dep

