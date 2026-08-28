import type { ReactNode } from "react";

/** Label bracket konsol: [ LABEL ] — mono 10px uppercase (DESIGN.md §5.2) */
export function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-soc-muted">
      <span className="opacity-50">[ </span>
      {children}
      <span className="opacity-50"> ]</span>
    </span>
  );
}

export interface PanelProps {
  label?: string;
  actions?: ReactNode;
  /** Tanpa padding body — untuk tabel/feed penuh */
  flush?: boolean;
  /** Nonaktifkan kurung HUD di pojok */
  hud?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Panel konsol SOC — satu-satunya wadah panel di area gelap.
 * Permukaan soc-panel, border 1px soc-border, kurung HUD 4 pojok (DESIGN.md §7.1).
 */
export function Panel({ label, actions, flush = false, hud = true, className = "", children }: PanelProps) {
  return (
    <section className={`border border-soc-border bg-soc-panel ${hud ? "hud-corners" : ""} ${className}`}>
      {label && (
        <header className="flex items-center justify-between gap-2 border-b border-soc-border px-3 py-2">
          <PanelLabel>{label}</PanelLabel>
          {actions}
        </header>
      )}
      <div className={flush ? "" : "p-3"}>{children}</div>
    </section>
  );
}
