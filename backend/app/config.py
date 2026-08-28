"""Konfigurasi PsychoBot + SIAGA Guardrail via environment variable (.env).

Semua koneksi Local AI LLM (URL, Model, Temperature, Timeout) WAJIB di sini
(development_rules.md). Angka ambang guardrail adalah nilai v0 terkalibrasi -
angka hasil ukur hanya boleh berasal dari pengukuran nyata.
"""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent


def _load_dotenv() -> None:
    for env_path in (PROJECT_ROOT / ".env", BACKEND_ROOT / ".env"):
        if env_path.is_file():
            try:
                for line in env_path.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v
            except Exception:
                pass


_load_dotenv()

# ── Local AI LLM (PsychoBot) ────────────────────────────────────────────────
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")  # ollama | openai_compatible | fallback
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:latest")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
LLM_SYSTEM_PROMPT = os.getenv(
    "LLM_SYSTEM_PROMPT",
    (
        "Anda adalah PsychoBot, asisten AI konseling psikologi dan klinis yang ramah, "
        "empatik, dan profesional. Jawablah dengan ringkas, suportif, dan edukatif dalam "
        "Bahasa Indonesia. Anda sangat menjaga kerahasiaan dan privasi data pasien, dan "
        "tidak akan pernah membocorkan data rekam medis atau transkrip sesi."
    ),
)

# ── Firebase (opsional: tanpa kredensial -> mode lokal SQLite) ──────────────
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
FIREBASE_STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", "")

# ── Gateway ─────────────────────────────────────────────────────────────────
# DEV ONLY default. Produksi WAJIB set SIAGA_API_KEY.
API_KEY = os.getenv("SIAGA_API_KEY", "siaga-dev-key")
PAYLOAD_CAP_BYTES = int(os.getenv("SIAGA_PAYLOAD_CAP_KB", "32")) * 1024
RATE_LIMIT_PER_WINDOW = int(os.getenv("SIAGA_RATE_LIMIT", "100"))
RATE_WINDOW_SECONDS = int(os.getenv("SIAGA_RATE_WINDOW_S", "60"))
CORS_ORIGINS = [o for o in os.getenv("SIAGA_CORS_ORIGINS", "http://localhost:3000").split(",") if o]

# ── Privasi (Zero-Plaintext Retention) ──────────────────────────────────────
SESSION_TTL_HOURS = int(os.getenv("SIAGA_TTL_HOURS", "24"))
DATA_DIR = Path(os.getenv("SIAGA_DATA_DIR", BACKEND_ROOT / "data"))
DB_PATH = Path(os.getenv("SIAGA_DB_PATH", DATA_DIR / "siaga_sessions.duckdb"))
LOCAL_DB_PATH = Path(os.getenv("LOCAL_DB_PATH", DATA_DIR / "psycho_local.db"))
MODEL_DIR = Path(__file__).resolve().parent / "models"

# ── Ambang keputusan (PRD / Bab 3) ──────────────────────────────────────────
THRESHOLD_PROBE = float(os.getenv("SIAGA_THRESHOLD_PROBE", "0.60"))
THRESHOLD_BLOCK = float(os.getenv("SIAGA_THRESHOLD_BLOCK", "0.80"))
WATCH_DIRECTION = float(os.getenv("SIAGA_WATCH_DIRECTION", "0.50"))
WATCH_SCORE_MIN = float(os.getenv("SIAGA_WATCH_SCORE_MIN", "0.35"))

# ── Probe ───────────────────────────────────────────────────────────────────
PROBE_MAX_PER_SESSION = int(os.getenv("SIAGA_PROBE_MAX_PER_SESSION", "2"))

# ── CIM hyperparameter ──────────────────────────────────────────────────────
DIRECTION_WINDOW_K = int(os.getenv("SIAGA_CIM_WINDOW_K", "4"))
CIM_DECAY_LAMBDA = float(os.getenv("SIAGA_CIM_LAMBDA", "0.8"))
CIM_W1 = float(os.getenv("SIAGA_CIM_W1", "0.85"))
CIM_W2 = float(os.getenv("SIAGA_CIM_W2", "0.45"))
CIM_W3 = float(os.getenv("SIAGA_CIM_W3", "0.38"))
# Ambang taut graf: 0.80 untuk ruang embedding terlatih (MiniLM/IndoBERT);
# fallback hashing terukur -> 0.20 (lihat SIAGA/experiments/results.md).
SIM_THRESHOLD_TRAJECTORY = float(os.getenv("SIAGA_TRAJ_SIM", "0.20"))
EMBED_DIM = 384
