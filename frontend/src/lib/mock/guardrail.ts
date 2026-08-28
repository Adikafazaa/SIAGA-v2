// Simulasi pipeline guardrail SIAGA (L0–L3) untuk MODE MOCK.
// Mirip kontrak respons di Modules/api.md: decision, risk_score, stateful_metrics, latency_ms.
// Keputusan BUKAN hasil backend — selalu diberi label "MOCK" di UI.

import type { Decision, LatencyMs } from "../types";
import { THRESHOLDS } from "../constants";

export interface GuardrailResult {
  decision: Decision;
  risk: number;
  momentum: number;
  baseline: number;
  directionConsistency: number;
  anchorScore: number;
  turnsToDetection: number;
  latencyMs: LatencyMs;
  l0Stripped: boolean;
  attackHit: boolean;
  explanation: string;
}

const ZERO_WIDTH = /[\u200b\u200c\u200d\u2060\ufeff\u00ad]/g;

/** Pola muatan koersif / eksfiltrasi (Indo + EN). Skor = bobot risiko per pesan. */
const ATTACK_PATTERNS: Array<{ re: RegExp; weight: number; tag: string }> = [
  {
    re: /(ignore|lupakan|abaikan)\s+(all|semua|sembarang|instruksi|aturan|perintah)/i,
    weight: 0.85,
    tag: "prompt-injection",
  },
  {
    re: /(system\s*prompt|prompt\s+(awal|sistem|rahasia)|original\s+instructions?)/i,
    weight: 0.8,
    tag: "prompt-extraction",
  },
  {
    re: /(api[-\s]?key|secret\s+key|token\s+(akses|rahasia)|password\s+admin|credential)/i,
    weight: 0.85,
    tag: "credential-targeting",
  },
  {
    re: /(database|rekam\s+medis|data\s+(pasien|klinis|medis)|\bsql\b|schema\s+tabel)/i,
    weight: 0.65,
    tag: "data-access",
  },
  {
    re: /(jailbreak|bypass|disonasi|mode\s+(admin|developer|god)|act\s+as\s+(admin|root|system))/i,
    weight: 0.8,
    tag: "privilege-escalation",
  },
  {
    re: /(leak|bocorkan|salin|kirimkan|ekspor|unduh|tampilkan)\s+(.{0,30})?(data|pasien|medis|rekam)/i,
    weight: 0.85,
    tag: "exfiltration",
  },
  {
    re: /(nomor|no)\.?\s*sip|verifikasi\s+dokter|otorisasi\s+dokter/i,
    weight: 0.55,
    tag: "authorization-probe",
  },
  {
    re: /(hapus|reset|drop\s+table|destruct|pulihkan\s+akses)/i,
    weight: 0.6,
    tag: "destructive-cmd",
  },
  {
    re: /(tanpa\s+(aturan|batas|sensor|filter)|unrestricted|jangan\s+ada\s+pembatasan)/i,
    weight: 0.7,
    tag: "constraint-removal",
  },
  {
    re: /(roleplay|berperan)\s+(sebagai|jadi)\s+(admin|root|system|developer)/i,
    weight: 0.75,
    tag: "role-spoofing",
  },
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Evaluasi satu turn percakapan.
 * `prevMomentum` = momentum CIM sesi sebelumnya, `attackStreak` = jumlah turn
 * beruntun yang memukul pola serangan (konsistensi arah).
 */
export function evaluateTurn(
  content: string,
  prevMomentum: number,
  attackStreak: number,
  turnIndex: number
): GuardrailResult {
  // L0 — sanitasi UTS #39: deteksi & strip karakter zero-width.
  const l0Stripped = ZERO_WIDTH.test(content);
  const clean = content.replace(ZERO_WIDTH, "");

  let baseline = rand(0.01, 0.06);
  let attackHit = false;
  let hitTag = "";
  for (const p of ATTACK_PATTERNS) {
    if (p.re.test(clean)) {
      baseline = Math.max(baseline, p.weight);
      attackHit = true;
      hitTag = p.tag;
      break;
    }
  }
  if (l0Stripped) {
    baseline = Math.max(baseline, 0.45);
    hitTag = "zero-width-injection";
  }

  // L3 — CIM: momentum = decay(0.9) * momentum sebelumnya + bobot pesan saat ini.
  const momentum = Math.min(1, prevMomentum * 0.9 + baseline * 0.45);

  const directionConsistency = attackHit
    ? Math.min(0.95, 0.4 + 0.18 * Math.max(1, attackStreak) + rand(0, 0.05))
    : rand(0.08, 0.28);
  const anchorScore = rand(0.25, 0.72);

  const latencyMs: LatencyMs = {
    l0: +rand(0.4, 1.2).toFixed(1),
    l1: +rand(7, 16).toFixed(1),
    cim: +rand(5, 11).toFixed(1),
    total: 0,
  };
  latencyMs.total = +(latencyMs.l0 + latencyMs.l1 + latencyMs.cim + rand(3, 7)).toFixed(1);

  let decision: Decision;
  let explanation: string;
  if (momentum >= THRESHOLDS.block) {
    decision = "BLOCK";
    explanation = `Cumulative risk threshold exceeded (momentum ${momentum.toFixed(
      2
    )}, streak ${attackStreak} turn, tag=${hitTag || "n/a"}).`;
  } else if (momentum >= THRESHOLDS.probe) {
    decision = "PROBE";
    explanation = `Direction consistency ${directionConsistency.toFixed(
      2
    )} across ${turnIndex + 1} turns — Reverse Turing Probe deployed (tag=${hitTag || "n/a"}).`;
  } else if (momentum >= THRESHOLDS.watch) {
    decision = "WATCH";
    explanation = `Momentum rising (${momentum.toFixed(
      2
    )}) below probe threshold. Tag=${hitTag || "benign-baseline"}.`;
  } else {
    decision = "ALLOW";
    explanation = l0Stripped
      ? `L0: zero-width character stripped (UTS #39). Momentum ${momentum.toFixed(2)} — within normal band.`
      : `Momentum ${momentum.toFixed(2)} — within normal counseling band.`;
  }

  return {
    decision,
    risk: baseline,
    momentum: +momentum.toFixed(3),
    baseline: +baseline.toFixed(3),
    directionConsistency: +directionConsistency.toFixed(3),
    anchorScore: +anchorScore.toFixed(3),
    turnsToDetection: turnIndex + 1,
    latencyMs,
    l0Stripped,
    attackHit,
    explanation,
  };
}

/** Verifikasi SIP terhadap tantangan probe: harus tepat 8 digit. */
export function isSipNumber(content: string): boolean {
  return /^\d{8}$/.test(content.trim());
}
