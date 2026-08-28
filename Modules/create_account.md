# Flow Pendaftaran Akun & Onboarding

Halaman Login / Register
        │
        ▼
Pilih Metode (Google Sign-In / Email Password)
        │
        ▼
Firebase Authentication
        │
        ▼
Pemeriksaan Dokumen User di Firestore
        │
    ┌───┴────┐
    │        │
User Baru  User Lama
    │        │
    ▼        ▼
Onboarding  Dashboard Sesuai Role
    │
    ▼
Pilih Role Pengguna
┌───────────────────────────────┬───────────────────────────────┐
│        Pasien (Patient)       │      Dokter Jiwa (Doctor)     │
└──────────────┬────────────────┴──────────────┬────────────────┘
               │                               │
               ▼                               ▼
     Lengkapi Profil Dasar            Input Nomor SIP (8-Digit)
     & Preferensi Konseling           & Spesialisasi Medis
               │                               │
               ▼                               ▼
     Dashboard Pasien & Chat          Dashboard Dokter (DPJP Console)