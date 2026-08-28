# Features & Functional Requirements

## 1. Live Interactive Chatbot (Local AI Engine)
- Antarmuka chat interaktif polos (mendukung input teks dinamis tanpa skenario buatan).
- Integrasi ke Local AI Model melalui konfigurasi backend `.env`.
- Dukungan mode streaming text dan manajemen riwayat sesi chat aktif.

## 2. SIAGA Security Gateway (Backend Guardrail)
- **L0 Sanitasi:** Normalisasi NFKC, strip karakter tersembunyi (zero-width) sesuai standar UTS #39.
- **L1 Dual-Axis Classifier:** Inferensi model ONNX INT8 (MiniLM/IndoBERT) untuk analisis muatan koersif vs asal mesin.
- **L3 CIM Engine (Conversational Intent Momentum):** Penjejakan akumulasi arah niat jahat lintas-putaran dan graf semantik percakapan.
- **Active Reverse Turing Probe:** Mekanisme tantangan otomatis pada zona risiko abu-abu (misal: permintaan otorisasi SIP dokter).

## 3. Clinical Assessment Hub
- Form skrining mandiri terstandar (PHQ-9 dan GAD-7).
- Perhitungan skor otomatis dan pencatatan riwayat asesmen di Firestore.

## 4. Doctor / Clinical Management (DPJP Portal)
- Verifikasi lisensi dokter (nomor SIP 8-digit).
- Manajemen rekam medis pasien terproteksi.

## 5. Security & System Telemetry (Admin / SOC Dashboard)
- Visualisasi metrik keamanan (skor risiko sesi, pergerakan momentum CIM, log insiden blokir).
- Monitor status koneksi ke Local AI Model dan latensi inferensi guardrail.