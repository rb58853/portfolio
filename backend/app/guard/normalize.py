"""Canonical form of visitor text, so every later check sees what the model sees."""

from __future__ import annotations

import re
import unicodedata

_WHITESPACE = re.compile(r"[^\S\n]+")
_BLANK_LINES = re.compile(r"\n{3,}")


def _visible(char: str) -> bool:
    # Format characters (Cf: zero-width spaces and joiners, bidi overrides, the
    # BOM, tag characters) render as nothing and only serve to split words a
    # filter looks for. Other control characters (Cc) are noise, except the
    # newline the visitor typed.
    category = unicodedata.category(char)
    return char == "\n" or category not in ("Cf", "Cc")


def normalize(text: str) -> str:
    """Return ``text`` in NFKC form without invisible characters or runs of spaces.

    NFKC folds compatibility look-alikes (full-width letters, ligatures,
    mathematical alphanumerics) into plain characters. It does not fold
    cross-script homoglyphs (Cyrillic "а" for Latin "a"); the input
    classifier, which reads meaning rather than spelling, covers those.

    Args:
        text: Raw visitor message.

    Returns:
        str: The cleaned message, stripped at both ends.
    """
    text = unicodedata.normalize("NFKC", text)
    # A tab separates words; dropped as a control character, it would join them.
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    text = "".join(char for char in text if _visible(char))
    text = _WHITESPACE.sub(" ", text)
    return _BLANK_LINES.sub("\n\n", text).strip()
