"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
import { MomentumChart } from "@/components/charts/MomentumChart";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/ScreenStates";
import { patientDetail } from "@/lib/api";
import { severityColor } from "@/lib/constants";
import { asciiBar, fixed, formatDateTime, formatRelative, shortId } from "@/lib/format";

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const uid = params.id;

  const { data: patient, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["patient", uid],
    queryFn: () => patientDetail(uid),
    refetchInterval: 15000,
  });

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton rows={2} theme="dark" />
        <Skeleton rows={5} theme="dark" />
      </div>
    );
  if (isError || !patient)
    return (
      <Panel label="Profil pasien" hud>
        <ErrorState message={error instanceof Error ? error.message : "Pasien tidak ditemukan"} theme="dark" onRetry={() => void refetch()} />
      </Panel>
    );

  const latestSession = patient.sessions[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/doctor/dashboard"
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-soc-muted hover:text-soc-text"
        >
          <ArrowLeft size={12} /> Dashboard
        </Link>
        {patient.lastDecision === "BLOCK" && (
          <span className="border border-block/50 bg-block/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-block">
            ● Sesi terakhir terblokir
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Kolom identitas */}
        <div className="space-y-4">
          <Panel label="Identitas pasien" hud>
            <div className="space-y-2.5 text-xs">
              <Row k="Nama" v={patient.name} strong />
              <Row k="Email" v={patient.email} mono />
              <Row k="Terakhir aktif" v={patient.lastActivityAt ? formatRelative(patient.lastActivityAt) : "—"} mono />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-soc-muted">Keputusan</span>
                <DecisionBadge decision={patient.lastDecision} score={patient.lastRisk} />
              </div>
            </div>
          </Panel>

          <Panel label="Rekam medis (terenkripsi)" hud>
            <div className="flex items-start gap-2">
              <FileText size={13} className="mt-0.5 shrink-0 text-soc-muted" />
              <p className="text-xs leading-relaxed text-soc-text">{patient.notes}</p>
            </div>
            <p className="mt-3 font-mono text-[10px] text-soc-muted/70">
              Diperbarui {formatDateTime(patient.notesUpdatedAt)}
            </p>
          </Panel>
        </div>

        {/* Kolom telemetri & asesmen */}
        <div className="space-y-4 lg:col-span-2">
          <Panel
            label={latestSession ? `Kurva momentum · ${latestSession.title}` : "Kurva momentum"}
            actions={
              latestSession ? (
                <span className="font-mono text-[10px] text-soc-muted">
                  {latestSession.history.length} turn
                </span>
              ) : undefined
            }
            hud
          >
            {latestSession ? (
              <div className="space-y-3">
                <MomentumChart data={latestSession.history} />
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
                  <Signal k="Momentum" v={latestSession.lastRisk} bar={latestSession.history[latestSession.history.length - 1]?.momentum ?? 0} />
                  <Signal k="Arah konsisten" v={latestSession.directionConsistency} bar={latestSession.directionConsistency} />
                  <Signal k="Anchor" v={latestSession.anchorScore} bar={latestSession.anchorScore} />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-soc-muted">Turn</p>
                    <p className="tabular font-mono text-sm text-soc-text">{latestSession.turns}</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="Belum ada sesi" hint="Pasien belum memulai sesi konseling." theme="dark" />
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel label="Riwayat asesmen" flush hud>
              {patient.assessments.length === 0 ? (
                <div className="p-3">
                  <EmptyState title="Belum ada asesmen" theme="dark" />
                </div>
              ) : (
                <ul className="divide-y divide-soc-border/60">
                  {patient.assessments.map((a) => (
                    <li key={a.assessmentId} className="flex items-center justify-between px-3 py-2.5 text-xs">
                      <div>
                        <p className="font-medium text-soc-text">{a.type}</p>
                        <p className="font-mono text-[10px] text-soc-muted">{formatDateTime(a.completedAt)}</p>
                      </div>
                      <p className="font-mono">
                        <span className="tabular text-sm text-soc-text">{a.totalScore}</span>{" "}
                        <span className={severityColor(a.severityLevel)}>{a.severityLevel}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel label="Log keamanan (pasien ini)" flush hud>
              {patient.logs.length === 0 ? (
                <div className="p-3">
                  <EmptyState title="Tidak ada insiden" hint="Tidak ada entri log keamanan untuk pasien ini." theme="dark" />
                </div>
              ) : (
                <ul className="divide-y divide-soc-border/60">
                  {patient.logs.map((l) => (
                    <li key={l.logId} className="px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-soc-muted">
                          {shortId(l.logId, 10)} · {formatDateTime(l.timestamp)}
                        </span>
                        <DecisionBadge decision={l.decision} score={l.riskScore} />
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-soc-muted" title={l.explanation}>
                        {l.explanation}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, strong, mono }: { k: string; v: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-soc-muted">{k}</span>
      <span
        className={`truncate text-right ${strong ? "font-medium text-soc-text" : "text-soc-text"} ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {v}
      </span>
    </div>
  );
}

function Signal({ k, v, bar }: { k: string; v: number; bar: number }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-soc-muted">{k}</p>
      <p className="tabular font-mono text-sm text-soc-text">{fixed(v)}</p>
      <p className="font-mono text-[10px] text-soc-muted" aria-hidden>
        {asciiBar(bar, 8)}
      </p>
    </div>
  );
}
