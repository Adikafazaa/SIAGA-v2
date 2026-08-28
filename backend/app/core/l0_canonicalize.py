"""L0 - Input Canonicalizer (standar Unicode UTS #39).

Implementasi higiene input sesuai UTS #39 (``skeleton()`` / langkah
``internalSkeleton``): normalisasi NFKC, penghapusan karakter
``Default_Ignorable_Code_Point``, resolusi confusable homoglyph, dan
penyaringan Unicode Tag Block (U+E0000-U+E007F) untuk mencegah ASCII
smuggling.

ATURAN DOKUMENTASI (Bab 3 §3, ide #4): lapisan ini BUKAN klaim kebaruan.
Ia mengikuti standar industri dan harus disebut demikian di README /
panel "Kejujuran Klaim" dasbor.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field

# Unicode Tag Block: U+E0000 s/d U+E007F (ASCII smuggling, Rehberger 2024)
TAG_BLOCK_START = 0xE0000
TAG_BLOCK_END = 0xE007F
# Variation selectors juga Default_Ignorable (kategori Mn)
_VS_RANGES = ((0xFE00, 0xFE0F), (0xE0100, 0xE01EF))

# Peta confusable ringkas Cyrillic/Greek -> Latin (subset U+44 confusables.txt
# yang paling sering dipakai menyembunyikan payload; NFKC tidak menormalkan ini)
_CONFUSABLES = {
    # Cyrillic
    "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p",
    "\u0441": "c", "\u0443": "y", "\u0445": "x", "\u0456": "i",
    "\u0455": "s", "\u0458": "j", "\u04bb": "h", "\u04d1": "a",
    "\u0431": "b", "\u0432": "b", "\u0433": "r", "\u0434": "d",
    "\u0437": "3", "\u0438": "n", "\u043a": "k", "\u043b": "n",
    "\u043c": "m", "\u043d": "h", "\u0442": "t", "\u0444": "f",
    "\u0446": "u", "\u0447": "4", "\u0448": "w", "\u0449": "w",
    "\u044c": "b", "\u044b": "bl", "\u044e": "po", "\u0451": "e",
    "\u0460": "f", "\u0462": "s",
    # Greek
    "\u03bf": "o", "\u03b1": "a", "\u03b5": "e", "\u03c1": "p",
    "\u03bd": "v", "\u03c7": "x", "\u03b9": "i", "\u03ba": "k",
    "\u03c4": "t", "\u03c5": "u", "\u03c3": "s", "\u03c9": "w",
    "\u03b2": "b", "\u03b3": "y", "\u03b7": "n", "\u03bc": "m",
}


@dataclass
class L0Result:
    clean_text: str
    anomalies: list[str] = field(default_factory=list)


def _strip_default_ignorable(text: str) -> tuple[str, int]:
    """Buang Default_Ignorable_Code_Point: kategori Cf (zero-width, soft
    hyphen, joiner, BOM, tag char) dan variation selectors.

    Catatan: ZWNJ (U+200C) yang sah pada aksara Arab ikut terbuang - ini
    perilaku UTS #39 ``internalSkeleton`` dan dapat diterima untuk input
    keamanan kanal percakapan.
    """
    kept: list[str] = []
    removed = 0
    for ch in text:
        cp = ord(ch)
        ignorable = unicodedata.category(ch) == "Cf" or any(a <= cp <= b for a, b in _VS_RANGES)
        if ignorable:
            removed += 1
        else:
            kept.append(ch)
    return "".join(kept), removed


def _strip_tag_block(text: str) -> tuple[str, int]:
    kept: list[str] = []
    removed = 0
    for ch in text:
        if TAG_BLOCK_START <= ord(ch) <= TAG_BLOCK_END:
            removed += 1
        else:
            kept.append(ch)
    return "".join(kept), removed


def _resolve_confusables(text: str) -> tuple[str, bool]:
    resolved = "".join(_CONFUSABLES.get(ch, ch) for ch in text)
    return resolved, resolved != text


def canonicalize(raw_text: str) -> L0Result:
    """Bersihkan satu pesan mentah menjadi teks kanonik + daftar anomali."""
    anomalies: list[str] = []

    text, tag_count = _strip_tag_block(raw_text)
    if tag_count:
        # Jangan tulis kodepoint tersembunyi kembali ke respons (risiko
        # re-smuggling lewat kanal telemetri); cukup hitung.
        anomalies.append(f"unicode_tag_block_removed:{tag_count}")

    text, zw_count = _strip_default_ignorable(text)
    if zw_count:
        anomalies.append(f"default_ignorable_removed:{zw_count}")

    nfkc = unicodedata.normalize("NFKC", text)
    if nfkc != text:
        anomalies.append("nfkc_normalized")
    text = nfkc

    text, confusable = _resolve_confusables(text)
    if confusable:
        anomalies.append("homoglyph_confusable_resolved")

    return L0Result(clean_text=text, anomalies=anomalies)
