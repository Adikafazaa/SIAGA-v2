"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ClipboardList, LogOut, MessageSquare, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { ModeBadges } from "./ModeBadge";

const NAV = [
  { href: "/chat", label: "Chat Konseling", icon: MessageSquare },
  { href: "/assessments", label: "Asesmen", icon: ClipboardList },
  { href: "/profile", label: "Profil", icon: User },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Shell antarmuka pasien — terang, lembut (design_system.md) */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();

  async function handleLogout() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh bg-care-bg text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-care-blue text-white">
              <ShieldCheck className="h-4.5 w-4.5" size={18} />
            </span>
            <div className="leading-tight">
              <p className="font-mono text-sm font-semibold tracking-widest">SIAGA</p>
              <p className="text-[10px] text-slate-500">PsychoBot · Konseling Digital</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block">
              <ModeBadges />
            </span>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                {user ? initials(user.displayName) : "…"}
              </span>
              <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">
                {user?.displayName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar desktop */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav aria-label="Navigasi pasien" className="sticky top-20 space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-care-blue text-white"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Konten */}
        <main className="min-w-0 flex-1 pb-20 lg:pb-6">{children}</main>
      </div>

      {/* Navigasi bawah (mobile) */}
      <nav
        aria-label="Navigasi pasien"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white lg:hidden"
      >
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                active ? "text-care-blue" : "text-slate-500"
              }`}
            >
              <item.icon size={18} />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
