import { DECISION_META, riskIcon } from "@/lib/constants";
import type { Decision } from "@/lib/types";
import { fixed } from "@/lib/format";

const DARK_STYLE: Record<Decision, string> = {
  ALLOW: "border-allow/40 bg-allow/10 text-allow",
  WATCH: "border-watch/40 bg-watch/10 text-watch",
  PROBE: "border-probe/50 bg-probe/10 text-probe",
  BLOCK: "border-block/50 bg-block/10 text-block",
};

const LIGHT_STYLE: Record<Decision, string> = {
  ALLOW: "border-green-200 bg-green-50 text-green-700",
  WATCH: "border-yellow-300 bg-yellow-50 text-yellow-700",
  PROBE: "border-purple-200 bg-purple-50 text-purple-700",
  BLOCK: "border-red-200 bg-red-50 text-red-700",
};

export interface DecisionBadgeProps {
  decision: Decision;
  score?: number;
  theme?: "light" | "dark";
  /** tampilkan skor numerik berdampingan ikon derajat */
  showScore?: boolean;
  className?: string;
}

/**
 * Badge keputusan guardrail + ikon derajat.
 * Warna tidak pernah satu-satunya penanda — selalu ada ikon & label teks (WCAG AA).
 */
export function DecisionBadge({ decision, score, theme = "dark", showScore = true, className = "" }: DecisionBadgeProps) {
  const meta = DECISION_META[decision];
  const style = theme === "dark" ? DARK_STYLE[decision] : LIGHT_STYLE[decision];
  const icon = decision === "PROBE" ? meta.icon : score !== undefined ? riskIcon(score) : meta.icon;
  return (
    <span
      title={`decision=${decision}${score !== undefined ? ` score=${fixed(score)}` : ""}`}
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        theme === "dark" ? "" : "rounded-full"
      } ${style} ${className}`}
    >
      <span aria-hidden>{icon}</span>
      {meta.label}
      {showScore && score !== undefined && <span className="tabular">{fixed(score)}</span>}
    </span>
  );
}
