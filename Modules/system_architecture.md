# Architecture

## Diagram Sistem

Frontend (Next.js 14+ / React)
        │
        ▼ (HTTP / WebSocket)
FastAPI Backend Gateway (:8000)
        │
        ├──► Firebase Auth (Autentikasi Pengguna & Role)
        │
        ├──► SIAGA Guardrail Middleware (Local CPU)
        │       ├── L0: Canonicalizer UTS #39
        │       ├── L1: ONNX Runtime INT8 (MiniLM / IndoBERT)
        │       ├── L2: Context Evaluator
        │       ├── L3: CIM Engine (Momentum & Graph DAG)
        │       └── Session Store (DuckDB / SQLite In-Memory)
        │
        ├──► Local AI LLM Engine (Dikonfigurasi via .env)
        │       └── (Ollama / vLLM / Local OpenAI-Compatible Server)
        │
        └──► Cloud Firestore / Storage (Master Data, Profil & Rekam Medis)

## Design Patterns & Standar
- **Feature-Based Architecture:** Struktur direktori frontend dan backend berbasis domain fitur.
- **Repository Pattern:** Seluruh operasi Firestore dan DuckDB diabstraksikan melalui modul repository.
- **Service Layer Pattern:** Integrasi ke Local LLM dan model ONNX diisolasi ke dalam layer services tersendiri.
- **Zero-Plaintext Policy:** Session cache untuk inspeksi keamanan hanya menyimpan token hashes dan feature vectors ber-TTL.