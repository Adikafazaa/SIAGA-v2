"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { ModeBadges } from "./ModeBadge";

export interface ConsoleNavItem {
  href: string;
  label: string;
  num: string;
}

/**
 * Shell konsol SOC — gelap, tajam, font Montserrat + data JetBrains Mono.
 * (DESIGN.md §8: tab mono 11px uppercase bernomor, aktif = sakelar terbalik)
 */
export function ConsoleShell({
  nav,
  subtitle,
  children,
}: {
  nav: ConsoleNavItem[];
  subtitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();

  async function handleLogout() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <div className="soc-grid min-h-dvh font-display text-soc-text">
      <header className="sticky top-0 z-20 border-b border-soc-border bg-soc-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-[0.2em]">
              SIAGA<span className="blink-cursor" />
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-soc-muted md:inline">
              {subtitle}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ModeBadges />
            <span className="hidden font-mono text-[11px] text-soc-muted md:inline">
              {user?.displayName}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 border border-soc-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-soc-muted transition-colors hover:text-soc-text"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab bernomor */}
        <nav aria-label={subtitle} className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                  active
                    ? "border-soc-text bg-soc-text font-bold text-soc-bg"
                    : "border-transparent text-soc-muted hover:text-soc-text"
                }`}
              >
                <span className={active ? "opacity-80" : "opacity-50"}>{item.num}</span> {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 pt-2">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-soc-muted/60">
          <ShieldAlert size={11} />
          SIAGA_ v2 · Prototype HackNusa 2026 · Zero-plaintext retention
        </p>
      </footer>
    </div>
  );
}
