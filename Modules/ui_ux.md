# UI/UX & Page Routes Blueprint

## Daftar Rute Halaman Aplikasi

### 1. Public & Patient Routes
- `/` — Beranda & Pengenalan Platform
- `/login` — Halaman Masuk Akun
- `/register` — Halaman Pendaftaran Akun
- `/onboarding` — Pengaturan profil awal pasien/dokter
- `/chat` — Antarmuka Chat Konseling Real-time (Terhubung ke Local AI)
- `/assessments` — Skrining Mandiri PHQ-9 & GAD-7
- `/profile` — Pengaturan Profil & Riwayat Sesi

### 2. Clinical Doctor Routes
- `/doctor/dashboard` — Daftar Pasien & Antrean Sesi Konseling
- `/doctor/patients/[id]` — Rekam Medis & Riwayat Asesmen Pasien
- `/doctor/license` — Verifikasi Dokumen & SIP Dokter

### 3. System Telemetry & SOC Routes
- `/admin/telemetry` — Dashboard Monitoring Keamanan SIAGA
  - Live Guard Monitor (Grafik real-time momentum risiko per sesi)
  - Security Logs (Catatan insiden blokir & probe)
  - Local AI Status (Status server LLM lokal, latency, dan token throughput)