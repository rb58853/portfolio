"""Detect requests hidden in an encoding, before any model reads them.

A visitor asking about a portfolio has no reason to send base64 or hex that
decodes to readable text, while "decode this and do what it says" is a
classic way past filters that read the surface form. Deciding this in code
costs nothing and cannot be talked out of.
"""

from __future__ import annotations

import base64
import binascii
import re

# Long enough that ordinary words, ids and short hashes never qualify.
_BASE64 = re.compile(r"[A-Za-z0-9+/_-]{20,}={0,2}")
_HEX = re.compile(r"\b(?:[0-9a-fA-F]{2}[\s:]?){12,}")
_MIN_DECODED = 12
_MIN_PRINTABLE = 0.9


def _readable(raw: bytes) -> bool:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return False
    if len(text) < _MIN_DECODED:
        return False
    printable = sum(char.isprintable() or char.isspace() for char in text)
    letters = sum(char.isalpha() for char in text)
    return printable / len(text) >= _MIN_PRINTABLE and letters >= len(text) / 3


def _base64(token: str) -> bytes | None:
    # A plain word or identifier is not base64: real payloads mix cases and digits.
    if not (re.search(r"[a-z]", token) and re.search(r"[A-Z]", token) and re.search(r"\d", token)):
        return None
    padded = token + "=" * (-len(token) % 4)
    for decode in (base64.b64decode, base64.urlsafe_b64decode):
        try:
            return decode(padded)
        except (binascii.Error, ValueError):
            continue
    return None


def hidden_payload(text: str) -> bool:
    """Whether ``text`` carries base64 or hex that decodes to readable text.

    Args:
        text: Normalised visitor message.

    Returns:
        bool: ``True`` when some encoded run decodes to readable text.
    """
    for match in _BASE64.finditer(text):
        decoded = _base64(match.group(0))
        if decoded is not None and _readable(decoded):
            return True
    for match in _HEX.finditer(text):
        digits = re.sub(r"[\s:]", "", match.group(0))
        if len(digits) % 2 == 0 and _readable(bytes.fromhex(digits)):
            return True
    return False
