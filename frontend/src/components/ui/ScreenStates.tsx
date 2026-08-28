"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";

type Theme = "light" | "dark";

export function FullScreenLoader({ label = "Memuat sesi SIAGA…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-care-bg">
      <span className="font-mono text-lg tracking-widest text-slate-800">
        SIAGA<span className="blink-cursor" />
      </span>
      <span role="status" className="text-xs text-slate-500">
        {label}
      </span>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  theme = "light",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  theme?: Theme;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 border border-dashed px-6 py-10 text-center ${
        theme === "dark" ? "border-soc-border text-soc-muted" : "border-slate-300 text-slate-500"
      }`}
    >
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-sm text-xs opacity-80">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  theme = "light",
}: {
  message: string;
  onRetry?: () => void;
  theme?: Theme;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 border px-6 py-8 text-center ${
        theme === "dark"
          ? "border-block/50 bg-block/10 text-soc-text"
          : "border-red-300 bg-red-50 text-red-800"
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-wider">● Gagal memuat data</p>
      <p className="text-xs opacity-90">{message}</p>
      {onRetry && (
        <Button theme={theme} variant="secondary" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ rows = 3, theme = "light", className = "" }: { rows?: number; theme?: Theme; className?: string }) {
  const color = theme === "dark" ? "bg-soc-border/60" : "bg-slate-200";
  return (
    <div className={`space-y-2 ${className}`} aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`h-8 animate-pulse ${color}`} style={{ width: `${100 - (i % 3) * 14}%` }} />
      ))}
    </div>
  );
}
