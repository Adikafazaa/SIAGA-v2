"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/auth-provider";
import { DEMO_ACCOUNTS, ROLE_HOME } from "@/lib/constants";

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-care-bg px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-1.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-care-blue text-white">
          <ShieldCheck size={22} />
        </span>
        <p className="font-mono text-lg font-semibold tracking-[0.25em] text-slate-900">SIAGA</p>
        <p className="text-xs text-slate-500">PsychoBot · Konseling Digital Terproteksi</p>
      </div>
      {children}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, signInWithEmail, isMockAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "google" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (loading || !user) return;
    if (user.role && user.onboardingCompleted) router.replace(ROLE_HOME[user.role]);
    else router.replace("/onboarding");
  }, [user, loading, router]);

  const homeFor = (role: string | null, done: boolean) =>
    role && done ? ROLE_HOME[role] : "/onboarding";

  async function onSubmit(values: FormValues) {
    setError(null);
    setBusy("form");
    try {
      const u = await signInWithEmail(values.email, values.password);
      router.replace(homeFor(u.role, u.onboardingCompleted));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy("google");
    try {
      const u = await signInWithGoogle();
      if (u) router.replace(homeFor(u.role, u.onboardingCompleted));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google Sign-In gagal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthFrame>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-semibold text-slate-900">Masuk ke akun Anda</h1>
        <p className="mb-5 mt-1 text-xs text-slate-500">
          Lanjutkan konseling, asesmen, atau konsol klinis Anda.
        </p>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Email" type="email" placeholder="nama@email.com" autoComplete="email" {...register("email")} error={errors.email?.message} />
          <Input label="Kata sandi" type="password" placeholder="••••••••" autoComplete="current-password" {...register("password")} error={errors.password?.message} />
          <Button type="submit" className="w-full" disabled={busy !== null}>
            {busy === "form" ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
            Masuk
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] uppercase tracking-wider text-slate-400">atau</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <Button variant="secondary" className="w-full" onClick={onGoogle} disabled={busy !== null}>
          {busy === "google" ? <Loader2 size={15} className="animate-spin" /> : <GoogleIcon />}
          Masuk dengan Google
        </Button>

        <p className="mt-5 text-center text-xs text-slate-500">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-care-blue hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>

      {isMockAuth && (
        <div className="mt-4 w-full max-w-md rounded-xl border border-dashed border-slate-300 bg-white/60 p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Akun demo (demo mode)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => onSubmit({ email: a.email, password: a.password })}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-600 transition-colors hover:border-care-blue hover:text-care-blue"
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Klik untuk masuk cepat · kata sandi sama untuk semua</p>
        </div>
      )}
    </AuthFrame>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}
