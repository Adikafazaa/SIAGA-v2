"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BrainCircuit,
  ClipboardCheck,
  LogIn,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { ROLE_HOME } from "@/lib/constants";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "Chatbot Local AI — Live",
    desc: "Percakapan diproses langsung oleh Local LLM (Ollama/vLLM) melalui gateway backend — tanpa skenario buatan, respons streaming nyata.",
  },
  {
    icon: ShieldCheck,
    title: "SIAGA Security Gateway",
    desc: "Setiap pesan melewati pipeline L0–L3: sanitasi UTS #39, klasifikasi ONNX INT8, dan Stateful Intent Momentum untuk mendeteksi eskalasi bertahap.",
  },
  {
    icon: ClipboardCheck,
    title: "Alat Klinik & Telemetri",
    desc: "Asesmen mandiri PHQ-9/GAD-7, portal DPJP dengan verifikasi SIP, dan dashboard SOC dengan kurva momentum risiko real-time.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!user.role || !user.onboardingCompleted) router.replace("/onboarding");
    else router.replace(ROLE_HOME[user.role] ?? "/chat");
  }, [user, loading, router]);

  return (
    <div className="min-h-dvh bg-care-bg">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-care-blue text-white">
              <ShieldCheck size={18} />
            </span>
            <div className="leading-tight">
              <p className="font-mono text-base font-semibold tracking-[0.25em] text-slate-900">SIAGA</p>
              <p className="text-[10px] text-slate-500">PsychoBot Clinical Care Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-care-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          <Workflow size={11} />
          Local LLM · ONNX Guardrail · SOC Telemetry
        </p>
        <h1 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
          Ruang konseling yang dijaga secara real-time.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
          SIAGA menghubungkan Anda dengan asisten konseling berbasis Local AI yang responsnya streaming
          nyata — sementara gateway keamanan berlapis memantau setiap percakapan untuk mencegah
          eksfiltrasi data klinis dan manipulasi bertahap, dengan latensi di bawah 60 ms.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-care-blue px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Mulai Konsultasi
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <LogIn size={15} />
            Masuk Akun
          </Link>
        </div>
      </section>

      {/* Fitur */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-care-blue">
                <f.icon size={20} />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">{f.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pipeline strip */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <Activity size={12} />
            Alur pesan pengguna
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {[
              "Pasien mengirim pesan",
              "L0 Sanitasi UTS #39",
              "L1 Klasifikasi ONNX (MiniLM/IndoBERT)",
              "L3 Intent Momentum (CIM)",
              "Local LLM (.env)",
              "Streaming ke UI",
              "Telemetri SOC",
            ].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-slate-400">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            SIAGA v2 · Prototype HackNusa 2026
          </p>
          <p className="text-[11px] text-slate-400">
            Bila Anda dalam kondisi darurat, hubungi layanan krisis 24 jam (119 ekst. 8) atau IGD terdekat.
          </p>
        </div>
      </footer>
    </div>
  );
}
