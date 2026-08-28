"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/auth-provider";
import type { Role } from "@/lib/types";

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Minimal 8 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();
  const [role, setRole] = useState<Role>("patient");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    setBusy(true);
    try {
      await signUpWithEmail(values.email, values.password, role);
      router.replace("/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pendaftaran gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-care-bg px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-1.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-care-blue text-white">
          <ShieldCheck size={22} />
        </span>
        <p className="font-mono text-lg font-semibold tracking-[0.25em] text-slate-900">SIAGA</p>
        <p className="text-xs text-slate-500">Buat akun baru</p>
      </div>

      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-semibold text-slate-900">Pendaftaran akun</h1>
        <p className="mb-5 mt-1 text-xs text-slate-500">
          Pilih peran Anda — alur onboarding akan menyesuaikan.
        </p>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Peran pengguna">
            {(
              [
                { value: "patient", label: "Pasien", desc: "Konseling & asesmen", icon: UserRound },
                { value: "doctor", label: "Dokter Jiwa", desc: "Portal DPJP", icon: Stethoscope },
              ] as const
            ).map((opt) => {
              const active = role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRole(opt.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-care-blue bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <opt.icon size={18} className={active ? "text-care-blue" : "text-slate-400"} />
                  <p className={`mt-1.5 text-sm font-medium ${active ? "text-care-blue" : "text-slate-800"}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-slate-500">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          <Input label="Nama lengkap" placeholder="cth. Andi Pratama" autoComplete="name" {...register("name")} error={errors.name?.message} />
          <Input label="Email" type="email" placeholder="nama@email.com" autoComplete="email" {...register("email")} error={errors.email?.message} />
          <Input label="Kata sandi" type="password" placeholder="Minimal 8 karakter" autoComplete="new-password" {...register("password")} error={errors.password?.message} />

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 size={15} className="animate-spin" />}
            Daftar & Lanjut Onboarding
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-care-blue hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
