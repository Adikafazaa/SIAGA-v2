"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { Role } from "@/lib/types";
import { ROLE_HOME } from "@/lib/constants";
import { useAuth } from "./auth-provider";
import { FullScreenLoader } from "@/components/ui/ScreenStates";

/**
 * Penjaga rute berbasis role.
 * - belum login → /login
 * - onboarding belum selesai / role belum dipilih → /onboarding
 * - role tidak sesuai → halaman utama role-nya
 */
export function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.role || !user.onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }
    if (!roles.includes(user.role)) {
      router.replace(ROLE_HOME[user.role] ?? "/chat");
    }
  }, [user, loading, roles, router]);

  if (loading || !user || !user.role || !user.onboardingCompleted || !roles.includes(user.role)) {
    return <FullScreenLoader />;
  }

  return <>{children}</>;
}

/** Penjaga ringan: cukup harus login (dipakai halaman /onboarding). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role && user.onboardingCompleted) {
      router.replace(ROLE_HOME[user.role] ?? "/chat");
    }
  }, [user, loading, router]);

  if (loading || !user || (user.role && user.onboardingCompleted)) {
    return <FullScreenLoader />;
  }

  return <>{children}</>;
}
