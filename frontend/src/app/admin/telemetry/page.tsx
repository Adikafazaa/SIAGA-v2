"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Radio, Server } from "lucide-react";
import { MomentumChart } from "@/components/charts/MomentumChart";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { DecisionBadge } from "@/components/ui/DecisionBadge";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/ScreenStates";
import { aiStatus, telemetryLogs, telemetrySessions } from "@/lib/api";
import { THRESHOLDS } from "@/lib/constants";
import { asciiBar, fixed, formatDateTime, formatRelative, formatUptime, shortId } from "@/lib/format";
import type { Decision } from "@/lib/types";

type Tab = "guard" | "logs" | "ai";

const TABS: Array<{ id: Tab; num: string; label: string }> = [
  { id: "guard", num: "01", label: "Live Guard" },
  { id: "logs", num: "02", label: "Security Logs" },
  { id: "ai", num: "03", label: "Local AI Status" },
];

export default function TelemetryPage() {
  const [tab, setTab] = useState<Tab>("guard");

  return (
    <div className="space-y-4">
      {/* Sub-tab (urutan naskah, tanpa hierarki — DESIGN.md §8) */}
      <nav aria-label="Bagian telemetri" className="flex gap-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={`border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                active
                  ? "border-soc-text bg-soc-text font-bold text-soc-bg"
                  : "border-transparent text-soc-muted hover:text-soc-text"
              }`}
            >
              <span className={active ? "opacity-80" : "opacity-50"}>{t.num}</span> {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "guard" && <LiveGuardTab />}
      {tab === "logs" && <LogsTab />}
      {tab === "ai" && <AiStatusTab />}
    </div>
  );
}

// --- 01 · LIVE GUARD -------------------------------------------------------------

function LiveGuardTab() {
  const { data: sessions, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["telemetry-sessions"],
    queryFn: telemetrySessions,
    refetchInterval: 5000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => {
    if (!sessions) return null;
    return sessions.find((s) => s.sessionId === selectedId) ?? sessions[0] ?? null;
  }, [sessions, selectedId]);

  if (isLoading)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="Sesi terpantau" hud>
          <Skeleton rows={5} theme="dark" />
        </Panel>
        <Panel label="Momentum" hud>
          <Skeleton rows={5} theme="dark" />
        </Panel>
      </div>
    );
  if (isError)
    return (
      <Panel label="Live guard monitor" hud>
        <ErrorState message={error instanceof Error ? error.message : "Gagal memuat telemetri"} theme="dark" onRetry={() => void refetch()} />
      </Panel>
    );

  const list = sessions ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Daftar sesi */}
      <Panel label={`Sesi terpantau (${list.length})`} flush hud className="lg:col-span-2">
        {list.length === 0 ? (
          <div className="p-3">
            <EmptyState title="Tidak ada sesi aktif" theme="dark" />
          </div>
        ) : (
          <ul className="max-h-[420px] divide-y divide-soc-border/60 overflow-y-auto">
            {list.map((s) => {
              const active = selected?.sessionId === s.sessionId;
              const blocked = s.status === "blocked";
              return (
                <li key={s.sessionId}>
                  <button
                    onClick={() => setSelectedId(s.sessionId)}
                    className={`w-full border-l-4 px-3 py-2.5 text-left transition-colors ${
                      active ? "bg-soc-bg/70" : "hover:bg-soc-bg/40"
                    } ${
                      blocked
                        ? "border-block bg-block/5"
                        : s.status === "flagged"
                          ? "border-probe"
                          : "border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-soc-text">{s.patientName}</p>
                      <DecisionBadge decision={s.lastDecision} />
                    </div>
                    <p className="mt-1 flex items-center justify-between font-mono text-[10px] text-soc-muted">
                      <span className="truncate">{shortId(s.sessionId, 14)}</span>
                      <span>
                        {s.turns} turn · {formatRelative(s.lastActivityAt)}
                      </span>
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Detail sesi terpilih */}
      <Panel
        label={selected ? `Signal breakdown · ${selected.patientName}` : "Signal breakdown"}
        actions={
          selected ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-soc-muted">{shortId(selected.sessionId, 16)}</span>
              <DecisionBadge decision={selected.lastDecision} score={selected.lastRisk} />
            </span>
          ) : undefined
        }
        hud
        className="lg:col-span-3"
      >
        {selected ? (
          <div className="space-y-4">
            <MomentumChart data={selected.history} height={230} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
              <SignalRow k="Momentum CIM" v={selected.history[selected.history.length - 1]?.momentum ?? 0} />
              <SignalRow k="Arah konsisten" v={selected.directionConsistency} />
              <SignalRow k="Anchor score" v={selected.anchorScore} />
              <SignalRow k="Baseline (stateless)" v={selected.lastRisk} />
            </div>
            <div className="border-t border-soc-border pt-3">
              <PanelLabel>Latensi per lapis (turn terakhir)</PanelLabel>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-soc-muted">
                L0 <span className="text-soc-text">—</span> L1{" "}
                <span className="text-soc-text">ONNX INT8</span> · CIM{" "}
                <span className="text-soc-text">graph</span> · total &lt; 60 ms (p95 target)
              </p>
            </div>
            <p className="border border-soc-border bg-soc-bg/60 px-3 py-2 font-mono text-[10px] leading-relaxed text-soc-muted">
              Ambang: WATCH ≥ {THRESHOLDS.watch} · PROBE ≥ {THRESHOLDS.probe} · BLOCK ≥ {THRESHOLDS.block}
            </p>
          </div>
        ) : (
          <EmptyState title="Pilih sesi untuk melihat kurva momentum" theme="dark" />
        )}
      </Panel>
    </div>
  );
}

function SignalRow({ k, v }: { k: string; v: number }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-soc-muted">{k}</p>
      <p className="tabular font-mono text-lg text-soc-text">{fixed(v)}</p>
      <p className="font-mono text-[10px] tracking-wider text-soc-muted" aria-hidden>
        {asciiBar(v, 10)}
      </p>
    </div>
  );
}

// --- 02 · SECURITY LOGS ------------------------------------------------------------

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "ALL — semua keputusan" },
  { value: "ALLOW", label: "○ ALLOW — lolos" },
  { value: "WATCH", label: "◔ WATCH — waspada" },
  { value: "PROBE", label: "⚡ PROBE — interogasi" },
  { value: "BLOCK", label: "● BLOCK — diblokir" },
];

function LogsTab() {
  const [filter, setFilter] = useState<string>("ALL");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["telemetry-logs"],
    queryFn: telemetryLogs,
    refetchInterval: 5000,
  });

  if (isLoading)
    return (
      <Panel label="Log insiden" hud>
        <Skeleton rows={6} theme="dark" />
      </Panel>
    );
  if (isError)
    return (
      <Panel label="Log insiden" hud>
        <ErrorState message={error instanceof Error ? error.message : "Gagal memuat log"} theme="dark" onRetry={() => void refetch()} />
      </Panel>
    );

  const logs = (data ?? []).filter((l) => filter === "ALL" || l.decision === (filter as Decision));

  return (
    <Panel
      label={`Log insiden keamanan (${logs.length})`}
      flush
      hud
      actions={
        <div className="w-44">
          <Select theme="dark" value={filter} onChange={setFilter} options={FILTERS} aria-label="Filter keputusan" />
        </div>
      }
    >
      {logs.length === 0 ? (
        <div className="p-3">
          <EmptyState title="Tidak ada log pada filter ini" theme="dark" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-soc-border font-mono text-[10px] uppercase tracking-widest text-soc-muted">
                <th className="px-3 py-2.5 font-medium">Waktu</th>
                <th className="px-3 py-2.5 font-medium">Sesi</th>
                <th className="px-3 py-2.5 font-medium">Pasien</th>
                <th className="px-3 py-2.5 font-medium">Keputusan</th>
                <th className="px-3 py-2.5 font-medium">Risiko</th>
                <th className="px-3 py-2.5 font-medium">Total ms</th>
                <th className="px-3 py-2.5 font-medium">Penjelasan</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr
                  key={l.logId}
                  className={`border-b border-soc-border/60 text-xs last:border-0 ${
                    l.decision === "BLOCK" ? "bg-block/10" : l.decision === "PROBE" ? "bg-probe/5" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-soc-muted">
                    {formatDateTime(l.timestamp)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-soc-muted">{shortId(l.sessionId, 12)}</td>
                  <td className="px-3 py-2.5 text-soc-text">{l.patientName}</td>
                  <td className="px-3 py-2.5">
                    <DecisionBadge decision={l.decision} score={l.riskScore} />
                  </td>
                  <td className="tabular px-3 py-2.5 font-mono text-soc-text">{fixed(l.riskScore)}</td>
                  <td className="tabular px-3 py-2.5 font-mono text-soc-muted">
                    {l.latencyMs ? fixed(l.latencyMs.total, 1) : "—"}
                  </td>
                  <td className="max-w-md px-3 py-2.5 font-mono text-[10px] text-soc-muted" title={l.explanation}>
                    <span className="line-clamp-2">{l.explanation}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// --- 03 · LOCAL AI STATUS ------------------------------------------------------------

function AiStatusTab() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ai-status"],
    queryFn: aiStatus,
    refetchInterval: 10000,
  });

  if (isLoading)
    return (
      <Panel label="Status Local AI" hud>
        <Skeleton rows={4} theme="dark" />
      </Panel>
    );
  if (isError || !data)
    return (
      <Panel label="Status Local AI" hud>
        <ErrorState message={error instanceof Error ? error.message : "Server LLM tidak merespons"} theme="dark" onRetry={() => void refetch()} />
      </Panel>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Panel label="Server LLM" hud>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-1.5 w-1.5 ${data.online ? "bg-allow" : "bg-block"}`}
              aria-hidden
            />
            <span className={`font-mono text-xs uppercase tracking-wider ${data.online ? "text-allow" : "text-block"}`}>
              {data.online ? "Online" : "Offline"}
            </span>
            <Server size={13} className="ml-auto text-soc-muted" />
          </div>
          <KV k="Model" v={data.model} />
          <KV k="Endpoint (.env)" v={data.endpoint} mono />
        </div>
      </Panel>

      <Panel label="Performa" hud>
        <div className="space-y-3">
          <KV k="Latensi LLM (p95)" v={`${data.latencyP95Ms} ms`} mono />
          <KV k="Guardrail (p95)" v={`${data.guardrailLatencyP95Ms} ms`} mono tone={data.guardrailLatencyP95Ms > 60 ? "warn" : "ok"} />
          <KV k="Token throughput" v={`${data.tokensPerSec} tok/s`} mono />
          <KV k="Uptime" v={formatUptime(data.uptimeSec)} mono />
        </div>
      </Panel>

      <Panel label="Catatan operasi" hud>
        <ul className="space-y-2 text-xs leading-relaxed text-soc-muted">
          <li className="flex gap-2">
            <span className="text-allow">○</span>
            Target latensi guardrail inline &lt; 60 ms (p95, CPU ONNX INT8).
          </li>
          <li className="flex gap-2">
            <span className="text-allow">○</span>
            Session cache hanya menyimpan hash SHA-256 & vektor float — tanpa plaintext.
          </li>
          <li className="flex gap-2">
            <span className="text-allow">○</span>
            Endpoint & model diatur lewat environment backend, tidak di-frontend.
          </li>
        </ul>
        <p className="mt-3 flex items-center gap-2 border-t border-soc-border pt-3 font-mono text-[10px] uppercase tracking-wider text-soc-muted">
          <Radio size={11} className="text-allow" />
          <Activity size={11} className="text-allow" />
          Refetch otomatis tiap 10 dtk
        </p>
      </Panel>
    </div>
  );
}

function KV({ k, v, mono, tone }: { k: string; v: string; mono?: boolean; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-soc-muted">{k}</span>
      <span
        className={`text-right text-xs ${mono ? "tabular font-mono" : ""} ${
          tone === "warn" ? "text-watch" : tone === "ok" ? "text-allow" : "text-soc-text"
        }`}
      >
        {v}
      </span>
    </div>
  );
}
