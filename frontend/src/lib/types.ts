// Tipe bersama seluruh frontend SIAGA v2.

export type Role = "patient" | "doctor" | "admin";

export type AuthProvider = "google" | "password" | "demo";

export type Decision = "ALLOW" | "WATCH" | "PROBE" | "BLOCK";

export type SessionStatus = "active" | "flagged" | "blocked" | "archived";

export type AssessmentType = "PHQ-9" | "GAD-7";

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  provider: AuthProvider;
  role: Role | null;
  onboardingCompleted: boolean;
  doctorLicenseId?: string | null;
  specialization?: string | null;
  /** Preferensi pendekatan konseling (pasien) */
  counselingPreferences?: string[];
  preferredSlot?: string | null;
  createdAt: number;
  lastLoginAt?: number | null;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  /** Hasil guardrail untuk pesan user (ditampilkan di telemetri, bukan ke pasien) */
  riskScore?: number;
  decision?: Decision;
}

export interface ChatSessionInfo {
  sessionId: string;
  patientUid: string;
  title: string;
  status: SessionStatus;
  turns: number;
  lastRisk: number;
  lastDecision: Decision;
  createdAt: number;
  lastActivityAt: number;
}

export interface LatencyMs {
  l0: number;
  l1: number;
  cim: number;
  total: number;
}

export interface StatefulMetrics {
  momentum: number;
  directionConsistency: number;
  anchorScore: number;
  turnsToDetection: number;
  latencyMs: LatencyMs;
}

export interface ChatRequest {
  session_id: string;
  turn_index: number;
  content: string;
  stream: boolean;
}

export interface ChatResponse {
  status: "ALLOWED" | "BLOCKED";
  decision: Decision;
  reply: string;
  risk_score: number;
  session_id: string;
  stateful_metrics?: StatefulMetrics;
  explanation?: string;
}

/** Titik data per-turn untuk kurva momentum (chart & tabel) */
export interface MomentumPoint {
  turn: number;
  momentum: number;
  baseline: number;
  decision: Decision;
}

export interface SessionTelemetry extends ChatSessionInfo {
  patientName: string;
  directionConsistency: number;
  anchorScore: number;
  history: MomentumPoint[];
}

export interface SecurityLog {
  logId: string;
  sessionId: string;
  patientName: string;
  riskScore: number;
  decision: Decision;
  explanation: string;
  latencyMs?: LatencyMs;
  timestamp: number;
}

export interface AiStatus {
  online: boolean;
  model: string;
  endpoint: string;
  latencyP95Ms: number;
  tokensPerSec: number;
  uptimeSec: number;
  guardrailLatencyP95Ms: number;
}

export interface PatientSummary {
  uid: string;
  name: string;
  email: string;
  lastActivityAt: number;
  lastDecision: Decision;
  lastRisk: number;
  latestAssessment?: {
    type: AssessmentType;
    totalScore: number;
    severityLevel: string;
    completedAt: number;
  } | null;
}

export interface PatientDetail extends PatientSummary {
  notes: string;
  notesUpdatedAt: number;
  sessions: SessionTelemetry[];
  assessments: Assessment[];
  logs: SecurityLog[];
}

export interface Assessment {
  assessmentId: string;
  patientUid: string;
  type: AssessmentType;
  totalScore: number;
  severityLevel: string;
  answers: Record<string, number>;
  completedAt: number;
}

export interface LicenseVerification {
  verified: boolean;
  doctorLicenseId: string;
  verifiedAt: number;
}

export interface CreateSessionResponse {
  session_id: string;
}
