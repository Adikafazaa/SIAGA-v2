import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import { Guard } from "@/features/auth/role-guard";

const NAV = [
  { href: "/doctor/dashboard", label: "Pasien", num: "01" },
  { href: "/doctor/license", label: "Lisensi SIP", num: "02" },
];

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <Guard roles={["doctor"]}>
      <ConsoleShell nav={NAV} subtitle="DPJP Clinical Console">
        {children}
      </ConsoleShell>
    </Guard>
  );
}
