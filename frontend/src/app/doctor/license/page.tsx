"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/features/auth/auth-provider";
import { verifyLicense } from "@/lib/api";
import { SPECIALIZATIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export default function LicensePage() {
  const { user, updateProfile } = useAuth();
  const [sip, setSip] = useState(user?.doctorLicenseId ?? "");
  const [spec, setSpec] = useState(user?.specialization ?? "");
  const [sipError, setSipError] = useState<string | null>(null);
  const [specError, setSpecError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(user?.doctorLicenseId ? Date.now() : null);

  if (!user) return null;
  const uid = user.uid;

  async function submit() {
    let ok = true;
    if (!/^\d{8}$/.test(sip.trim())) {
      setSipError("Nomor SIP harus tepat 8 digit angka.");
      ok = false;
    }
    if (!spec) {
      setSpecError("Spesialisasi wajib dipilih.");
      ok = false;
    }
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await verifyLicense(uid, sip.trim(), spec);
      await updateProfile({ doctorLicenseId: res.doctorLicenseId, specialization: spec });
      setVerifiedAt(res.verifiedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verifikasi gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Panel label="Verifikasi lisensi SIP" hud>
        {verifiedAt ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border border-allow/40 bg-allow/10 p-4">
              <span className="flex h-10 w-10 items-center justify-center border border-allow/50 text-allow">
                <BadgeCheck size={20} />
              </span>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-allow">
                  Lisensi terverifikasi
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-soc-muted">
                  Terverifikasi {formatDateTime(verifiedAt)} · SIP ••••{sip.slice(-4)}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-soc-muted">Nomor SIP</dt>
                <dd className="tabular mt-1 font-mono text-soc-text">••••{sip.slice(-4)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-soc-muted">Spesialisasi</dt>
                <dd className="mt-1 text-soc-text">{spec}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-soc-muted">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-allow" />
              Verifikasi lisensi praktik (SIP) wajib sebelum Anda dapat mengelola rekam medis pasien.
              Nomor SIP diverifikasi terhadap basis data kementerian.
            </p>
            {error && (
              <p role="alert" className="border border-block/50 bg-block/10 px-3 py-2 font-mono text-[11px] text-block">
                ● {error}
              </p>
            )}
            <Input
              theme="dark"
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
              theme="dark"
              label="Spesialisasi medis"
              placeholder="— Pilih spesialisasi —"
              value={spec}
              onChange={(v) => {
                setSpec(v);
                setSpecError(null);
              }}
              options={SPECIALIZATIONS.map((s) => ({ value: s, label: s }))}
              error={specError ?? undefined}
            />
            <Button theme="dark" bracket onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 size={12} className="animate-spin" />}
              Verifikasi SIP
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
