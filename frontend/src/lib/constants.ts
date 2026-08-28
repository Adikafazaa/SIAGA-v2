import type { Decision } from "./types";

// --- Keputusan guardrail & gaya visual (DESIGN.md §2.1, §7) -----------------

export const THRESHOLDS = {
  watch: 0.45,
  probe: 0.6,
  block: 0.8,
} as const;

/** Ikon derajat risiko per skor (DESIGN.md §7.1 — warna tidak pernah satu-satunya penanda) */
export function riskIcon(score: number): string {
  if (score >= 0.8) return "●";
  if (score >= 0.6) return "◕";
  if (score >= 0.4) return "◑";
  if (score >= 0.2) return "◔";
  return "○";
}

export const DECISION_META: Record<
  Decision,
  { label: string; icon: string; description: string }
> = {
  ALLOW: {
    label: "ALLOW",
    icon: "○",
    description: "Percakapan lolos — momentum risiko rendah",
  },
  WATCH: {
    label: "WATCH",
    icon: "◔",
    description: "Arah risiko naik konsisten di bawah ambang probe",
  },
  PROBE: {
    label: "PROBE",
    icon: "⚡",
    description: "Reverse Turing Probe aktif — tantangan otorisasi SIP",
  },
  BLOCK: {
    label: "BLOCK",
    icon: "●",
    description: "Ambang kumulatif terlampaui — akses dibatasi",
  },
};

// --- Skala klinik -------------------------------------------------------------

export const RESPONSE_OPTIONS = [
  { value: 0, label: "Tidak pernah" },
  { value: 1, label: "Beberapa hari" },
  { value: 2, label: "Lebih dari separuh hari" },
  { value: 3, label: "Hampir setiap hari" },
] as const;

export const PHQ9_QUESTIONS = [
  "Minat atau kesenangan melakukan hal yang biasanya dinikmati berkurang",
  "Merasa sedih, depresi, atau putus asa",
  "Sulit tidur, terbangun terlalu awal, atau tidur berlebihan",
  "Merasa lelah atau tidak memiliki energi",
  "Nafsu makan atau berat badan berubah",
  "Merasa bersalah tentang diri sendiri atau sesuatu yang sudah dilakukan",
  "Sulit berkonsentrasi pada sesuatu",
  "Gerak atau bicara sangat lambat, atau gelisah hingga orang lain menyadarinya",
  "Berpikir bahwa lebih baik mati atau menyakiti diri sendiri",
] as const;

export const GAD7_QUESTIONS = [
  "Merasa cemas, gelisah, atau mudah tegang",
  "Tidak mampu menghentikan atau mengendalikan rasa cemas",
  "Khawatir berlebihan tentang berbagai hal",
  "Sulit untuk rileks",
  "Rasa gelisah sehingga tidak bisa diam",
  "Mudah tersinggung atau mudah marah",
  "Merasa takut akan hal buruk yang mungkin terjadi",
] as const;

export function phq9Severity(score: number): string {
  if (score <= 4) return "Minimal";
  if (score <= 9) return "Ringan";
  if (score <= 14) return "Sedang";
  if (score <= 19) return "Sedang-berberat";
  return "Berat";
}

export function gad7Severity(score: number): string {
  if (score <= 4) return "Minimal";
  if (score <= 9) return "Ringan";
  if (score <= 14) return "Sedang";
  return "Berat";
}

export function severityFor(type: "PHQ-9" | "GAD-7", score: number): string {
  return type === "PHQ-9" ? phq9Severity(score) : gad7Severity(score);
}

export function severityColor(severity: string): string {
  if (severity === "Berat" || severity === "Sedang-berberat") return "text-block";
  if (severity === "Sedang") return "text-probe";
  if (severity === "Ringan") return "text-watch";
  return "text-allow";
}

export const SPECIALIZATIONS = [
  "Psikiatri Dewasa",
  "Psikiatri Anak & Remaja",
  "Psikoterapi Kognitif Perilaku (CBT)",
  "Konseling Keluarga",
  "Adiksi & Gangguan Pemulihan",
  "Gerontopsikiatri",
] as const;

export const COUNSELING_PREFERENCES = [
  "CBT (Kognitif Perilaku)",
  "Mindfulness",
  "Psikoedukasi",
  "Konseling Terbuka",
] as const;

export const TIME_SLOTS = [
  "Pagi (08.00–12.00)",
  "Siang (12.00–15.00)",
  "Sore (15.00–18.00)",
  "Malam (18.00–21.00)",
] as const;

// --- Navigasi -----------------------------------------------------------------

export const ROLE_HOME: Record<string, string> = {
  patient: "/chat",
  doctor: "/doctor/dashboard",
  admin: "/admin/telemetry",
};

export const DEMO_ACCOUNTS = [
  { label: "Pasien demo", email: "pasien@demo.siaga", password: "demo1234" },
  { label: "Dokter demo", email: "dokter@demo.siaga", password: "demo1234" },
  { label: "SOC / Admin", email: "admin@demo.siaga", password: "demo1234" },
] as const;
