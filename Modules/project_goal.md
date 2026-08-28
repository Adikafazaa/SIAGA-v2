# Project Goal

## Project Name
PsychoBot Clinical Care & SIAGA Guardrail Platform

## Mission
Membangun platform website standar layanan konseling dan kesehatan mental dengan antarmuka Chatbot AI fungsional (live streaming) yang terintegrasi langsung dengan model Local LLM lokal pengguna (Ollama/vLLM/OpenAI-compatible local server), yang dilindungi oleh sistem keamanan backend stateful (MiniLM/IndoBERT ONNX + Stateful Intent Graph CIM) untuk mendeteksi serta mencegah eksfiltrasi data atau manipulasi bertahap secara real-time.

## Primary Objectives
- Menyediakan aplikasi web konseling psikiatri standar (User/Patient Dashboard, Clinical Records, Assessment, dan Live Chat).
- Menyediakan antarmuka chat polos tanpa skenario hardcode yang terintegrasi dinamis dengan Local LLM Server melalui konfigurasi `.env`.
- Mengamankan komunikasi chatbot menggunakan layer keamanan backend berbasis ONNX Runtime (MiniLM/IndoBERT) dan akumulasi momentum niat (CIM).
- Mengintegrasikan deteksi aktif (Reverse Turing Probe) untuk memvalidasi otorisasi darurat SIP dokter/klinisi saat anomali terdeteksi.
- Memberikan dashboard analitik telemetri keamanan dan log insiden untuk monitoring kesehatan sistem.
- Menjamin privasi data sesi (Zero-Plaintext Retention) sesuai kepatuhan hukum privasi data.

## Success Metrics
- Integrasi mulus dengan Local LLM endpoint dengan respons streaming stabil.
- Latensi pemindaian guardrail inline backend < 60 ms (p95) di CPU menggunakan model ONNX INT8.
- Pencegahan serangan bertahap (Multi-Turn Escalation) sebelum membocorkan data sensitif.
- False Positive Rate < 2% pada percakapan konseling panjang yang sah.