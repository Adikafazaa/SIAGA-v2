"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/ScreenStates";
import { Guard } from "@/features/auth/role-guard";
import { useAuth } from "@/features/auth/auth-provider";
import { SCALES, answersSchema, severityOf, totalScore, type AnswersRecord } from "@/features/assessment/scales";
import { RESPONSE_OPTIONS, severityColor } from "@/lib/constants";
import { listAssessments, saveAssessment } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Assessment, AssessmentType } from "@/lib/types";

export default function AssessmentsPage() {
  return (
    <Guard roles={["patient"]}>
      <AppShell>
        <AssessmentsWorkspace />
      </AppShell>
    </Guard>
  );
}

type View = { name: "list" } | { name: "form"; type: AssessmentType } | { name: "result"; assessment: Assessment };

function AssessmentsWorkspace() {
  const [view, setView] = useState<View>({ name: "list" });

  return (
    <div className="space-y-6">
      {view.name === "list" && <ScaleList onStart={(type) => setView({ name: "form", type })} />}
      {view.name === "form" && (
        <ScaleForm
          type={view.type}
          onBack={() => setView({ name: "list" })}
          onDone={(a) => setView({ name: "result", assessment: a })}
        />
      )}
      {view.name === "result" && (
        <ScaleResult assessment={view.assessment} onBack={() => setView({ name: "list" })} />
      )}
    </div>
  );
}

function ScaleList({ onStart }: { onStart: (t: AssessmentType) => void }) {
  const [tab, setTab] = useState<"form" | "history">("form");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-semibold text-slate-900">Asesmen Klinis Mandiri</h1>
        <p className="text-xs text-slate-500">
          Skrining terstandar untuk membantu Anda dan klinisi memahami kondisi saat ini.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1 w-fit">
        {(
          [
            { id: "form", label: "Isi Skrining" },
            { id: "history", label: "Riwayat" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "form" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(SCALES) as AssessmentType[]).map((t) => {
            const s = SCALES[t];
            return (
              <Card key={t}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-care-blue">
                    <ClipboardList size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">{s.title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{s.subtitle}</p>
                    <p className="mt-2 font-mono text-[11px] text-slate-400">
                      Skala 0–{s.maxScore} · ±2 menit
                    </p>
                    <Button size="sm" className="mt-4" onClick={() => onStart(t)}>
                      Mulai Asesmen
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <HistoryTable />
      )}
    </div>
  );
}

function HistoryTable() {
  const user = useAuth().user!;
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["assessments", user.uid],
    queryFn: () => listAssessments(user.uid),
  });

  if (isLoading) return <Skeleton rows={3} theme="light" />;
  if (isError)
    return <ErrorState message={error instanceof Error ? error.message : "Gagal memuat riwayat"} theme="light" onRetry={() => void refetch()} />;
  if (!data || data.length === 0)
    return <EmptyState title="Belum ada riwayat asesmen" hint="Hasil skrining Anda akan tercatat di sini setelah selesai." theme="light" />;

  return (
    <Card pad={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-medium">Jenis</th>
              <th className="px-5 py-3 font-medium">Skor</th>
              <th className="px-5 py-3 font-medium">Tingkat</th>
              <th className="px-5 py-3 font-medium">Selesai</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.assessmentId} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-800">{a.type}</td>
                <td className="px-5 py-3 font-mono text-slate-700">
                  {a.totalScore}
                  <span className="text-slate-400"> / {SCALES[a.type].maxScore}</span>
                </td>
                <td className={`px-5 py-3 font-medium ${severityColor(a.severityLevel)}`}>{a.severityLevel}</td>
                <td className="px-5 py-3 text-slate-500">{formatDate(a.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ScaleForm({
  type,
  onBack,
  onDone,
}: {
  type: AssessmentType;
  onBack: () => void;
  onDone: (a: Assessment) => void;
}) {
  const scale = SCALES[type];
  const user = useAuth().user!;
  const [answers, setAnswers] = useState<AnswersRecord>({});
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const answered = Object.keys(answers).length;

  async function submitFinal() {
    const parsed = answersSchema(scale.questions).safeParse({ answers });
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? "Jawaban tidak valid");
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const score = totalScore(answers);
      const severity = severityOf(type, score);
      const saved = await saveAssessment(
        user.uid,
        type,
        Object.fromEntries(Object.entries(answers).map(([k, v]) => [Number(k), v])),
        score,
        severity
      );
      onDone(saved);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Gagal menyimpan hasil.");
      setSaving(false);
    }
  }

  return (
    <Card>
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={13} /> Kembali
      </button>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{scale.title}</h2>
        <span className="font-mono text-[11px] text-slate-400">
          {index + 1} / {scale.questions.length}
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-care-blue transition-all"
          style={{ width: `${(answered / scale.questions.length) * 100}%` }}
        />
      </div>

      <fieldset>
        <legend className="text-sm leading-relaxed text-slate-800">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {index + 1}. Dalam 2 minggu terakhir, seberapa sering Anda…
          </span>
          {scale.questions[index]}
        </legend>
        <div className="mt-4 grid gap-2">
          {RESPONSE_OPTIONS.map((opt) => {
            const on = answers[index] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setAnswers((cur) => ({ ...cur, [index]: opt.value }));
                  setSubmitError(null);
                }}
                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                  on ? "border-care-blue bg-blue-50 text-care-blue" : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                {opt.label}
                <span className={`font-mono text-[11px] ${on ? "text-care-blue" : "text-slate-400"}`}>
                  {opt.value}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {submitError && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {submitError}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || saving}>
          <ArrowLeft size={13} /> Sebelumnya
        </Button>
        {index < scale.questions.length - 1 ? (
          <Button size="sm" onClick={() => setIndex((i) => i + 1)} disabled={answers[index] === undefined}>
          Lanjut
          </Button>
        ) : (
          <Button size="sm" onClick={() => void submitFinal()} disabled={saving}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            <CheckCircle2 size={13} /> Selesai & Simpan
          </Button>
        )}
      </div>
    </Card>
  );
}

function ScaleResult({ assessment, onBack }: { assessment: Assessment; onBack: () => void }) {
  const scale = SCALES[assessment.type];
  const ratio = assessment.totalScore / scale.maxScore;
  return (
    <Card className="text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
        Hasil {assessment.type} · {formatDateTime(assessment.completedAt)}
      </p>
      <p className="mt-4 font-mono text-5xl font-bold tabular text-slate-900">
        {assessment.totalScore}
        <span className="text-lg text-slate-400"> / {scale.maxScore}</span>
      </p>
      <p className={`mt-3 text-sm font-semibold ${severityColor(assessment.severityLevel)}`}>
        Tingkat: {assessment.severityLevel}
      </p>
      <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${ratio >= 0.6 ? "bg-red-500" : ratio >= 0.4 ? "bg-purple-500" : ratio >= 0.2 ? "bg-yellow-500" : "bg-green-500"}`}
          style={{ width: `${Math.max(4, ratio * 100)}%` }}
        />
      </div>
      <p className="mx-auto mt-5 max-w-md text-xs leading-relaxed text-slate-600">
        Skor ini adalah alat skrining, bukan diagnosis. Hasil telah tercatat di riwayat Anda dan dapat
        dilihat oleh dokter/psikolog yang Anda konsultasikan. Bila skor menunjukkan tingkat sedang–berat,
        sangat disarankan mengikuti sesi konseling lebih lanjut.
      </p>
      <Button className="mt-6" onClick={onBack}>
        Kembali ke Beranda Asesmen
      </Button>
    </Card>
  );
}
