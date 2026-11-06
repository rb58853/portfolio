"""Deterministic checks on what the model writes, before the visitor sees it.

The input gate and the prompt make a violation unlikely; these checks make
the ones that still happen impossible to deliver. They only look for things
a portfolio answer never contains, so they can be strict without refusing
real answers: source code, data formats, verbatim instructions, the raw
knowledge base, links and addresses the knowledge does not contain, and
names that must stay private.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from enum import StrEnum


class ViolationKind(StrEnum):
    """Why a reply cannot be delivered."""

    BLOCKED_TERM = "blocked_term"
    CODE = "code"
    LEAK = "leak"
    KNOWLEDGE_DUMP = "knowledge_dump"
    UNKNOWN_LINK = "unknown_link"


@dataclass(frozen=True, slots=True)
class Violation:
    """One reason to discard a reply, with the text that triggered it."""

    kind: ViolationKind
    detail: str


# Each pattern needs a structural character (bracket, colon, equals, quote)
# that prose does not put in that position, so a sentence that merely starts
# with "class" or "import" is not mistaken for code. Keywords that are not
# English or Spanish words (def, const, function...) are matched anywhere in
# a line; the others only where a statement starts.
_CODE_PATTERNS = [
    re.compile(pattern, re.MULTILINE)
    for pattern in (
        r"```|~~~",
        r"\b(?:async\s+)?(?:def|fn|func|function)\s+\w+\s*\(",
        r"^\s*class\s+\w+\s*[:({]",
        r"^\s*(?:import\s+[\w.]+(?:\s+as\s+\w+)?|from\s+[\w.]+\s+import\s+[\w*, ]+)\s*$",
        r"\b(?:const|let|var)\s+\w+\s*=",
        r"\b(?:(?:public|private|protected|internal|static|final|override)\s+)+[\w<>\[\],.?]+\s+\w+\s*[({=;]",
        r"^\s*#include\s*<",
        r"\b(?:self|this)\.\w+\s*=",
        r"^\s*\w+(?:\[[^\]\n]*\])?\s*=\s*[\[{(]",
        r"\b(?:print|console\.log|System\.out\.println|printf|echo)\s*\(",
        r"=>\s*[{(]",
        r"^\s*[\[\]{}()][,;]?\s*$",
        r"^\s*\"[^\"\n]{1,60}\"\s*:",
        r"[\[{]\s*\"[^\"\n]{1,60}\"\s*:",
        r"\b(?:SELECT\s+[\w*, ]+\s+FROM|INSERT\s+INTO|CREATE\s+TABLE|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b",
        r"^\s*(?:graph|flowchart|sequenceDiagram|classDiagram|erDiagram)\b",
        r"<(?!projects\b)[a-zA-Z][\w-]*(?:\s[^<>\n]*)?>",
        r"`[^`\n]*(?:[=;{}]|\w\()[^`\n]*`",
    )
]

# Verbatim run of words from the instructions that counts as quoting them.
# Long enough that an answer restating the assistant's purpose, or saying it
# is an AI as the instructions ask, does not trip it; a copied rule does.
_SHINGLE_WORDS = 12
# Lines copied verbatim from the rendered knowledge base before the reply
# counts as a dump of it rather than an answer that uses it.
_DUMP_LINES = 3

_WORD = re.compile(r"\w+")
# Every way a reply can make the browser open an address: explicit schemes,
# bare "www." hosts and e-mail addresses (both autolinked by the markdown
# renderer), and any markdown link target, protocol-relative ones included.
_URL = re.compile(r"(?:https?://|mailto:|www\.)[^\s<>()\[\]\"'`]+", re.IGNORECASE)
_LINK_TARGET = re.compile(r"\]\(\s*<?([^)\s>]+)")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_SEPARATOR = r"[\W_]*"

# Latin look-alikes from other scripts that NFKC does not fold.
_CONFUSABLES = str.maketrans(
    "аеорсухіјѕԁӏвкмнтАЕОРСУХІЈЅВКМНТαεοτυικνρχΑΕΟΤΥΙΚΝΡΧΜΒΗΖ",
    "aeopcyxijsdlbkmhtaeopcyxijsbkmhtaeotuikvpxaeotyiknpxmbhz",
)


def _visible(text: str) -> str:
    """``text`` without invisible format characters, with one kind of line break."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return "".join(char for char in text if unicodedata.category(char) != "Cf")


def _plain(text: str) -> str:
    """Folded form for name matching: NFKC, case-folded, look-alikes mapped to Latin."""
    return unicodedata.normalize("NFKC", _visible(text)).translate(_CONFUSABLES).casefold()


def _term_pattern(term: str) -> re.Pattern[str]:
    # Letters of the term in order with any separators between them ("Pro
    # mart", "a.c.m.e", "A - C - M - E"), but whole words only, so a term never
    # matches across ordinary words ("if more" is not "ifm").
    letters = [re.escape(char) for char in _plain(term) if not char.isspace()]
    return re.compile(r"(?<!\w)" + _SEPARATOR.join(letters) + r"(?!\w)")


def _shingles(text: str) -> set[tuple[str, ...]]:
    words = _WORD.findall(text.lower())
    return {tuple(words[i : i + _SHINGLE_WORDS]) for i in range(len(words) - _SHINGLE_WORDS + 1)}


def _record_lines(text: str) -> set[str]:
    """Key/value lines of a YAML document, without indentation or list dashes."""
    lines = (line.strip().removeprefix("- ").strip() for line in text.splitlines())
    return {line for line in lines if re.match(r"^[\w-]+:\s+\S", line)}


def _address_key(address: str) -> str:
    """Comparable form of a link: no scheme, no "www.", no trailing slash or punctuation."""
    key = address.lower().rstrip(".,;:!?/")
    key = re.sub(r"^(?:https?:)?//", "", key)
    return key.removeprefix("www.")


class OutputGuard:
    """Decide whether a (possibly partial) reply may be shown to the visitor."""

    def __init__(
        self,
        *,
        blocked_terms: list[str],
        protected_prompts: list[str],
        knowledge_context: str,
        canary: str,
    ) -> None:
        """Prepare the checks.

        Args:
            blocked_terms: Names that must never appear, in any disguise.
            protected_prompts: Instruction texts that must never be quoted.
            knowledge_context: Knowledge base exactly as the prompt renders it.
            canary: Random marker planted in the instructions; seeing it in a
                reply proves the instructions are being copied out.
        """
        self._blocked_terms = [_plain(term) for term in blocked_terms if term.strip()]
        self._blocked_patterns = [_term_pattern(term) for term in self._blocked_terms]
        self._protected = set().union(*(_shingles(prompt) for prompt in protected_prompts))
        self._knowledge_lines = _record_lines(knowledge_context)
        self._knowledge_links = {_address_key(url) for url in _URL.findall(knowledge_context)}
        self._knowledge_emails = {email.lower() for email in _EMAIL.findall(knowledge_context)}
        self._canary = canary.lower()

    @property
    def canary(self) -> str:
        """Marker to plant in the instructions; seeing it in a reply is a leak."""
        return self._canary

    @property
    def blocked_terms(self) -> tuple[str, ...]:
        """Names that must never appear, in folded form."""
        return tuple(self._blocked_terms)

    @property
    def holdback(self) -> int:
        """Characters to keep unsent so a literal match is caught before any of it leaves."""
        return max(len(literal) for literal in [self._canary, "```", *self._blocked_terms]) - 1

    def blocked_terms_in(self, text: str) -> list[str]:
        """Blocked terms present in ``text``, also when case, width, invisible
        characters, look-alike letters or separators disguise them."""
        plain = _plain(text)
        return [
            term
            for term, pattern in zip(self._blocked_terms, self._blocked_patterns, strict=True)
            if pattern.search(plain)
        ]

    def _unknown_link(self, text: str, complete: bool) -> str | None:
        """First address in ``text`` the knowledge base does not contain."""
        found = [(match.end(), match.group(0), False) for match in _URL.finditer(text)]
        found += [(match.end(1), match.group(1), False) for match in _LINK_TARGET.finditer(text)]
        found += [(match.end(), match.group(0), True) for match in _EMAIL.finditer(text)]

        for end, address, is_email in found:
            if not complete and end == len(text):
                continue  # Still being written.
            if is_email or address.lower().startswith("mailto:"):
                email = address.lower().removeprefix("mailto:").rstrip(".,;:!?")
                known = email in self._knowledge_emails
            else:
                known = _address_key(address) in self._knowledge_links
            if not known:
                return address
        return None

    def check(self, text: str, complete: bool = False) -> Violation | None:
        """Return the first reason ``text`` cannot be shown, or ``None``.

        Safe to call on a partial reply: every check only fires on text that
        is already wrong, never on a prefix of a valid answer.

        Args:
            text: Reply text as far as the model has written it.
            complete: Whether ``text`` is the whole reply. A partial reply may
                end in the middle of a link, which is not judged yet.

        Returns:
            Violation | None: What is wrong, or ``None`` when the text is fine.
        """
        if terms := self.blocked_terms_in(text):
            return Violation(ViolationKind.BLOCKED_TERM, terms[0])

        text = _visible(text)
        for pattern in _CODE_PATTERNS:
            if match := pattern.search(text):
                return Violation(ViolationKind.CODE, match.group(0).strip()[:40])

        if self._canary and self._canary in text.lower():
            return Violation(ViolationKind.LEAK, "canary")
        if quoted := self._protected & _shingles(text):
            return Violation(ViolationKind.LEAK, " ".join(next(iter(quoted))))

        copied = _record_lines(text) & self._knowledge_lines
        if len(copied) >= _DUMP_LINES:
            return Violation(ViolationKind.KNOWLEDGE_DUMP, next(iter(copied))[:40])

        # The assistant speaks as the engineer: a link it made up is a claim
        # he never made, and possibly a phishing page under his name.
        if link := self._unknown_link(text, complete):
            return Violation(ViolationKind.UNKNOWN_LINK, link[:60])
        return None
