"""PsychoBot Clinical Care & SIAGA Guardrail Platform - FastAPI entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import CORS_ORIGINS, PAYLOAD_CAP_BYTES, RATE_LIMIT_PER_WINDOW, RATE_WINDOW_SECONDS
from .engine import get_engine_instance
from .routers import admin, assessments, chat, doctor, users

_rate: dict[str, list[float]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    get_engine_instance().close()


app = FastAPI(
    title="PsychoBot + SIAGA Backend",
    version="2.0.0",
    description="Layanan konseling digital (Local AI LLM) dengan SIAGA Guardrail "
                "stateful (L0 UTS#39 / L1 ONNX dual-axis / L3 CIM) - zero-plaintext session store.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def gateway_checks(request: Request, call_next):
    # Payload cap (≤32KB)
    cl = request.headers.get("content-length")
    if cl and int(cl) > PAYLOAD_CAP_BYTES:
        return JSONResponse({"detail": "Payload too large"}, status_code=413)
    # Rate limit per klien (in-memory, single worker)
    import time

    key = request.client.host if request.client else "unknown"
    now = time.time()
    hits = [t for t in _rate.get(key, []) if now - t < RATE_WINDOW_SECONDS]
    if len(hits) >= RATE_LIMIT_PER_WINDOW:
        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    hits.append(now)
    _rate[key] = hits
    return await call_next(request)


from fastapi.responses import JSONResponse, RedirectResponse

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/v1/health", tags=["system"], include_in_schema=False)
@app.get("/health", tags=["system"])
def health():
    engine = get_engine_instance()
    return {"status": "ok", "engine": "siaga-cim-v0", "store": str(engine.store.db_path)}


app.include_router(users.router)
app.include_router(chat.router)
app.include_router(assessments.router)
app.include_router(doctor.router)
app.include_router(admin.router)
