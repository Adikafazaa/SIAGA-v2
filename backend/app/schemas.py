"""Skema Pydantic - kontrak API v2 (Modules/api.md) + bentuk internal guardrail."""
from __future__ import annotations

from pydantic import BaseModel, Field


# ── Internal guardrail (dipakai core/engine) ────────────────────────────────
class ExplanationItem(BaseModel):
    turn: int
    reason: str


class SignalBreakdown(BaseModel):
    momentum: float
    direction: float
    anchor: float
    provenance: float
    intent: float
    l2_context: float
    l0_anomalies: list[str]
    l2_notes: list[str]
    baseline_single: float


class InspectRequest(BaseModel):
    session_id: str
    turn: int
    text: str
    prev_system_output: str | None = None
    channel_owned: bool = True
    channel: str = "psycho_web"


class ProbeActionOut(BaseModel):
    triggered: bool
    level: int
    probe_type: str
    injected_prompt: str


class InspectResponse(BaseModel):
    decision: str  # allow | watch | probe | block
    score: float
    uncertainty: float
    turn: int
    ttd: int | None = None
    signals: SignalBreakdown
    probe_action: ProbeActionOut | None = None
    explanation: list[ExplanationItem] = []
    baseline_per_message_max: float = 0.0
    baseline_stateless_decision: str = "allow"
    session_blocked: bool = False
    latency_ms: dict[str, float] = {}


class ProbeVerifyRequest(BaseModel):
    session_id: str
    reply: str


class ProbeVerifyResponse(BaseModel):
    session_id: str
    outcome: str  # bot_confirmed | human | ambiguous | no_pending_probe
    decision: str
    score: float
    reason: str
    turn: int | None = None
    ttd: int | None = None
    session_blocked: bool = False


# ── Users / Auth ────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    uid: str
    displayName: str = ""
    email: str = ""
    photoURL: str = ""
    provider: str = "password"
    role: str = "patient"  # patient | doctor | admin
    doctorLicenseId: str | None = None
    licenseVerified: bool = False
    onboardingCompleted: bool = False
    preferences: dict = {}


class OnboardingRequest(BaseModel):
    displayName: str | None = None
    role: str = Field(pattern="^(patient|doctor)$")
    doctorLicenseId: str | None = None
    preferences: dict = {}


# ── Chat ────────────────────────────────────────────────────────────────────
class ChatMessageIn(BaseModel):
    session_id: str | None = None
    content: str = Field(min_length=1, max_length=32000)
    stream: bool = False


class StatefulMetrics(BaseModel):
    momentum: float
    direction_consistency: float
    anchor_score: float
    turns_to_detection: int | None = None


class ChatResponse(BaseModel):
    session_id: str
    status: str  # ALLOWED | BLOCKED
    decision: str  # ALLOW | WATCH | PROBE | BLOCK
    reply: str
    risk_score: float
    reason: str | None = None
    stateful_metrics: StatefulMetrics | None = None
    latency_ms: dict[str, float] | None = None
    explanation: list[ExplanationItem] = []


class ChatSessionOut(BaseModel):
    sessionId: str
    title: str
    status: str
    createdAt: str | None = None
    lastActivityAt: str | None = None


class ChatMessageOut(BaseModel):
    messageId: str
    role: str  # user | assistant
    content: str
    riskScore: float | None = None
    decision: str | None = None
    createdAt: str | None = None


class CreateSessionRequest(BaseModel):
    title: str = "Sesi Konseling"


# ── Assessments ─────────────────────────────────────────────────────────────
class AssessmentSubmit(BaseModel):
    type: str = Field(pattern="^(PHQ-9|GAD-7)$")
    answers: list[int]


# ── Doctor ──────────────────────────────────────────────────────────────────
class MedicalRecordCreate(BaseModel):
    patientUid: str
    notes: str = Field(min_length=1, max_length=20000)


class LicenseVerifyRequest(BaseModel):
    doctorLicenseId: str = Field(min_length=8, max_length=8, pattern="^\\d{8}$")
