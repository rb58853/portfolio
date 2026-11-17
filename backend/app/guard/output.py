"""Deterministic checks on what the model writes, before the visitor sees it.

The input gate and the prompt make a violation unlikely; these checks make
the ones that still happen impossible to deliver. They only look for things
a portfolio answer never contains, so they can be strict without refusing
real answers: source code, data formats, verbatim instructions, the raw
knowledge base, links and addresses the knowledge does not contain, and
names that must stay private.
"""

from __future__ import annotations

import html
import re
import unicodedata
from dataclasses import dataclass
from enum import StrEnum
from urllib.parse import unquote


class ViolationKind(StrEnum):
    """Why a reply cannot be delivered."""

    BLOCKED_TERM = "blocked_term"
    CODE = "code"
    LEAK = "leak"
    KNOWLEDGE_DUMP = "knowledge_dump"
    UNKNOWN_LINK = "unknown_link"
    UNKNOWN_PHONE = "unknown_phone"
    UNKNOWN_AMOUNT = "unknown_amount"
    INTERNAL_ID = "internal_id"
    # Set by the chat session: a decline repeats the message it declines.
    ECHO = "echo"
    # Set by the chat session, not by this guard: a decline grew into an answer.
    TOO_LONG = "too_long"


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
        # The delimiter row of a markdown table: a data format, not prose.
        r"^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$",
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
# Schemes a markdown renderer or a browser turns into a link, written without
# "//" too ("http:host/path" is a valid autolink target).
_SCHEME = re.compile(
    r"(?<![\w.+-])(?:https?|ircs?|xmpp|mailto|ftps?|sftp|tel|sms|data|javascript|vbscript|file|wss?):"
    r"(?!\s)[^\s<>()\[\]\"'`]+",
    re.IGNORECASE,
)
# CommonMark autolinks take any scheme: <scheme:anything>.
_AUTOLINK = re.compile(r"<\s*([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s<>]*)\s*>")
# Reference-style link definitions: "[label]: target" on a line of its own.
_REFERENCE = re.compile(r"^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*<?([^\s>]+)", re.MULTILINE)
# A phone number: 9 to 15 digits with at most one separator between them, not
# inside an address. Year ranges and metrics have fewer digits.
# Any Unicode space counts: models often write numbers with narrow no-break spaces.
_PHONE = re.compile(r"(?<![\w/+.])\+?\d(?:[\s().\-\u2010-\u2015]?\d){8,14}(?![\w])")
# An amount of money: a currency sign or word next to a number.
_AMOUNT = re.compile(
    r"[€$£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:€|\$|£|k€|(?:eur|euros?|usd|dollars?|d[oó]lares|pounds?|libras)\b)",
    re.IGNORECASE,
)
# A backslash escape of ASCII punctuation, which markdown renders as the bare character.
_MARKDOWN_ESCAPE = re.compile(r"\\([!-/:-@\[-`{-~])")
_SEPARATOR = r"[\W_]*"

# Latin look-alikes from other scripts that NFKC does not fold.
_CONFUSABLES = str.maketrans(
    "аеорсухіјѕԁӏвкмнтԝһԛАЕОРСУХІЈЅВКМНТαεοτυικνρχΑΕΟΤΥΙΚΝΡΧΜΒΗΖօսոհյ"
    "ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘʀꜱᴛᴜᴠᴡʏᴢ",
    "aeopcyxijsdlbkmhtwhqaeopcyxijsbkmhtaeotuikvpxaeotyiknpxmbhzounhj"
    "abcdefghijklmnoprstuvwyz",
)
# Digits and signs written for letters ("4cm3"). Names that contain digits
# are matched on the text as written too, so this fold never hides them.
_LEET = (str.maketrans("4@3105$7|", "aaeiosstl"), str.maketrans("4@3105$7|", "aaelosstl"))


def _visible(text: str) -> str:
    """``text`` without invisible format characters, with one kind of line break."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return "".join(char for char in text if unicodedata.category(char) != "Cf")


def _plain(text: str) -> str:
    """Folded form for name matching: NFKC, accents dropped, look-alikes mapped to Latin, case-folded.

    Accents are dropped one character at a time, so the folded text keeps
    the length of the (normalised) original and spans map back onto it.
    """
    text = unicodedata.normalize("NFKC", _visible(text))
    text = "".join(unicodedata.normalize("NFD", char)[0] for char in text)
    return text.translate(_CONFUSABLES).casefold()


def _term_pattern(term: str) -> re.Pattern[str]:
    # Letters of the term in order with any separators between them ("Pro
    # mart", "a.c.m.e", "A - C - M - E"), starting a word. A term of four or
    # more letters may carry a suffix ("Acmes", "AcmeV8"); a shorter one must
    # end the word, so it never matches inside ordinary words.
    letters = [re.escape(char) for char in _plain(term) if not char.isspace()]
    if len(letters) >= 4:
        # Long enough to be distinctive inside a word too ("PPAcmeE", "AcmeV8").
        return re.compile(_SEPARATOR.join(letters))
    return re.compile(r"(?<!\w)" + _SEPARATOR.join(letters) + r"(?!\w)")


def _real_match(term: str, match: re.Match[str]) -> bool:
    """Whether a pattern match is the term and not ordinary words that happen to spell it.

    A short term spelled across words ("ac me" for a four-letter "acme") is
    ordinary text unless every piece is a single letter ("a c m e").
    """
    pieces = [re.sub(r"\W", "", piece) for piece in match.group(0).split()]
    return len(pieces) <= 1 or len(term) > 5 or all(len(piece) <= 1 for piece in pieces)


def _readings(text: str) -> list[str]:
    """``text`` folded for name matching: as written, with digits read as letters,
    and with HTML entities resolved (the renderer shows "AC&#77;E" as a name)."""
    plain = _plain(text)
    readings = [plain, *(plain.translate(table) for table in _LEET)]
    unescaped = html.unescape(text)
    if unescaped != text:
        readings.append(_plain(unescaped))
    return readings


def _shingles(text: str) -> set[tuple[str, ...]]:
    words = _WORD.findall(text.lower())
    return {tuple(words[i : i + _SHINGLE_WORDS]) for i in range(len(words) - _SHINGLE_WORDS + 1)}


def _record_lines(text: str) -> set[str]:
    """Key/value lines of a YAML document, without indentation, list markers or emphasis.

    "- **title**: Cell" in a reply is the knowledge line "title: Cell".
    """
    lines = (re.sub(r"^\s*(?:[-*+]|\d+[.)])\s+", "", line).replace("*", "").replace("`", "").strip() for line in text.splitlines())
    return {line for line in lines if re.match(r"^[\w-]+:\s+\S", line)}


def _address_key(address: str) -> str:
    """Comparable form of a link: no scheme, no "www.", no emphasis marks, trailing slash or punctuation."""
    key = unquote(address).lower().strip("*_~<>").rstrip(".,;:!?/*_~)")
    key = re.sub(r"^(?:https?:)?/*", "", key)
    return key.removeprefix("www.")


def _digits(text: str) -> str:
    return re.sub(r"\D", "", text)


def _amount_key(text: str) -> str:
    """The number of an amount, with one decimal separator: "1.500,00 €" and "1500.00" agree."""
    number = re.sub(r"[^\d.,]", "", text).strip(".,")
    return number.replace(",", ".")


def _rendered(text: str) -> str:
    """``text`` as the browser will show it: HTML entities and markdown escapes resolved.

    A link check that reads the markdown source misses "https\\://evil" or
    "https&#58;//evil", which the renderer turns into working links.
    """
    return html.unescape(_MARKDOWN_ESCAPE.sub(r"\1", text))


class OutputGuard:
    """Decide whether a (possibly partial) reply may be shown to the visitor."""

    def __init__(
        self,
        *,
        blocked_terms: list[str],
        protected_prompts: list[str],
        knowledge_context: str,
        canary: str,
        internal_ids: tuple[str, ...] | list[str] = (),
    ) -> None:
        """Prepare the checks.

        Args:
            blocked_terms: Names that must never appear, in any disguise.
            protected_prompts: Instruction texts that must never be quoted.
            knowledge_context: Knowledge base exactly as the prompt renders it.
            canary: Random marker planted in the instructions; seeing it in a
                reply proves the instructions are being copied out.
            internal_ids: Identifiers that belong in the cards block only,
                never in the text a visitor reads.
        """
        self._blocked_terms = [_plain(term) for term in blocked_terms if term.strip()]
        self._blocked_patterns = [_term_pattern(term) for term in self._blocked_terms]
        self._protected = set().union(*(_shingles(prompt) for prompt in protected_prompts))
        self._knowledge_lines = _record_lines(knowledge_context)
        known = _URL.findall(knowledge_context)
        self._knowledge_links = {_address_key(url) for url in known}
        # A known link written with its encoded spaces as real spaces is still that link.
        self._spelled_links = {unquote(url): url for url in known if unquote(url) != url}
        self._knowledge_emails = {email.lower() for email in _EMAIL.findall(knowledge_context)}
        # Phone numbers and amounts are facts like links: only the knowledge's own may appear.
        # Digits inside the knowledge's links count too (a WhatsApp link holds the number).
        self._knowledge_phones = {_digits(match) for match in _PHONE.findall(knowledge_context)}
        self._knowledge_phones |= {run for run in re.findall(r"\d{9,15}", knowledge_context)}
        self._knowledge_amounts = {_amount_key(match) for match in _AMOUNT.findall(knowledge_context)}
        self._canary = canary.lower()
        self._internal_ids = re.compile(r"\b(?:" + "|".join(map(re.escape, internal_ids)) + r")\b") if internal_ids else None

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
        readings = _readings(text)
        return [
            term
            for term, pattern in zip(self._blocked_terms, self._blocked_patterns, strict=True)
            if any(_real_match(term, match) for reading in readings for match in pattern.finditer(reading))
        ]

    def mask_blocked_terms(self, text: str, placeholder: str) -> str:
        """``text`` with every blocked term replaced by ``placeholder``.

        The visitor's own words are kept where the folding keeps their length
        (the usual case, since the text is already normalised); otherwise the
        folded text is returned.
        """
        # Entities resolved first, as the visitor's browser would show them.
        text = html.unescape(text)
        readings = _readings(text)
        spans = sorted(
            {
                (
                    match.start() - len(re.search(r"\w*$", reading[: match.start()]).group(0)),
                    match.end() + len(re.match(r"\w*", reading[match.end() :]).group(0)),
                )
                for term, pattern in zip(self._blocked_terms, self._blocked_patterns, strict=True)
                for reading in readings
                for match in pattern.finditer(reading)
                if _real_match(term, match)
            }
        )
        if not spans:
            return text
        base = text if len(readings[0]) == len(text) else readings[0]
        masked, last = [], 0
        for start, end in spans:
            if start < last:
                continue  # Overlaps a span already replaced.
            masked.append(base[last:start] + placeholder)
            last = end
        return "".join(masked) + base[last:]

    def _unknown_link(self, text: str, complete: bool) -> str | None:
        """First address in ``text`` the knowledge base does not contain.

        Reads the text as the browser renders it, and every form the renderer
        turns into a link: bare URLs and "www.", e-mail addresses, any scheme
        (also without "//"), inline and reference links, and autolinks.
        """
        text = _rendered(text)
        for spelled, canonical in self._spelled_links.items():
            text = text.replace(spelled, canonical)
        found = [(match.end(), match.group(0), False) for match in _URL.finditer(text)]
        found += [(match.end(), match.group(0), False) for match in _SCHEME.finditer(text)]
        found += [(match.end(1), match.group(1), False) for match in _LINK_TARGET.finditer(text)]
        found += [(match.end(1), match.group(1), False) for match in _AUTOLINK.finditer(text)]
        found += [(match.end(1), match.group(1), False) for match in _REFERENCE.finditer(text)]
        found += [(match.end(), match.group(0), True) for match in _EMAIL.finditer(text)]

        for end, address, is_email in found:
            if not complete and end == len(text):
                continue  # Still being written.
            if is_email or address.lower().startswith("mailto:"):
                email = address.lower().removeprefix("mailto:").strip("*_~<>").rstrip(".,;:!?*_~")
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

        # The canary spelled out, spaced or reversed is still the canary.
        squashed = re.sub(r"[\W_]+", "", text.lower())
        if self._canary and (self._canary in squashed or self._canary[::-1] in squashed):
            return Violation(ViolationKind.LEAK, "canary")
        if quoted := self._protected & _shingles(text):
            return Violation(ViolationKind.LEAK, " ".join(next(iter(quoted))))

        if self._internal_ids and (found := self._internal_ids.search(text)):
            return Violation(ViolationKind.INTERNAL_ID, found.group(0))

        copied = _record_lines(text) & self._knowledge_lines
        if len(copied) >= _DUMP_LINES:
            return Violation(ViolationKind.KNOWLEDGE_DUMP, next(iter(copied))[:40])

        # The assistant speaks as the engineer: a link it made up is a claim
        # he never made, and possibly a phishing page under his name.
        if link := self._unknown_link(text, complete):
            return Violation(ViolationKind.UNKNOWN_LINK, link[:60])
        if phone := self._unknown_phone(text, complete):
            return Violation(ViolationKind.UNKNOWN_PHONE, phone[:40])
        if amount := self._unknown_amount(text, complete):
            return Violation(ViolationKind.UNKNOWN_AMOUNT, amount[:40])
        return None

    def _unknown_phone(self, text: str, complete: bool) -> str | None:
        """First phone number in ``text`` that is not one of the knowledge's own."""
        text = _rendered(text)
        for match in _PHONE.finditer(text):
            if not complete and match.end() == len(text):
                continue  # Still being written.
            digits = _digits(match.group(0))
            if not any(known.endswith(digits) or digits.endswith(known) for known in self._knowledge_phones):
                return match.group(0)
        return None

    def _unknown_amount(self, text: str, complete: bool) -> str | None:
        """First amount of money in ``text`` that the knowledge does not state.

        A rate, salary or price in the engineer's voice is a commitment he
        never made; a visitor message cannot supply one either.
        """
        text = _rendered(text)
        for match in _AMOUNT.finditer(text):
            if not complete and match.end() == len(text):
                continue
            if _amount_key(match.group(0)) not in self._knowledge_amounts:
                return match.group(0)
        return None
