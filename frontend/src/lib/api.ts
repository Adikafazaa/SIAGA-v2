// Fasad API — satu-satunya pintu frontend ke backend FastAPI gateway SIAGA.
//
// Mode:
//  - live: memanggil NEXT_PUBLIC_API_URL
//  - mock: engine simulasi lokal (src/lib/mock)

import type {
  AiStatus,
  Assessment,
  AssessmentType,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatSessionInfo,
  CreateSessionResponse,
  Decision,
  LicenseVerification,
  PatientDetail,
  PatientSummary,
  SecurityLog,
  SessionStatus,
  SessionTelemetry,
} from "./types";
import { createMockBackend, type BackendApi } from "./mock/backend";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const FORCE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

export type ApiMode = "live" | "mock";

let mode: ApiMode | null = null;
let token: string | null = null;
const modeListeners = new Set<(m: ApiMode) => void>();

export function setAuthToken(t: string | null) {
  token = t;
}

export function currentMode(): ApiMode {
  return mode ?? "mock";
}

export function onModeChange(cb: (m: ApiMode) => void): () => void {
  modeListeners.add(cb);
  cb(mode ?? "mock");
  return () => modeListeners.delete(cb);
}

function setMode(m: ApiMode) {
  if (mode === m) return;
  mode = m;
  modeListeners.forEach((cb) => cb(m));
}

async function probeHealth(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/** Dipanggil sekali saat aplikasi client mulai; menentukan live vs mock. */
export async function ensureApiMode(): Promise<ApiMode> {
  if (mode) return mode;
  const resolved: ApiMode = FORCE_MOCK ? "mock" : (await probeHealth()) ? "live" : "mock";
  setMode(resolved);
  return resolved;
}

const mock: BackendApi = createMockBackend();

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function live<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: headers({ "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} pada ${path}${body ? ` — ${body.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as T;
}

/** Jalankan aksi live; bila backend mati, jatuh ke mock (jujur via badge). */
async function guarded<T>(liveFn: () => Promise<T>, mockFn: () => Promise<T>): Promise<T> {
  if (currentMode() === "mock") return mockFn();
  try {
    return await liveFn();
  } catch {
    setMode("mock");
    return mockFn();
  }
}

// --- Chat ----------------------------------------------------------------------

export function createSession(patientUid: string, patientName: string): Promise<CreateSessionResponse> {
  return guarded<CreateSessionResponse>(
    async () => {
      const res = await live<any>("/v1/chat/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "Sesi baru · konseling" }),
      });
      return { session_id: res.sessionId ?? res.session_id ?? "" };
    },
    () => mock.createSession(patientUid, patientName)
  );
}

export function listSessions(patientUid: string): Promise<ChatSessionInfo[]> {
  return guarded<ChatSessionInfo[]>(
    async () => {
      const list = await live<any[]>("/v1/chat/sessions");
      return list.map((s) => ({
        sessionId: s.sessionId ?? s.id,
        patientUid: s.patientUid ?? patientUid,
        title: s.title ?? "Sesi Konseling",
        status: (s.status as SessionStatus) ?? "active",
        turns: s.turns ?? 0,
        lastRisk: s.lastRisk ?? 0,
        lastDecision: (s.lastDecision as Decision) ?? "ALLOW",
        createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
        lastActivityAt: s.lastActivityAt ? new Date(s.lastActivityAt).getTime() : Date.now(),
      }));
    },
    () => mock.listSessions(patientUid)
  );
}

export function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  return guarded<ChatMessage[]>(
    async () => {
      const list = await live<any[]>(`/v1/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
      return list.map((m) => ({
        id: m.messageId ?? m.id,
        sessionId: sessionId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
        riskScore: m.riskScore,
        decision: m.decision as Decision | undefined,
      }));
    },
    () => mock.getSessionMessages(sessionId)
  );
}

export function chatMessage(req: ChatRequest): Promise<ChatResponse> {
  return guarded<ChatResponse>(
    () => live<ChatResponse>("/v1/chat/message", { method: "POST", body: JSON.stringify(req) }),
    () => mock.chat(req)
  );
}

/**
 * Chat dengan streaming SSE.
 */
export async function chatMessageStream(
  req: ChatRequest,
  onToken: (token: string) => void
): Promise<ChatResponse> {
  if (currentMode() === "mock") return mock.chatStream(req, onToken);
  try {
    const res = await fetch(`${API_URL}/v1/chat/message`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ...req, stream: true }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const ctype = res.headers.get("content-type") ?? "";
    if (ctype.includes("text/event-stream") && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            if (typeof json.t === "string") onToken(json.t);
            else if (typeof json.token === "string") onToken(json.token);
            else if (typeof json.content === "string") onToken(json.content);
          } catch {
            // baris SSE non-JSON
          }
        }
      }
      const finalLine = lines_last(buf);
      if (finalLine) {
        try {
          return JSON.parse(finalLine) as ChatResponse;
        } catch {
          /* ignore */
        }
      }
      return {
        status: "ALLOWED",
        decision: "ALLOW",
        reply: "",
        risk_score: 0,
        session_id: req.session_id,
      };
    }
    return (await res.json()) as ChatResponse;
  } catch {
    setMode("mock");
    return mock.chatStream(req, onToken);
  }
}

function lines_last(buf: string): string | null {
  const lines = buf.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("data:"));
  const last = lines[lines.length - 1];
  return last ? last.slice(5).trim() : null;
}

// --- Telemetri SOC ---------------------------------------------------------------

export function telemetrySessions(): Promise<SessionTelemetry[]> {
  return guarded<SessionTelemetry[]>(
    async () => {
      const data = await live<any>("/v1/admin/telemetry");
      return (data.sessions || []) as SessionTelemetry[];
    },
    () => mock.telemetrySessions()
  );
}

export function telemetryLogs(): Promise<SecurityLog[]> {
  return guarded<SecurityLog[]>(
    async () => {
      const logs = await live<any[]>("/v1/admin/security-logs");
      return logs.map((l) => ({
        logId: l.logId ?? l.id ?? `log-${Math.random().toString(36).slice(2, 7)}`,
        sessionId: l.sessionId ?? l.session_id ?? "",
        patientName: l.patientName ?? l.patientUid ?? "Pasien",
        riskScore: l.riskScore ?? l.risk_score ?? 0,
        decision: (l.decision ?? "ALLOW") as Decision,
        explanation: typeof l.explanation === "string" ? l.explanation : JSON.stringify(l.explanation ?? ""),
        timestamp: l.timestamp ? new Date(l.timestamp).getTime() : Date.now(),
        latencyMs: l.latencyMs ? l.latencyMs : { l0: 0, l1: 0, cim: 0, total: l.latencyMsTotal ?? 0 },
      }));
    },
    () => mock.telemetryLogs()
  );
}

export function aiStatus(): Promise<AiStatus> {
  return guarded<AiStatus>(
    async () => {
      const st = await live<any>("/v1/admin/llm-status");
      return {
        online: Boolean(st.online),
        model: st.model ?? "qwen3:1.7b",
        endpoint: st.endpoint ?? "http://localhost:11434",
        latencyP95Ms: st.latencyMs ?? 0,
        tokensPerSec: 32,
        uptimeSec: 3600,
        guardrailLatencyP95Ms: 15,
      };
    },
    () => mock.aiStatus()
  );
}

// --- Pasien / Dokter ---------------------------------------------------------------

export function listPatients(): Promise<PatientSummary[]> {
  return guarded<PatientSummary[]>(
    async () => {
      const list = await live<any[]>("/v1/doctor/patients");
      return list.map((p) => ({
        uid: p.uid,
        name: p.displayName || p.name || p.email || "Pasien",
        email: p.email || "",
        lastActivityAt: Date.now(),
        lastDecision: "ALLOW" as Decision,
        lastRisk: 0,
        latestAssessment: p.latestAssessment ?? null,
      }));
    },
    () => mock.listPatients()
  );
}

export function patientDetail(uid: string): Promise<PatientDetail> {
  return guarded<PatientDetail>(
    async () => {
      const d = await live<any>(`/v1/doctor/patients/${encodeURIComponent(uid)}`);
      return {
        uid: d.profile?.uid || uid,
        name: d.profile?.displayName || d.profile?.email || "Pasien",
        email: d.profile?.email || "",
        notes: (d.medicalRecords || []).map((r: any) => r.notes).join("\n\n"),
        notesUpdatedAt: Date.now(),
        lastActivityAt: Date.now(),
        lastDecision: "ALLOW" as Decision,
        lastRisk: 0,
        latestAssessment: null,
        sessions: (d.chatSessions || []).map((s: any) => ({
          sessionId: s.sessionId,
          patientUid: uid,
          patientName: d.profile?.displayName || "Pasien",
          title: s.title || "Sesi",
          status: (s.status as SessionStatus) || "active",
          turns: 0,
          lastRisk: 0,
          lastDecision: "ALLOW" as Decision,
          directionConsistency: 0,
          anchorScore: 0,
          history: [],
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        })),
        assessments: d.assessments || [],
        logs: [] as SecurityLog[],
      };
    },
    () => mock.patientDetail(uid)
  );
}

export function verifyLicense(uid: string, sip: string, specialization: string): Promise<LicenseVerification> {
  return guarded<LicenseVerification>(
    async () => {
      const res = await live<any>("/v1/users/verify-license", {
        method: "POST",
        body: JSON.stringify({ doctorLicenseId: sip }),
      });
      return {
        verified: Boolean(res.licenseVerified),
        doctorLicenseId: res.doctorLicenseId || sip,
        verifiedAt: Date.now(),
      };
    },
    () => mock.verifyLicense(uid, sip, specialization)
  );
}

// --- Asesmen ---------------------------------------------------------------------

export function saveAssessment(
  patientUid: string,
  type: AssessmentType,
  answers: Record<string, number>,
  totalScore: number,
  severityLevel: string
): Promise<Assessment> {
  const numQuestions = type === "PHQ-9" ? 9 : 7;
  const answersArray: number[] = [];
  for (let i = 0; i < numQuestions; i++) {
    answersArray.push(Number(answers[String(i)] ?? answers[i] ?? 0));
  }

  return guarded<Assessment>(
    async () => {
      const doc = await live<any>("/v1/assessments", {
        method: "POST",
        body: JSON.stringify({ type, answers: answersArray }),
      });
      return {
        assessmentId: doc.assessmentId || doc.id || `asm-${Date.now()}`,
        patientUid: doc.patientUid || patientUid,
        type: doc.type,
        totalScore: doc.totalScore ?? totalScore,
        severityLevel: doc.severityLevel ?? severityLevel,
        answers: doc.answers ?? answers,
        completedAt: Date.now(),
      };
    },
    () => mock.saveAssessment(patientUid, type, answers, totalScore, severityLevel)
  );
}

export function listAssessments(patientUid: string): Promise<Assessment[]> {
  return guarded<Assessment[]>(
    () => live<Assessment[]>("/v1/assessments"),
    () => mock.listAssessments(patientUid)
  );
}
