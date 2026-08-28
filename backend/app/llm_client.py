"""Klien Local AI LLM (Ollama / OpenAI-compatible) + fallback persona.

Streaming: yield token per potongan. Fallback persona klinis PsychoBot dipakai
bila server LLM offline agar aplikasi tetap responsif (mode offline).
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

from .config import (
    LLM_API_KEY,
    LLM_BASE_URL,
    LLM_MODEL,
    LLM_PROVIDER,
    LLM_SYSTEM_PROMPT,
    LLM_TEMPERATURE,
    LLM_TIMEOUT_SECONDS,
)


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    if LLM_API_KEY:
        h["Authorization"] = f"Bearer {LLM_API_KEY}"
    return h


def _messages(history: list[dict] | None, prompt: str) -> list[dict]:
    msgs = [{"role": "system", "content": LLM_SYSTEM_PROMPT}]
    msgs += [{"role": m["role"], "content": m["content"]} for m in (history or [])[-20:]]
    msgs.append({"role": "user", "content": prompt})
    return msgs


def _payload(msgs: list[dict], stream: bool) -> dict:
    if LLM_PROVIDER.lower() == "ollama":
        return {"model": LLM_MODEL, "messages": msgs, "stream": stream,
                "options": {"temperature": LLM_TEMPERATURE}}
    return {"model": LLM_MODEL, "messages": msgs, "temperature": LLM_TEMPERATURE,
            "stream": stream}


def _chat_url() -> str:
    base = LLM_BASE_URL.rstrip("/")
    if LLM_PROVIDER.lower() == "ollama":
        return f"{base}/api/chat"
    return f"{base}/chat/completions" if base.endswith("/v1") else f"{base}/v1/chat/completions"


async def stream_reply(history: list[dict] | None, prompt: str) -> AsyncIterator[str]:
    """Yield potongan balasan. Fallback persona bila LLM tak tersedia."""
    url = _chat_url()
    body = _payload(_messages(history, prompt), stream=True)
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(LLM_TIMEOUT_SECONDS, connect=5.0)) as cx:
            async with cx.stream("POST", url, json=body, headers=_headers()) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    if LLM_PROVIDER.lower() == "ollama":
                        chunk = json.loads(line).get("message", {}).get("content", "")
                    else:
                        data = line.removeprefix("data: ").strip()
                        if data == "[DONE]":
                            break
                        try:
                            delta = json.loads(data)["choices"][0].get("delta", {})
                            chunk = delta.get("content") or ""
                        except Exception:
                            chunk = ""
                    if chunk:
                        yield chunk
                return
    except Exception:
        pass
    # Fallback: persona klinis lokal
    for word in _fallback_reply(prompt).split(" "):
        yield word + " "


async def generate_reply(history: list[dict] | None, prompt: str) -> str:
    chunks: list[str] = []
    async for chunk in stream_reply(history, prompt):
        chunks.append(chunk)
    return "".join(chunks).strip()


def _fallback_reply(prompt: str) -> str:
    p = prompt.lower()
    if any(w in p for w in ("halo", "hi", "hai", "selamat pagi", "selamat siang", "hello")):
        return ("Halo! Saya PsychoBot, asisten konseling klinis Anda. "
                "Bagaimana perasaan Anda hari ini? Adakah hal yang ingin Anda diskusikan?")
    if any(w in p for w in ("cemas", "panik", "deg-degan", "takut", "gugup")):
        return ("Kecemasan adalah respons alami tubuh saat menghadapi tekanan. Coba teknik grounding "
                "5-4-3-2-1 atau pernapasan teratur (tarik 4 detik, tahan 4, hembuskan 4). "
                "Apakah ada pemicu spesifik yang Anda rasakan saat ini?")
    if any(w in p for w in ("tidur", "insomnia", "begadang")):
        return ("Kualitas tidur sangat memengaruhi suasana hati. Batasi layar 1 jam sebelum tidur "
                "dan jaga jadwal tidur teratur. Sudah berapa lama Anda mengalami kesulitan tidur?")
    if any(w in p for w in ("terima kasih", "makasih", "thanks")):
        return "Sama-sama! Saya siap mendampingi jika ada hal lain yang ingin Anda ceritakan."
    return ("Terima kasih telah berbagi. Dalam konteks kesehatan mental, penting memahami akar "
            "penyebabnya secara bertahap. Apakah Anda ingin mengeksplorasi langkah praktis untuk mengelolanya?")
