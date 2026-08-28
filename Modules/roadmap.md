# Product Roadmap

## Phase 1: Authentication & Standard Web Platform
- Setup Next.js 14+ frontend dan FastAPI backend.
- Integrasi Firebase Authentication (Google Sign-In & Email).
- Pembangunan UI Pasien, Form Asesmen PHQ-9/GAD-7, dan Firestore database.

## Phase 2: Local AI Integration & Chat Interface
- Konfigurasi backend `.env` untuk integrasi Local AI Model (Ollama/vLLM/OpenAI-compatible).
- Pembangunan antarmuka chat interaktif polos dengan streaming respons.
- Implementasi session management dan riwayat chat.

## Phase 3: SIAGA Guardrail Implementation (ONNX + CIM)
- Implementasi Layer 0 Input Canonicalizer (UTS #39).
- Implementasi L1 ONNX Runtime (MiniLM / IndoBERT INT8) untuk klasifikasi awal.
- Implementasi L3 CIM Engine (Stateful Intent Graph, Vektor Arah, dan Momentum Decay).
- Integrasi In-Memory Session Cache (DuckDB).

## Phase 4: Active Defense & Doctor DPJP Features
- Implementasi Reverse Turing Probe (Tantangan SIP Dokter otomatis).
- Pembangunan konsol dokter untuk verifikasi rekam medis.
- Integrasi dashboard telemetri keamanan dan log insiden.

## Phase 5: Testing, Hardening & Dockerization
- Uji coba interaktif end-to-end dengan model AI lokal.
- Profiling latensi guardrail (<60 ms).
- Penyusunan `docker-compose.yml` untuk deployment lokal 1-perintah.