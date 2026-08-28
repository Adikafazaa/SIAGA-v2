# User Flow

## Alur Pengguna (Patient / User)
1. Registrasi / Masuk Akun via Firebase Auth (Google / Email).
2. Melengkapi Profil Singkat & Preferensi Konseling.
3. Mengisi Asesmen Gejala Awal (PHQ-9 / GAD-7) jika diperlukan.
4. Membuka Ruang Chat Konseling & mengirim pesan bebas/polos.
5. Menerima respons real-time (streaming/teks) langsung dari Local AI LLM.
6. Melihat riwayat percakapan sesi yang sedang aktif.

## Alur Internal Backend & Guardrail
1. Request chat diterima oleh API Gateway FastAPI (`POST /v1/chat/message`).
2. Gateway memeriksa otentikasi sesi dan melakukan sanitasi input (L0 Canonicalizer).
3. Evaluasi Keamanan Stateful:
   - Ekstraksi vektor embedding pesan via ONNX Runtime (MiniLM / IndoBERT).
   - Perhitungan momentum arah risiko (CIM Engine) dan keterkaitan jangkar referensial.
4. Pengambilan Keputusan Guardrail:
   - **ALLOW:** Pesan diteruskan ke Local AI Model via endpoint yang diatur di `.env`. Respons model dikembalikan ke UI.
   - **PROBE:** Backend menyisipkan tantangan otorisasi (misal: verifikasi SIP dokter) ke dalam respon chatbot.
   - **BLOCK:** Backend memutus request, mengembalikan pesan peringatan aman, dan mencatat insiden ke log keamanan.
5. Pembaruan state sesi di cache lokal (DuckDB/SQLite) menggunakan hash, tanpa menyimpan plaintext.