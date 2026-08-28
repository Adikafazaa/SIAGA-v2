# SIAGA-v2 Backend — PsychoBot Clinical Care & SIAGA Guardrail Platform

Backend FastAPI untuk platform konseling digital dengan guardrail SIAGA stateful
(L0 UTS #39 → L1 ONNX dual-axis → L3 CIM) di depan Local AI LLM.
Spesifikasi acuan: `../Modules/*.md`.

## Menjalankan

```bash
cd SIAGA-v2/backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt      # Linux: .venv/bin/pip
copy .env.example .env                              # sesuaikan LLM_BASE_URL, dst.
.venv\Scripts\uvicorn app.main:app --port 8000 --reload
```

- Docs interaktif: http://localhost:8000/docs
- Health: `GET /health`
- Test: `.venv\Scripts\python -m pytest tests -q`

## Mode Operasi

| Kondisi | Perilaku |
|---|---|
| `LLM_PROVIDER=ollama` / `openai_compatible` + server hidup | Chat mengalir ke Local LLM (streaming SSE didukung) |
| Server LLM mati | Fallback persona klinis PsychoBot (aplikasi tetap jalan) |
| `FIREBASE_CREDENTIALS_PATH` diset + firebase-admin terpasang | Firestore + verifikasi Firebase ID token |
| Tanpa kredensial Firebase (default dev) | SQLite lokal (`data/psycho_local.db`) + token dev |

**Token dev (hanya saat Firebase belum dikonfigurasi):**
`Authorization: Bearer dev-<uid>` — mis. `Bearer dev-patient-1`.
Role diambil dari dokumen user; provisioning admin/doctor lewat
`POST /v1/users/onboarding` (doctor wajib No. SIP 8 digit) atau set manual di store.

## Kontrak API (ringkas untuk frontend)

Semua endpoint (kecuali `/health`) wajib header `Authorization: Bearer <token>`.

### Chat (`/v1/chat`)
| Endpoint | Fungsi |
|---|---|
| `POST /message` | Kirim pesan → guardrail L0–L3 → (ALLOW/WATCH) diteruskan ke Local LLM. Balasan non-stream. |
| `POST /stream` | Sama, streaming **SSE**: `event: guardrail` (decision+risk) → `event: token` (potongan balasan) → `event: done`. |
| `POST /probe/verify` | Verifikasi jawaban Reverse Turing Probe `{session_id, reply}`. |
| `GET /sessions` / `POST /sessions` | Daftar / buat sesi chat. |
| `GET /sessions/{id}/messages` | Riwayat percakapan sesi. |
| `GET /sessions/{id}/metrics` | Metrik CIM sesi (kurva momentum, keputusan per turn) — feed Live Guard Monitor. |

Respons `POST /message` (sesuai `Modules/api.md`):

```json
{
  "session_id": "sess_99812",
  "status": "ALLOWED",            // ALLOWED | BLOCKED
  "decision": "ALLOW",            // ALLOW | WATCH | PROBE | BLOCK
  "reply": "...",
  "risk_score": 0.08,
  "reason": null,
  "stateful_metrics": { "momentum": 0.08, "direction_consistency": 0.25, "anchor_score": 0.0, "turns_to_detection": null },
  "latency_ms": { "l0": 0.8, "l1": 12.5, "l2": 0.3, "cim": 8.9, "total": 22.2 },
  "explanation": [ { "turn": 1, "reason": "sinyal di bawah ambang; ALLOW" } ]
}
```

`decision=PROBE` → `reply` berisi tantangan (mis. verifikasi SIP DPJP); kirim jawaban
user ke `POST /probe/verify`. `decision=BLOCK` → sesi terkunci, `reply` pesan aman.

### Users (`/v1/users`)
- `GET /me` — profil user aktif.
- `POST /onboarding` — `{role: "patient"|"doctor", displayName?, doctorLicenseId?, preferences?}`; doctor wajib SIP 8 digit.

### Assessments (`/v1/assessments`)
- `GET /instruments` — soal PHQ-9 (9 item) & GAD-7 (7 item) + opsi 0–3.
- `POST /` — `{type: "PHQ-9"|"GAD-7", answers: number[]}` → skor, severity, flag `requiresClinicalAttention`.
- `GET /` — riwayat asesmen.

### Doctor DPJP (`/v1/doctor`, role doctor/admin)
- `GET /patients` — daftar pasien + asesmen terakhir.
- `GET /patients/{uid}` — profil, asesmen, rekam medis, sesi chat.
- `POST /records` — `{patientUid, notes}` tambah catatan klinis.

### Admin SOC (`/v1/admin`, role admin/doctor)
- `GET /telemetry` — ringkasan: distribusi keputusan, block rate, latensi p50/p95, log terbaru.
- `GET /security-logs?limit=` — log insiden ( koleksi `securityLogs` ).
- `GET /llm-status` — ketersediaan Local AI + latensi.

## Privasi (Zero-Plaintext Retention)
Session store guardrail (DuckDB, `data/siaga_sessions.duckdb`) **hanya** menyimpan
SHA-256 hash pesan + embedding + fitur risiko, TTL 24 jam. Teks percakapan user
tersimpan terpisah di Firestore/SQLite untuk riwayat chat aplikasi.

## Struktur

```
backend/app/
├── main.py            # FastAPI: CORS, rate limit, payload cap, router
├── config.py          # Semua konfigurasi via .env (wajib per development_rules.md)
├── schemas.py         # Kontrak Pydantic
├── engine.py          # Orkestrator guardrail L0–L3 → fusi → keputusan
├── db.py              # Repository: Firestore (produksi) / SQLite (fallback)
├── deps.py            # Auth: Firebase ID token / dev token
├── llm_client.py      # Streaming Ollama & OpenAI-compatible + fallback persona
├── core/              # L0 canonicalize, L1 dual-axis (ONNX/fallback), L2 konteks,
│   └── l3_cim/        # ★ CIM: momentum, anchor, trajectory graph, session store
├── probe/             # Reverse Turing Protocol + clinical canary
└── routers/           # chat, users, assessments, doctor, admin
```
