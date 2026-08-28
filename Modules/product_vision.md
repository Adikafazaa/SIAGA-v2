# Product Vision

PsychoBot adalah platform website layanan psikiatri dan konseling digital standar yang siap pakai untuk uji coba interaktif dan deployment mandiri.

Aplikasi tidak menggunakan balasan pura-pura atau alur simulasi video; seluruh percakapan diproses langsung oleh Local AI Model yang dikonfigurasi melalui Backend Environment (`.env`).

Alur kerja sistem berjalan terstruktur secara live:

Pasien Mengirim Pesan
↓
Backend Security Gateway (FastAPI)
↓
Sanitasi L0 UTS #39 & Deteksi Dual-Axis (ONNX)
↓
Stateful Intent Graph & Momentum CIM (L3)
↓
Penerusan Prompt ke Local AI LLM (Ollama/vLLM)
↓
Streaming Respons AI ke Antarmuka Pengguna
↓
Penyimpanan State Sesi Terenkripsi & Telemetri SOC

Pengguna mendapatkan interaksi nyata dan fleksibel dengan AI lokal, sementara pemilik sistem memiliki visibilitas telemetri dan proteksi tingkat lanjut di backend.