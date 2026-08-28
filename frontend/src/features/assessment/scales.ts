import { GAD7_QUESTIONS, PHQ9_QUESTIONS, severityFor } from "@/lib/constants";
import type { AssessmentType } from "@/lib/types";
import { z } from "zod";

export interface ScaleDef {
  type: AssessmentType;
  title: string;
  subtitle: string;
  questions: readonly string[];
  maxScore: number;
}

export const SCALES: Record<AssessmentType, ScaleDef> = {
  "PHQ-9": {
    type: "PHQ-9",
    title: "PHQ-9 — Skrining Depresi",
    subtitle: "9 pertanyaan · menilai gejala depresi selama 2 minggu terakhir",
    questions: PHQ9_QUESTIONS,
    maxScore: 27,
  },
  "GAD-7": {
    type: "GAD-7",
    title: "GAD-7 — Skrining Kecemasan",
    subtitle: "7 pertanyaan · menilai gejala kecemasan selama 2 minggu terakhir",
    questions: GAD7_QUESTIONS,
    maxScore: 21,
  },
};

export type AnswersRecord = Record<number, number>;

/** Validasi: semua pertanyaan terjawab dengan skor valid 0–3 (Zod). */
export function answersSchema(questions: readonly string[]) {
  const schema = z
    .object({ answers: z.record(z.number().int().min(0).max(3)) })
    .refine(
      (v) => questions.every((_, i) => typeof v.answers[i] === "number"),
      { message: "Semua pertanyaan harus dijawab terlebih dahulu." }
    );
  return schema;
}

export function totalScore(answers: AnswersRecord): number {
  return Object.values(answers).reduce((sum, v) => sum + v, 0);
}

export function severityOf(type: AssessmentType, score: number): string {
  return severityFor(type, score);
}
