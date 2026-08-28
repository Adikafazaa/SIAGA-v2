"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Theme = "light" | "dark";
type Variant = "primary" | "secondary" | "danger" | "probe" | "solid";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: Theme;
  variant?: Variant;
  /** Bungkus label dengan tanda [ ] — gaya tombol konsol (DESIGN.md §5.3) */
  bracket?: boolean;
  size?: Size;
}

const LIGHT: Record<Variant, string> = {
  primary: "bg-care-blue text-white hover:bg-blue-700",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  probe: "bg-probe text-white hover:bg-purple-700",
  solid: "bg-slate-900 text-white hover:bg-slate-800",
};

// Konsol SOC: mono uppercase, tajam, tracking-wider (DESIGN.md §7.1)
const DARK: Record<Variant, string> = {
  primary: "bg-allow text-white hover:opacity-90",
  secondary: "border border-soc-border bg-transparent text-soc-muted hover:text-soc-text",
  danger: "border border-redai/50 bg-transparent text-redai hover:bg-redai/10",
  probe: "bg-probe text-white hover:opacity-90",
  solid: "bg-soc-text text-soc-bg hover:opacity-90",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { theme = "light", variant = "primary", bracket = false, size = "md", className = "", children, ...rest },
  ref
) {
  const palette = theme === "dark" ? DARK : LIGHT;
  const shape =
    theme === "dark"
      ? "rounded-none font-mono text-xs tracking-wider uppercase"
      : "rounded-lg font-medium text-sm";
  const sizing = size === "sm" ? "px-2.5 py-1" : "px-4 py-2";
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${shape} ${sizing} ${palette[variant]} ${className}`}
      {...rest}
    >
      {bracket && <span className="opacity-50">[</span>}
      {children}
      {bracket && <span className="opacity-50">]</span>}
    </button>
  );
});
