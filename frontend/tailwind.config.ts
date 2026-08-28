import type { Config } from "tailwindcss";
import { CARE, DECISION, SOC, TEAM } from "./src/theme/colors";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palet keputusan (DESIGN.md §2.1 — mengikat)
        allow: DECISION.allow,
        watch: DECISION.watch,
        probe: DECISION.probe,
        block: DECISION.block,
        // Permukaan konsol SOC (DESIGN.md §2.2)
        "soc-bg": SOC.bg,
        "soc-panel": SOC.panel,
        "soc-border": SOC.border,
        "soc-text": SOC.text,
        "soc-muted": SOC.muted,
        // Penanda tim (DESIGN.md §2.3)
        redai: TEAM.redai,
        blueai: TEAM.blueai,
        nonnovel: TEAM.nonnovel,
        // Antarmuka pasien (design_system.md)
        "care-blue": CARE.primary,
        "care-bg": CARE.bgLight,
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      minHeight: {
        screen: "100dvh",
      },
    },
  },
  plugins: [],
};

export default config;
