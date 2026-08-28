// Implementasi BackendApi untuk MODE MOCK — mensimulasikan kontrak FastAPI
// gateway SIAGA (Modules/api.md) beserta telemetri, pasien, dan verifikasi SIP.

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
  LatencyMs,
  LicenseVerification,
  PatientDetail,
  PatientSummary,
  SecurityLog,
  SessionTelemetry,
  StatefulMetrics,
} from "../types";
import { evaluateTurn, isSipNumber } from "./guardrail";
import { generateReply, streamText } from "./llm";
import { mockState, SEED_PATIENTS, toTelemetry } from "./store";
import type { MockSession } from "./store";

export interface BackendApi {
  createSession(patientUid: string, patientName: string): Promise<CreateSessionResponse>;
  listSessions(patientUid: string): Promise<ChatSessionInfo[]>;
  getSessionMessages(sessionId: string): Promise<ChatMessage[]>;
  chat(req: ChatRequest): Promise<ChatResponse>;
  chatStream(
    req: ChatRequest,
    onToken: (token: string) => void
  ): Promise<ChatResponse>;
  telemetrySessions(): Promise<SessionTelemetry[]>;
  telemetryLogs(): Promise<SecurityLog[]>;
  aiStatus(): Promise<AiStatus>;
  listPatients(): Promise<PatientSummary[]>;
  patientDetail(uid: string): Promise<PatientDetail>;
  saveAssessment(patientUid: string, type: AssessmentType, answers: Record<string, number>, totalScore: number, severityLevel: string): Promise<Assessment>;
  listAssessments(patientUid: string): Promise<Assessment[]>;
  verifyLicense(uid: string, sip: string, specialization: string): Promise<LicenseVerification>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let sessSeq = 1;
let logSeq = 9013;

function toInfo(s: import("./store").MockSession): ChatSessionInfo {
  return {
    sessionId: s.id,
    patientUid: s.patientUid,
    title: s.title,
    status: s.status,
    turns: s.history.length,
    lastRisk: s.history[s.history.length - 1]?.baseline ?? 0,
    lastDecision: s.history[s.history.length - 1]?.decision ?? "ALLOW",
    createdAt: s.createdAt,
    lastActivityAt: s.lastActivityAt,
  };
}

function findPatient(uid: string) {
  return SEED_PATIENTS.find((p) => p.uid === uid);
}

export function createMockBackend(): BackendApi {
  return {
    async createSession(patientUid, patientName) {
      await sleep(120);
      const id = `sess_live_${Date.now().toString(36)}_${sessSeq++}`;
      const s: MockSession = {
        id,
        patientUid,
        patientName,
        title: "Sesi baru · konseling",
        status: "active",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        messages: [],
        momentum: 0,
        directionConsistency: 0,
        anchorScore: 0,
        attackStreak: 0,
        inProbe: false,
        sipAttempts: 0,
        history: [],
      };
      mockState.sessions[id] = s;
      return { session_id: id };
    },

    async listSessions(patientUid) {
      await sleep(100);
      return Object.values(mockState.sessions)
        .filter((s) => s.patientUid === patientUid)
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
        .map(toInfo);
    },

    async getSessionMessages(sessionId) {
      await sleep(80);
      const s = mockState.sessions[sessionId];
      return s ? [...s.messages] : [];
    },

    async chat(req) {
      return runTurn(req, () => {});
    },

    async chatStream(req, onToken) {
      return runTurn(req, onToken);
    },

    async telemetrySessions() {
      await sleep(150);
      return Object.values(mockState.sessions)
        .map(toTelemetry)
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    },

    async telemetryLogs() {
      await sleep(120);
      return [...mockState.logs].sort((a, b) => b.timestamp - a.timestamp);
    },

    async aiStatus() {
      await sleep(100);
      return {
        online: true,
        model: "llama-3.1-8b-instruct (mock)",
        endpoint: "ollama://localhost:11434",
        latencyP95Ms: 42,
        tokensPerSec: 38,
        uptimeSec: 172_800,
        guardrailLatencyP95Ms: 54,
      };
    },

    async listPatients() {
      await sleep(150);
      return SEED_PATIENTS.map((p) => {
        const sessions = Object.values(mockState.sessions).filter((s) => s.patientUid === p.uid);
        const latest = sessions.sort((a, b) => b.lastActivityAt - a.lastActivityAt)[0];
        const assessments = mockState.assessments
          .filter((a) => a.patientUid === p.uid)
          .sort((a, b) => b.completedAt - a.completedAt);
        return {
          uid: p.uid,
          name: p.name,
          email: p.email,
          lastActivityAt: latest?.lastActivityAt ?? 0,
          lastDecision: latest?.history[latest.history.length - 1]?.decision ?? ("ALLOW" as Decision),
          lastRisk: latest ? latest.history[latest.history.length - 1]?.baseline ?? 0 : 0,
          latestAssessment: assessments[0]
            ? {
                type: assessments[0].type,
                totalScore: assessments[0].totalScore,
                severityLevel: assessments[0].severityLevel,
                completedAt: assessments[0].completedAt,
              }
            : null,
        };
      });
    },

    async patientDetail(uid) {
      await sleep(180);
      const p = findPatient(uid);
      if (!p) throw new Error(`Pasien ${uid} tidak ditemukan`);
      const sessions = Object.values(mockState.sessions)
        .filter((s) => s.patientUid === uid)
        .map(toTelemetry)
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
      const assessments = mockState.assessments
        .filter((a) => a.patientUid === uid)
        .sort((a, b) => b.completedAt - a.completedAt);
      const logs = mockState.logs
        .filter((l) => l.patientName === p.name)
        .sort((a, b) => b.timestamp - a.timestamp);
      const summary = (await this.listPatients()).find((x) => x.uid === uid)!;
      return {
        ...summary,
        notes: mockState.notes[uid] ?? "Belum ada catatan klinis.",
        notesUpdatedAt: Date.now() - 26 * 3600_000,
        sessions,
        assessments,
        logs,
      };
    },

    async saveAssessment(patientUid, type, answers, totalScore, severityLevel) {
      await sleep(200);
      const a: Assessment = {
        assessmentId: `as_${Date.now().toString(36)}`,
        patientUid,
        type,
        totalScore,
        severityLevel,
        answers,
        completedAt: Date.now(),
      };
      mockState.assessments.push(a);
      return a;
    },

    async listAssessments(patientUid) {
      await sleep(120);
      return mockState.assessments
        .filter((a) => a.patientUid === patientUid)
        .sort((a, b) => b.completedAt - a.completedAt);
    },

    async verifyLicense(_uid, sip, _specialization) {
      await sleep(700);
      if (!/^\d{8}$/.test(sip)) {
        throw new Error("Nomor SIP tidak valid — harus tepat 8 digit angka.");
      }
      return { verified: true, doctorLicenseId: sip, verifiedAt: Date.now() };
    },
  };
}

// --- Mesin satu-turn (dipakai chat & chatStream) --------------------------------

async function runTurn(
  req: ChatRequest,
  onToken: (token: string) => void
): Promise<ChatResponse> {
  const s = mockState.sessions[req.session_id];
  if (!s) throw new Error(`Sesi ${req.session_id} tidak ditemukan`);

  await sleep(250); // simulasi inferensi ONNX L1
  const result = evaluateTurn(req.content, s.momentum, s.attackStreak, req.turn_index);
  const ts = Date.now();

  s.momentum = result.momentum;
  s.directionConsistency = result.directionConsistency;
  s.anchorScore = result.anchorScore;
  s.attackStreak = result.attackHit ? s.attackStreak + 1 : 0;
  s.lastActivityAt = ts;

  s.history.push({
    turn: req.turn_index + 1,
    momentum: result.momentum,
    baseline: result.baseline,
    decision: result.decision,
  });
  s.messages.push({
    id: `m_${ts}_u`,
    sessionId: s.id,
    role: "user",
    content: req.content,
    createdAt: ts,
    riskScore: result.risk,
    decision: result.decision,
  });

  let assistantText: string;
  if (result.decision === "BLOCK") {
    s.status = "blocked";
    assistantText =
      "Akses dibatasi. Sistem mendeteksi anomali pada pola percakapan ini. Sesi dijeda demi keamanan data klinis — Anda tetap dapat memulai sesi baru.";
    s.messages.push({
      id: `m_${ts}_sys`,
      sessionId: s.id,
      role: "system",
      content: "SIAGA_ BLOCK — Cumulative risk threshold exceeded. Insiden tercatat di log keamanan SOC.",
      createdAt: ts + 300,
    });
  } else if (result.decision === "PROBE" && !s.inProbe) {
    s.inProbe = true;
    s.sipAttempts = 0;
    assistantText =
      "SIAGA_ PROBE — Sistem mendeteksi pola percakapan yang mengarah ke data sensitif. Untuk melanjutkan, verifikasi otorisasi diperlukan: kirimkan Nomor SIP Anda (8 digit angka). Percakapan dijeda sementara hingga verifikasi selesai.";
  } else if (s.inProbe) {
    if (isSipNumber(req.content)) {
      s.inProbe = false;
      s.momentum = 0.12;
      assistantText =
        "Otorisasi diverifikasi (SIP tersandi *******8). Sesi dilanjutkan. Silakan kembali ke konsultasi Anda.";
    } else {
      s.sipAttempts += 1;
      s.momentum = Math.min(1, s.momentum + 0.22);
      assistantText =
        "Verifikasi tidak dapat dilakukan — format Nomor SIP tidak dikenali. Pola anomali terus terakumulasi.";
      if (s.momentum >= 0.8) {
        s.inProbe = false;
        s.status = "blocked";
        assistantText =
          "Akses dibatasi. Verifikasi berulang gagal dan momentum risiko melebihi ambang. Sesi dihentikan demi keamanan data klinis.";
      }
    }
  } else if (result.decision === "WATCH") {
    const base = generateReply(req.content);
    assistantText =
      base.crisis
        ? base.text
        : base.text +
          " (Catatan: sistem sedang memantau pola percakapan ini. Tetap ceritakan apa yang Anda rasakan — saya di sini untuk Anda.)";
  } else {
    const base = generateReply(req.content);
    assistantText = base.text;
  }

  if (req.stream) {
    await streamText(assistantText, onToken);
  }

  s.messages.push({
    id: `m_${ts}_a`,
    sessionId: s.id,
    role: "assistant",
    content: assistantText,
    createdAt: ts + 500,
  });

  if (result.decision === "PROBE" || result.decision === "BLOCK" || result.decision === "WATCH") {
    s.status = result.decision === "BLOCK" ? "blocked" : "flagged";
  }

  mockState.logs.unshift({
    logId: `log-${logSeq++}`,
    sessionId: s.id,
    patientName: s.patientName,
    riskScore: result.risk,
    decision: result.decision,
    explanation: result.explanation,
    latencyMs: result.latencyMs,
    timestamp: ts,
  });

  const latencyMs: LatencyMs = result.latencyMs;
  const stateful_metrics: StatefulMetrics = {
    momentum: result.momentum,
    directionConsistency: result.directionConsistency,
    anchorScore: result.anchorScore,
    turnsToDetection: result.turnsToDetection,
    latencyMs,
  };

  return {
    status: result.decision === "BLOCK" ? "BLOCKED" : "ALLOWED",
    decision: result.decision,
    reply: assistantText,
    risk_score: result.risk,
    session_id: s.id,
    stateful_metrics,
    explanation: result.explanation,
  };
}
