"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/features/auth/auth-provider";
import { RequireAuth } from "@/features/auth/role-guard";
import { COUNSELING_PREFERENCES, ROLE_HOME, SPECIALIZATIONS, TIME_SLOTS } from "@/lib/constants";
import type { Role } from "@/lib/types";

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <OnboardingFlow />
    </RequireAuth>
  );
}

function OnboardingFlow() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const role: Role | null = user.role;

  async function finish(patch: Parameters<typeof updateProfile>[0], home: string) {
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ ...patch, onboardingCompleted: true });
      router.replace(home);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan profil.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-care-bg px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-care-blue text-white">
          <ShieldCheck size={18} />
        </span>
        <p className="font-mono text-sm font-semibold tracking-[0.25em] text-slate-900">SIAGA</p>
      </div>

      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {!role ? (
          <RoleSelect
            busy={busy}
            onSelect={(r) => finish({ role: r }, ROLE_HOME[r])}
          />
        ) : role === "patient" ? (
          <PatientForm busy={busy} onSubmit={(patch) => finish(patch, ROLE_HOME.patient)} />
        ) : role === "doctor" ? (
          <DoctorForm busy={busy} onSubmit={(patch) => finish(patch, ROLE_HOME.doctor)} />
        ) : (
          <AdminForm busy={busy} onSubmit={(patch) => finish(patch, ROLE_HOME.admin)} />
        )}
      </div>
    </div>
  );
}

function RoleSelect({ busy, onSelect }: { busy: boolean; onSelect: (r: Role) => void }) {
  return (
    <div>
      <h1 className="text-base font-semibold text-slate-900">Selamat datang 👋</h1>
      <p className="mb-5 mt-1 text-xs text-slate-500">Pilih peran Anda di platform SIAGA.</p>
      <div className="space-y-2">
        {(
          [
            { value: "patient" as Role, label: "Pasien", desc: "Akses chat konseling, asesmen mandiri PHQ-9/GAD-7, dan riwayat sesi.", icon: UserRound },
            { value: "doctor" as Role, label: "Dokter Jiwa (DPJP)", desc: "Verifikasi SIP, manajemen pasien & rekam medis klinis.", icon: Stethoscope },
          ]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            disabled={busy}
            className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-care-blue hover:bg-blue-50 disabled:opacity-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-care-blue">
              <opt.icon size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
              <span className="block text-xs text-slate-500">{opt.desc}</span>
            </span>
          </button>
        ))}
      </div>
      {busy && (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 size={13} className="animate-spin" /> Menyimpan peran…
        </p>
      )}
    </div>
  );
}

function PatientForm({ busy, onSubmit }: { busy: boolean; onSubmit: (patch: Record<string, unknown>) => void }) {
  const [slot, setSlot] = useState("Sore (15.00–18.00)");
  const [prefs, setPrefs] = useState<string[]>(["Konseling Terbuka"]);
  const [consent, setConsent] = useState(false);

  function togglePref(p: string) {
    setPrefs((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  return (
    <div>
      <h1 className="text-base font-semibold text-slate-900">Lengkapi profil konseling</h1>
      <p className="mb-5 mt-1 text-xs text-slate-500">
        Preferensi ini membantu psikolog memahami pendekatan yang Anda harapkan.
      </p>
      <div className="space-y-4">
        <Select
          label="Slot waktu konseling yang diutamakan"
          theme="light"
          value={slot}
          onChange={setSlot}
          options={TIME_SLOTS.map((s) => ({ value: s, label: s }))}
        />
        <fieldset>
          <legend className="mb-1.5 block text-xs font-medium text-slate-600">Pendekatan konseling</legend>
          <div className="grid grid-cols-2 gap-2">
            {COUNSELING_PREFERENCES.map((p) => {
              const on = prefs.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => togglePref(p)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    on ? "border-care-blue bg-blue-50 text-care-blue" : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {p}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-care-blue focus:ring-care-blue"
          />
          <span>
            Saya menyetujui pemrosesan data sesi oleh guardrail keamanan SIAGA untuk perlindungan data
            klinis (Zero-Plaintext Retention).
          </span>
        </label>
        <Button className="w-full" disabled={busy || !consent} onClick={() => onSubmit({ preferredSlot: slot, counselingPreferences: prefs })}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Mulai Konseling
        </Button>
      </div>
    </div>
  );
}

function DoctorForm({ busy, onSubmit }: { busy: boolean; onSubmit: (patch: Record<string, unknown>) => void }) {
  const [sip, setSip] = useState("");
  const [spec, setSpec] = useState("");
  const [sipError, setSipError] = useState<string | null>(null);
  const [specError, setSpecError] = useState<string | null>(null);

  function submit() {
    let ok = true;
    if (!/^\d{8}$/.test(sip.trim())) {
      setSipError("Nomor SIP harus tepat 8 digit angka.");
      ok = false;
    }
    if (!spec) {
      setSpecError("Spesialisasi wajib dipilih.");
      ok = false;
    }
    if (ok) onSubmit({ doctorLicenseId: sip.trim(), specialization: spec });
  }

  return (
    <div>
      <h1 className="text-base font-semibold text-slate-900">Verifikasi dokter (DPJP)</h1>
      <p className="mb-5 mt-1 text-xs text-slate-500">
        Verifikasi lisensi diperlukan sebelum mengakses portal klinis.
      </p>
      <div className="space-y-4">
        <Input
          label="Nomor SIP (8 digit)"
          placeholder="cth. 12345678"
          inputMode="numeric"
          value={sip}
          maxLength={8}
          onChange={(e) => {
            setSip(e.target.value.replace(/\D/g, ""));
            setSipError(null);
          }}
          error={sipError ?? undefined}
        />
        <Select
          label="Spesialisasi medis"
          theme="light"
          placeholder="— Pilih spesialisasi —"
          value={spec}
          onChange={(v) => {
            setSpec(v);
            setSpecError(null);
          }}
          options={SPECIALIZATIONS.map((s) => ({ value: s, label: s }))}
          error={specError ?? undefined}
        />
        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Verifikasi & Masuk Konsol
        </Button>
      </div>
    </div>
  );
}

function AdminForm({ busy, onSubmit }: { busy: boolean; onSubmit: (patch: Record<string, unknown>) => void }) {
  return (
    <div>
      <h1 className="text-base font-semibold text-slate-900">Operator SOC</h1>
      <p className="mb-5 mt-1 text-xs text-slate-500">
        Profil operator hampir lengkap. Konfirmasi untuk masuk ke konsol telemetri.
      </p>
      <Button className="w-full" disabled={busy} onClick={() => onSubmit({})}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        Masuk Konsol Telemetri
      </Button>
    </div>
  );
}
