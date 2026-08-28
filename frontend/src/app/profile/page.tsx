"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, CalendarDays, LogOut, Mail, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Guard } from "@/features/auth/role-guard";
import { useAuth } from "@/features/auth/auth-provider";
import { formatDate } from "@/lib/format";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfilePage() {
  return (
    <Guard roles={["patient", "doctor", "admin"]}>
      <AppShell>
        <ProfileWorkspace />
      </AppShell>
    </Guard>
  );
}

function ProfileWorkspace() {
  const { user, signOutUser } = useAuth();
  const router = useRouter();
  if (!user) return null;

  async function logout() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-base font-semibold text-slate-900">Profil Saya</h1>
        <p className="text-xs text-slate-500">Informasi akun dan preferensi konseling Anda.</p>
      </div>

      <Card pad={false}>
        <div className="flex items-center gap-4 p-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-care-blue text-lg font-semibold text-white">
            {initials(user.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {user.displayName}
              {user.role === "doctor" && user.doctorLicenseId && (
                <BadgeCheck size={15} className="text-care-blue" aria-label="Terverifikasi" />
              )}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Mail size={12} /> {user.email}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-600">
            {user.role === "doctor" ? "Dokter Jiwa" : user.role === "admin" ? "SOC" : "Pasien"}
          </span>
        </div>

        <div className="grid gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-2">
          <InfoRow
            icon={<UserRound size={14} />}
            label="Metode masuk"
            value={user.provider === "google" ? "Google Sign-In" : "Email & kata sandi"}
          />
          <InfoRow icon={<CalendarDays size={14} />} label="Terdaftar" value={formatDate(user.createdAt)} />
          {user.role === "patient" && (
            <>
              <InfoRow
                icon={<CalendarDays size={14} />}
                label="Slot konseling"
                value={user.preferredSlot ?? "Belum diatur"}
              />
              <InfoRow
                icon={<ShieldCheck size={14} />}
                label="Pendekatan"
                value={user.counselingPreferences?.length ? user.counselingPreferences.join(", ") : "Belum diatur"}
              />
            </>
          )}
          {user.role === "doctor" && (
            <>
              <InfoRow
                icon={<BadgeCheck size={14} />}
                label="Nomor SIP"
                value={user.doctorLicenseId ? `••••${user.doctorLicenseId.slice(-4)}` : "Belum diverifikasi"}
              />
              <InfoRow icon={<Stethoscope size={14} />} label="Spesialisasi" value={user.specialization ?? "—"} />
            </>
          )}
          <div className="bg-white p-4 sm:col-span-2">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
              <ShieldCheck size={12} /> Privasi
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Sesi chat Anda melewati SIAGA Guardrail dan hanya disimpan sebagai hash & vektor fitur
              (Zero-Plaintext Retention). Data klinis dienkripsi di sisi server.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Sesi</h2>
        <p className="mt-1 text-xs text-slate-500">Akun Anda aktif dan tersinkron dengan gateway SIAGA.</p>
        <Button variant="danger" size="sm" className="mt-4" onClick={() => void logout()}>
          <LogOut size={13} /> Keluar dari Akun
        </Button>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-1 truncate text-xs font-medium text-slate-800">{value}</p>
    </div>
  );
}
