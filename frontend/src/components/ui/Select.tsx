"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  theme?: "light" | "dark";
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange?: (value: string) => void;
}

/** Satu class untuk semua dropdown (DESIGN.md §7.1) */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, theme = "light", options, placeholder, onChange, className = "", ...rest },
  ref
) {
  const base =
    theme === "dark"
      ? `w-full rounded-none border bg-soc-bg px-3 py-2 font-mono text-xs text-soc-text focus:outline-none focus:ring-1 ${
          error ? "border-block focus:ring-block" : "border-soc-border focus:ring-probe"
        }`
      : `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
          error ? "border-red-400 focus:ring-red-200" : "border-slate-300 focus:ring-blue-200 focus:border-care-blue"
        }`;
  return (
    <label className={`block ${className}`}>
      {label && (
        <span
          className={
            theme === "dark"
              ? "mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-soc-muted"
              : "mb-1.5 block text-xs font-medium text-slate-600"
          }
        >
          {label}
        </span>
      )}
      <select
        ref={ref}
        className={base}
        value={String(rest.value ?? "")}
        onChange={(e) => onChange?.(e.target.value)}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="mt-1 block text-[11px] text-red-600" role="alert">
          {error}
        </span>
      )}
    </label>
  );
});
