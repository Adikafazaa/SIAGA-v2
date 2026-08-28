"use client";

import { useEffect, useState } from "react";
import { currentMode, ensureApiMode, onModeChange } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";

/** LED 6px tanpa radius (DESIGN.md §5.5) + label — jujur soal sumber data. */
function Led({ color, on }: { color: "allow" | "block" | "watch"; on: boolean }) {
  const cls = on
    ? color === "allow"
      ? "bg-allow"
      : color === "block"
        ? "bg-block"
        : "bg-watch"
    : "bg-soc-muted/40";
  return <span className={`inline-block h-1.5 w-1.5 ${cls}`} aria-hidden />;
}

export function ModeBadges() {
  const [mode, setMode] = useState(currentMode());
  const { isMockAuth } = useAuth();

  useEffect(() => {
    void ensureApiMode();
    return onModeChange(setMode);
  }, []);

  return (
    <div className="flex items-center gap-3" role="status">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-soc-muted">
        <Led color={mode === "live" ? "allow" : "block"} on />
        {mode === "live" ? "API live" : "API mock"}
      </span>
      {isMockAuth && (
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-soc-muted">
          <Led color="watch" on />
          auth demo
        </span>
      )}
    </div>
  );
}
