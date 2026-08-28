"""L2 - Context & URL Risk Evaluator (Bab 3: reputasi URL, homograf domain,
riwayat pengirim, anomali burst rate).

Berjalan offline (mode offline wajib, Bab 5 §9): umur domain nyata butuh
WHOIS/DNS, jadi v0 memakai sinyal deterministik dari teks + riwayat sesi.
Umur domain via API eksternal masuk Fase 2.
"""
from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass

_URL = re.compile(r"https?://[^\s\"'<>)\]]+", re.IGNORECASE)

# TLD berisiko tinggi (spam/abuse feed umum; statis, offline)
_RISKY_TLD = {".zip", ".mov", ".top", ".xyz", ".click", ".loan", ".rest", ".icu"}
# Domain penyingkat - menyembunyikan tujuan nyata
_SHORTENERS = {"bit.ly", "t.co", "tinyurl.com", "cutt.ly", "s.id", "shorturl.at", "is.gd", "rb.gy"}


@dataclass
class L2Signal:
    context_risk: float
    notes: list[str]


def _domain_of(url: str) -> str:
    m = re.match(r"https?://([^/:?#]+)", url, re.IGNORECASE)
    return (m.group(1) if m else "").lower().rstrip(".")


def evaluate_urls(text: str) -> tuple[float, list[str]]:
    """Skor risiko URL 0..1 + catatan anomali."""
    notes: list[str] = []
    urls = _URL.findall(text)
    if not urls:
        return 0.0, notes

    risk = 0.0
    for url in urls:
        domain = _domain_of(url)
        try:
            ipaddress.ip_address(domain)
            risk += 0.55
            notes.append(f"url_ip_literal:{domain}")
            continue
        except ValueError:
            pass
        if domain.startswith("xn--") or ".xn--" in domain:
            # Punycode = kandidat homograf domain (Bab 3 L2)
            risk += 0.50
            notes.append(f"punycode_domain:{domain}")
        if domain in _SHORTENERS:
            risk += 0.40
            notes.append(f"url_shortener:{domain}")
        if any(domain.endswith(t) for t in _RISKY_TLD):
            risk += 0.25
            notes.append(f"risky_tld:{domain}")

    if len(urls) >= 3:
        risk += 0.20
        notes.append(f"url_burst:{len(urls)}")

    return float(min(1.0, risk)), notes


def evaluate_burst(turns_last_minute: int) -> tuple[float, list[str]]:
    """Anomali burst rate pengirim (DoS / bot terotomatisasi, PRD §12)."""
    notes = []
    if turns_last_minute >= 20:
        notes.append(f"burst_rate:{turns_last_minute}/min")
        return 0.8, notes
    if turns_last_minute >= 10:
        notes.append(f"burst_rate:{turns_last_minute}/min")
        return 0.4, notes
    return 0.0, notes


def evaluate(text: str, turns_last_minute: int = 0) -> L2Signal:
    url_risk, notes = evaluate_urls(text)
    burst_risk, burst_notes = evaluate_burst(turns_last_minute)
    notes.extend(burst_notes)
    risk = min(1.0, url_risk + burst_risk)
    return L2Signal(context_risk=risk, notes=notes)
