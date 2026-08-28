"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Theme = "light" | "dark";

export interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  theme?: Theme;
}

function fieldClass(theme: Theme, invalid?: boolean): string {
  if (theme === "dark") {
    return `w-full rounded-none border bg-soc-bg px-3 py-2 font-mono text-xs text-soc-text placeholder:text-soc-muted/50 focus:outline-none focus:ring-1 ${
      invalid ? "border-block focus:ring-block" : "border-soc-border focus:ring-probe"
    }`;
  }
  return `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
    invalid ? "border-red-400 focus:ring-red-200" : "border-slate-300 focus:ring-blue-200 focus:border-care-blue"
  }`;
}

export const Input = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  function Input({ label, error, hint, theme = "light", className = "", ...rest }, ref) {
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
        <input ref={ref} className={fieldClass(theme, Boolean(error))} {...rest} />
        {hint && !error && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
        {error && (
          <span className="mt-1 block text-[11px] text-red-600" role="alert">
            {error}
          </span>
        )}
      </label>
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ label, error, hint, theme = "light", className = "", ...rest }, ref) {
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
      <textarea ref={ref} className={`${fieldClass(theme, Boolean(error))} resize-none`} {...rest} />
      {hint && !error && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
      {error && (
        <span className="mt-1 block text-[11px] text-red-600" role="alert">
          {error}
        </span>
      )}
    </label>
  );
});
