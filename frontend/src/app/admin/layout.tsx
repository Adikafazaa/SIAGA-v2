import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import { Guard } from "@/features/auth/role-guard";

const NAV = [{ href: "/admin/telemetry", label: "Security Telemetry", num: "01" }];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Guard roles={["admin"]}>
      <ConsoleShell nav={NAV} subtitle="SIAGA SOC · Guardrail Telemetry">
        {children}
      </ConsoleShell>
    </Guard>
  );
}
