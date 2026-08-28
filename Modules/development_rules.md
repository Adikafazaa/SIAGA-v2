# Development Rules

## Frontend & Arsitektur
- Selalu gunakan TypeScript untuk komponen dan library.
- Gunakan Firebase Modular SDK (v9+ atau v10+). Jangan gunakan Namespaced SDK.
- Gunakan Feature-Based Architecture (`features/auth`, `features/chat`, `features/assessment`, `features/telemetry`).
- Pisahkan presentasi UI dan logika bisnis secara tegas.
- Gunakan Repository Pattern untuk komunikasi database.
- Gunakan Custom Hooks untuk isolasi alur asynchronous (misal: `useChatSession`, `useLocalAIStream`).
- Validasi form menggunakan Zod dan React Hook Form.
- Semua halaman harus responsif (Mobile-first).

## Backend & Local AI Specific Rules
- Konfigurasi koneksi Local AI LLM (URL, Model Name, Temperature, Timeout) **wajib** dikelola melalui environment variable (`.env`).
- Semua pesan yang masuk ke endpoint chat wajib melalui pipeline inspeksi keamanan SIAGA (L0–L3) sebelum dikirimkan ke Local AI Model.
- Model ONNX (MiniLM/IndoBERT) dieksekusi di backend secara lokal untuk menjamin latensi < 60ms.
- Session store guardrail tidak boleh menyimpan plaintext percakapan (gunakan SHA-256 hash dan float embedding).
- Simpan timestamp Firestore menggunakan `serverTimestamp()`.