"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, ClipboardList, Users } from "lucide-react";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/ScreenStates";
import { listPatients } from "@/lib/api";
import { severityColor } from "@/lib/constants";
import { fixed, formatRelative } from "@/lib/format";

export default function DoctorDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["patients"],
    queryFn: listPatients,
    refetchInterval: 15000,
  });

  if (isLoading)
    return (
      <Panel label="Queue pasien" hud>
        <Skeleton rows={6} theme="dark" />
      </Panel>
    );
  if (isError)
    return (
      <Panel label="Queue pasien" hud>
        <ErrorState message={error instanceof Error ? error.message : "Gagal memuat pasien"} theme="dark" onRetry={() => void refetch()} />
      </Panel>
    );

  const patients = data ?? [];
  const flagged = patients.filter((p) => p.lastDecision === "PROBE" || p.lastDecision === "BLOCK");
  const avgRisk = patients.length
    ? patients.reduce((s, p) => s + p.lastRisk, 0) / patients.length
    : 0;
  const withAssessment = patients.filter((p) => p.latestAssessment);

  return (
    <div className="space-y-4">
      {/* Statistik */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Users size={14} />}
          label="Total pasien"
          value={String(patients.length)}
        />
        <StatTile
          icon={<ClipboardList size={14} />}
          label="Memiliki asesmen"
          value={String(withAssessment.length)}
        />
        <StatTile
          icon={<AlertTriangle size={14} />}
          label="Sesi flagged / blocked"
          value={String(flagged.length)}
          tone={flagged.length > 0 ? "block" : "allow"}
        />
        <StatTile
          icon={<span className="font-mono text-xs">ρ</span>}
          label="Rata-rata risiko terakhir"
          value={fixed(avgRisk)}
          tone={avgRisk >= 0.6 ? "block" : avgRisk >= 0.4 ? "watch" : "allow"}
        />
      </div>

      {/* Tabel pasien */}
      <Panel label="Daftar pasien & antrean sesi" flush hud>
        {patients.length === 0 ? (
          <div className="p-3">
            <EmptyState title="Belum ada pasien" theme="dark" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-soc-border font-mono text-[10px] uppercase tracking-widest text-soc-muted">
                  <th className="px-3 py-2.5 font-medium">Pasien</th>
                  <th className="px-3 py-2.5 font-medium">Terakhir aktif</th>
                  <th className="px-3 py-2.5 font-medium">Keputusan terakhir</th>
                  <th className="px-3 py-2.5 font-medium">Risiko</th>
                  <th className="px-3 py-2.5 font-medium">Asesmen terbaru</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.uid} className="border-b border-soc-border/60 text-xs last:border-0 hover:bg-soc-bg/40">
                    <td className="px-3 py-3">
                      <p className="font-medium text-soc-text">{p.name}</p>
                      <p className="font-mono text-[10px] text-soc-muted">{p.email}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-soc-muted">
                      {p.lastActivityAt ? formatRelative(p.lastActivityAt) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <DecisionBadge decision={p.lastDecision} />
                    </td>
                    <td className="tabular px-3 py-3 font-mono text-soc-text">{fixed(p.lastRisk)}</td>
                    <td className="px-3 py-3">
                      {p.latestAssessment ? (
                        <span className="font-mono text-[11px] text-soc-text">
                          {p.latestAssessment.type} {p.latestAssessment.totalScore} ·{" "}
                          <span className={severityColor(p.latestAssessment.severityLevel)}>
                            {p.latestAssessment.severityLevel}
                          </span>
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-soc-muted/60">belum ada</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/doctor/patients/${p.uid}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-blueai hover:underline"
                      >
                        Lihat <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "muted" | "allow" | "watch" | "block";
}) {
  const toneCls =
    tone === "allow"
      ? "text-allow"
      : tone === "watch"
        ? "text-watch"
        : tone === "block"
          ? "text-block"
          : "text-soc-text";
  return (
    <Panel hud>
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 items-center justify-center border border-soc-border ${toneCls}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <PanelLabel>{label}</PanelLabel>
          <p className={`tabular mt-0.5 font-mono text-xl font-bold ${toneCls}`}>{value}</p>
        </div>
      </div>
    </Panel>
  );
}
