"""One visitor conversation: gate, prompt assembly, streamed LLM call and reply validation.

A message goes through four layers, each able to stop what the previous one
missed:

1. Normalisation removes invisible characters and folds look-alike forms,
   so every later check reads what the model reads. A request hidden in an
   encoding is refused here, in code.
2. The input gate classifies the message. Code, not the model, decides the
   route: answer it, answer a canonical question in its place, write a short
   decline that takes up what the visitor asked, or send a fixed refusal.
3. The model answers under a fixed output contract.
4. The output guard checks the answer while it streams, and only whole lines
   are released, so no line reaches the visitor before it is checked. A
   violation discards what was shown, the model retries once, then a fixed
   reply is sent.

Only delivered, validated answers enter the history, so a refused, declined
or broken turn can never serve as an example for the next one. The session
keeps its last declines apart, only so the next one is worded differently,
and the last decline or refusal it sent for one more turn, so a visitor who
accepts what it offered ("yes, tell me") is understood. The message that was
declined is never kept.
"""

from __future__ import annotations

import json
import logging
import re
from collections import deque
from contextlib import aclosing
from dataclasses import dataclass
from datetime import date
from enum import Enum, auto
from pathlib import Path
from typing import Any, AsyncGenerator, TypedDict

import yaml

from app.guard import (
    Category,
    InputGate,
    Language,
    OutputGuard,
    Topic,
    Verdict,
    Violation,
    ViolationKind,
    hidden_payload,
    normalize,
)
from app.knowledge import Knowledge
from app.llm import LLM, LLMError, parse_json_object

logger = logging.getLogger(__name__)

_PROMPTS = yaml.safe_load((Path(__file__).with_name("prompts.yaml")).read_text(encoding="utf-8"))
_DELIMITER: str = _PROMPTS["delimiter"]
# Tolerates the spacing a model may get wrong ("<projects >"), so the cards
# block is never mistaken for answer text.
_DELIMITER_PATTERN = re.compile(r"<\s*projects\s*>", re.IGNORECASE)
_MAX_PROJECTS = 4
_ATTEMPTS = 2
_TEMPERATURE = 0.3
_RETRY_TEMPERATURE = 0.1
# A decline is two or three sentences. Warmer sampling keeps consecutive ones
# from reading alike; a draft past the length cap is answering the request.
_DECLINE_TEMPERATURE = 0.7
_DECLINE_MAX_CHARS = 600
_RECENT_DECLINES = 3
# A decline repeating this many consecutive words of the visitor's message is
# carrying the visitor's text: it is replaced by the fixed reply.
_DECLINE_ECHO_WORDS = 5
# Longest past question and answer sent back to the model as history.
_HISTORY_QUESTION_CHARS = 500
_HISTORY_ANSWER_CHARS = 2500
# Lines are released whole. A paragraph longer than this is released up to
# its last finished sentence, so long answers still stream.
_LONG_LINE = 200
_SENTENCE_END = re.compile(r"[.!?…](?=\s)")

_VIOLATION_NAMES = {
    ViolationKind.CODE: "code or a data format",
    ViolationKind.LEAK: "text copied from your instructions",
    ViolationKind.KNOWLEDGE_DUMP: "raw lines copied from the knowledge block",
    ViolationKind.UNKNOWN_LINK: "a link that is not in the knowledge block",
    ViolationKind.TOO_LONG: "far more than a two or three sentence decline",
    ViolationKind.UNKNOWN_PHONE: "a phone number that is not in the knowledge block",
    ViolationKind.UNKNOWN_AMOUNT: "a price, rate or amount of money that is not in the knowledge block",
    ViolationKind.INTERNAL_ID: "a project id in the answer text; refer to projects by their title",
    ViolationKind.ECHO: "the visitor's own words repeated",
}

# Rejected drafts that point at the visitor pushing the model. A made-up link
# or an overlong decline is usually the model's own slip: it is retried, but
# the visitor is not struck for it.
# A blocked name is not among them: striking it would tell the visitor which
# names are blocked.
_STRIKING_VIOLATIONS = frozenset({ViolationKind.CODE, ViolationKind.LEAK, ViolationKind.KNOWLEDGE_DUMP})

# Why a declined message is outside the chat, as the decline prompt states it.
_DECLINE_REASONS = {
    Category.OFF_TOPIC: "off_topic",
    Category.ROLEPLAY: "roleplay",
    Category.FORMAT_HIJACK: "format",
    Category.SIDE_TASK: "off_topic",
}
# Lead that opens a reframed answer, by what the canonical question replaced.
_REFRAME_LEADS = {
    Category.FORMAT_HIJACK: "format",
    Category.ROLEPLAY: "voice",
    Category.SIDE_TASK: "side",
}
# What a decline may know about the message it declines: the classifier's
# one-line description, without quotes, numbers or addresses, never the text.
_QUOTED = re.compile(r"[\"“”«»„‹›'‘’`][^\"“”«»„‹›'‘’`]*[\"“”«»„‹›'‘’`]")
_DESCRIPTION_NOISE = re.compile(r"\S*(?:://|www\.|@)\S*|\d{3,}|[<>{}\[\]]")
_DEFAULT_DESCRIPTION = "a request unrelated to Raúl's professional profile"

# Language a decline is written in, by the gate's reading of the message.
_LANGUAGE_NAMES = {Language.ES: "Spanish", Language.EN: "English"}
# Fixed reply for each category that is refused without calling the model.
_REFUSALS = {
    Category.JAILBREAK: "jailbreak",
    Category.PROMPT_EXTRACTION: "extraction",
}


class Reply(TypedDict):
    """Complete answer: markdown text plus the project cards to show."""

    response: str
    projects: dict[str, str]


class Route(Enum):
    """What the session does with a message, chosen from the gate verdict."""

    ANSWER = auto()
    REFRAME = auto()
    DECLINE = auto()
    REFUSE = auto()


def route(verdict: Verdict) -> Route:
    """Map a gate verdict to an action. The whole policy decision lives here.

    A question about the engineer asked in a forbidden form or voice is not
    refused: it is answered as the plain question on the same topic, so the
    model never reads the request for that form. A message that is simply
    outside the chat's purpose gets a short decline written for it. Attempts
    on the rules or the instructions never reach the model: they get a fixed
    refusal.
    """
    if verdict.category is Category.SAFE:
        return Route.ANSWER
    if verdict.category in (Category.FORMAT_HIJACK, Category.ROLEPLAY, Category.SIDE_TASK):
        return Route.REFRAME if verdict.topic is not Topic.NONE else Route.DECLINE
    if verdict.category is Category.OFF_TOPIC:
        return Route.DECLINE
    return Route.REFUSE


@dataclass(frozen=True, slots=True)
class _Exchange:
    question: str
    answer: str


@dataclass(frozen=True, slots=True)
class _Done:
    """End of a generation: the reply to deliver, and whether it is a fixed text."""

    reply: Reply
    fixed: bool


class _Rejected(Exception):
    """The draft broke the output contract; it must not reach the visitor."""

    def __init__(self, violation: Violation) -> None:
        super().__init__(violation.kind.value)
        self.violation = violation


def instruction_texts() -> list[str]:
    """Instruction prompts a reply must never quote.

    The knowledge block and the examples are not among them: answers are
    meant to reuse both.
    """
    return [
        _PROMPTS[key]
        for key in (
            "persona", "output", "reminder", "retry", "decline", "decline_recent", "previous_offer", "masked_note", "blocked"
        )
    ]


def _split(raw: str) -> tuple[str, bool, str]:
    """Split model output into answer text, whether the cards block opened, and the block."""
    match = _DELIMITER_PATTERN.search(raw)
    if match is None:
        return raw, False, ""
    return raw[: match.start()], True, raw[match.end() :]


def _unix(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _lang(language: Language) -> str:
    return "es" if language is Language.ES else "en"


def _shared_run(text: str, source: str) -> int:
    """Longest run of consecutive words of ``source`` that ``text`` repeats."""
    words = re.findall(r"\w+", source.casefold())
    haystack = " " + " ".join(re.findall(r"\w+", text.casefold())) + " "
    best = 0
    for start in range(len(words)):
        end = start + best + 1
        while end <= len(words) and " " + " ".join(words[start:end]) + " " in haystack:
            best, end = end - start, end + 1
    return best


def _quote(text: str) -> str:
    """Visitor text as the model reads it: data that cannot close or open the prompt's tags.

    Angle brackets become look-alikes, so a message cannot end the knowledge
    block, open a fake one or write a cards block of its own.
    """
    return text.replace("<", "‹").replace(">", "›")


def _describe(rationale: str) -> str:
    """What a decline is told about the declined message: a cleaned one-line description.

    The classifier's rationale names the kind of request. Anything quoted,
    numbers, addresses and brackets are dropped, so a decline cannot repeat,
    translate or complete the visitor's text: it never sees it.
    """
    text = _DESCRIPTION_NOISE.sub(" ", _QUOTED.sub(" ", rationale))
    text = re.sub(r"\s+", " ", text).strip(" .,;:")[:160]
    return text or _DEFAULT_DESCRIPTION


def _releasable(text: str, limit: int) -> int:
    """End of the longest prefix of ``text`` that may be shown, at most ``limit``.

    Only whole lines are released, or whole sentences of a paragraph that has
    grown long, so every line is checked complete before any of it is shown.
    """
    limit = max(0, limit)
    start = text.rfind("\n", 0, limit) + 1
    cut = start
    if len(text) - start > _LONG_LINE:
        for match in _SENTENCE_END.finditer(text, start, limit):
            cut = match.end()
    return cut


class ChatSession:
    """Keep the history of one conversation and answer its messages."""

    def __init__(
        self,
        llm: LLM,
        knowledge: Knowledge,
        gate: InputGate,
        guard: OutputGuard,
        history_turns: int = 8,
    ) -> None:
        """Bind the session to its models, knowledge base and guards.

        Args:
            llm: LLM wrapper used for every reply.
            knowledge: Knowledge base the answers must come from.
            gate: Classifier every message passes before it is answered.
            guard: Checks every reply before it is shown; its canary is
                planted in the instructions.
            history_turns: Past question/answer pairs kept as context.
        """
        self.llm = llm
        self.knowledge = knowledge
        self.gate = gate
        self.guard = guard
        self.strikes = 0
        self._history: list[_Exchange] = []
        self._history_turns = history_turns
        # Declines delivered so far, shown to the model only so it words the
        # next one differently. They never enter the history.
        self._declines: deque[str] = deque(maxlen=_RECENT_DECLINES)
        # Declines asked for so far: each one opens in the next style in turn.
        self._declined = 0
        # The last decline or refusal sent, kept for one turn: it is not in the
        # history, yet it usually ends with an offer the visitor may accept.
        self._offer: str | None = None
        # Fixed texts sent so far: each one takes the next variant in turn.
        self._fixed_sent = 0
        # Text is released this many characters behind the model, so neither a
        # literal the guard looks for nor the delimiter is sent before it is seen.
        self._holdback = max(guard.holdback, len(_DELIMITER) - 1)

    def _variant(self, *choices: list[str]) -> tuple[str, ...]:
        """Take the next variant of one fixed text (of each list given, in parallel)."""
        index = self._fixed_sent
        self._fixed_sent += 1
        return tuple(variants[index % len(variants)] for variants in choices)

    def _fixed(self, key: str, language: str) -> str:
        """Next variant of the fixed reply ``key`` in ``language``."""
        return self._variant(_PROMPTS["replies"][key][language])[0]

    def _fixed_reframe(self, kind: str, language: str) -> str:
        """Next variant of the lead that opens a reframed answer (``format`` or ``voice``)."""
        return self._variant(_PROMPTS["replies"]["reframe"][kind][language])[0]

    @property
    def history(self) -> list[dict[str, str]]:
        """Delivered exchanges as chat messages, oldest first."""
        messages: list[dict[str, str]] = []
        for exchange in self._history:
            messages.append({"role": "user", "content": exchange.question})
            messages.append({"role": "assistant", "content": exchange.answer})
        return messages

    def _messages(self, question: str, notes: list[str], decline: bool = False) -> list[dict[str, str]]:
        """Full prompt: one static system message, history, question, then the reminder.

        Visitor text is quoted as data (see :func:`_quote`). A decline is
        written without the history: it only needs the description it is given.

        The rules sit in a single leading system message, the slot every
        gpt-oss chat template maps to the developer role. The reminder after
        the question relies on the provider keeping later system messages,
        which ``evals/provider.py`` checks.
        """
        system = "\n\n".join(
            [
                _PROMPTS["knowledge"].format(knowledge=self.knowledge.context),
                _PROMPTS["persona"].format(canary=self.guard.canary, today=date.today().isoformat()),
                _PROMPTS["examples"],
                _PROMPTS["output"],
            ]
        )
        # Past turns are context, not a place to stockpile tokens: each one is capped.
        history = [
            {
                "role": message["role"],
                "content": _quote(message["content"][:_HISTORY_QUESTION_CHARS])
                if message["role"] == "user"
                else message["content"][:_HISTORY_ANSWER_CHARS],
            }
            for message in self.history
        ]
        return [
            {"role": "system", "content": system},
            *([] if decline else history),
            {"role": "user", "content": _quote(question)},
            *({"role": "system", "content": text} for text in [_PROMPTS["reminder"], *notes]),
        ]

    def _parse_projects(self, tail: str) -> dict[str, str]:
        """Read the project cards that follow the delimiter.

        Args:
            tail: Model output after the delimiter.

        Returns:
            dict[str, str]: Comments by project id, for ids the knowledge
            defines and comments the guard accepts.
        """
        known = [
            (project_id, str(comment))
            for project_id, comment in (parse_json_object(tail) or {}).items()
            if project_id in self.knowledge.project_ids and self.guard.check(str(comment), complete=True) is None
        ]
        return dict(known[:_MAX_PROJECTS])

    async def _attempt(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_chars: int | None = None,
        echo_of: str | None = None,
    ) -> AsyncGenerator[str | Reply, None]:
        """Run one streamed LLM call under the output guard.

        Args:
            messages: Full prompt.
            temperature: Sampling temperature.
            max_chars: Longest answer text accepted, or ``None`` for no cap.
                A capped answer (a decline) is short, so it is held back and
                released whole once it is complete and checked: none of a
                draft that grows into an answer to the request is ever shown.
            echo_of: Text the answer must not repeat (the declined message):
                a run of its words in the answer rejects the draft.

        Yields:
            str | Reply: Answer text deltas as they become safe to show, then
            the complete reply as the last item.

        Raises:
            _Rejected: If the answer breaks the output contract.
            LLMError: If no model produced a usable answer.
        """
        raw = ""
        sent = 0

        def check_length(text: str) -> None:
            if max_chars is not None and len(text) > max_chars:
                raise _Rejected(Violation(ViolationKind.TOO_LONG, str(len(text))))

        stream = self.llm.stream_call(messages, temperature=temperature)
        async with aclosing(stream):
            async for chunk in stream:
                raw += chunk
                text, delimiter, _ = _split(_unix(raw))
                text = text.lstrip()
                check_length(text)
                if max_chars is not None or text.startswith("{"):
                    continue  # Released at the end, once complete and checked.

                # Trailing whitespace waits too: it is only part of the answer
                # if more text follows it.
                end = len(text) if delimiter else _releasable(text, len(text) - self._holdback)
                safe = len(text[:end].rstrip())
                if safe <= sent:
                    continue
                # The whole text so far is checked before any new part of it
                # is released; once the cards block opens, the answer is final.
                if violation := self.guard.check(text, complete=delimiter):
                    raise _Rejected(violation)
                if _PROMPTS["masked_name"].casefold() in text.casefold():
                    raise _Rejected(Violation(ViolationKind.INTERNAL_ID, "placeholder"))
                yield text[sent:safe]
                sent = safe

        text, _, tail = _split(_unix(raw))
        text = text.strip()
        projects = self._parse_projects(tail)

        if text.startswith("{"):
            # The model answered with one JSON object instead of text + cards.
            legacy: dict[str, Any] = parse_json_object(text) or {}
            if isinstance(legacy.get("response"), str):
                projects = self._parse_projects(json.dumps(legacy.get("projects") or {}))
                text = legacy["response"].strip()

        if not text:
            raise LLMError("Model reply has no answer text")
        check_length(text)
        if _PROMPTS["masked_name"].casefold() in text.casefold():
            raise _Rejected(Violation(ViolationKind.INTERNAL_ID, "placeholder"))
        if echo_of and _shared_run(text, echo_of) >= _DECLINE_ECHO_WORDS:
            raise _Rejected(Violation(ViolationKind.ECHO, "visitor text"))
        if violation := self.guard.check(text, complete=True):
            raise _Rejected(violation)

        if len(text) > sent:
            yield text[sent:]
        yield Reply(response=text, projects=projects)

    def _decline_notes(self, verdict: Verdict) -> list[str]:
        """Instructions that turn the next answer into a short decline of a message."""
        styles = _PROMPTS["decline_styles"]
        style = styles[self._declined % len(styles)]
        self._declined += 1
        notes = [
            _PROMPTS["decline"].format(
                reason=_PROMPTS["decline_reasons"][_DECLINE_REASONS[verdict.category]],
                style=style,
                # Named outright: earlier declines in another language pull the model there.
                language=_LANGUAGE_NAMES.get(verdict.language, "the language of that message"),
            )
        ]
        if self._declines:
            recent = "\n".join(f"- {text}" for text in self._declines)
            notes.append(_PROMPTS["decline_recent"].format(recent=recent))
        return notes

    async def _generate(
        self,
        question: str,
        language: str,
        decline: list[str] | None = None,
        offer: str | None = None,
        declined: str | None = None,
    ) -> AsyncGenerator[dict[str, Any] | _Done, None]:
        """Answer ``question``, retrying once if the draft is rejected.

        Args:
            question: Message the model answers.
            language: ``es`` or ``en``, for a fixed reply.
            decline: Notes that turn the answer into a short decline of
                the message (see :meth:`_decline_notes`), with no project
                cards; ``None`` for a normal answer.
            offer: The decline or refusal sent last turn, which the message
                may be replying to.
            declined: The visitor's message, when this is its decline: the
                decline may not repeat it.

        Yields:
            dict[str, Any] | _Done: Client frames while the answer streams,
            then the outcome. After two rejected drafts the outcome is a
            fixed reply, never a third generated one.
        """
        notes: list[str] = list(decline or [])
        if offer:
            notes.insert(0, _PROMPTS["previous_offer"].format(offer=offer))
        # A blocked name in the question is replaced before the model reads it,
        # so the model has nothing to repeat and treats it like any other name
        # the knowledge does not contain: no note marks it as special.
        question = self.guard.mask_blocked_terms(question, _PROMPTS["masked_name"])
        if _PROMPTS["masked_name"] in question:
            notes.append(_PROMPTS["masked_note"])

        temperature = _DECLINE_TEMPERATURE if decline else _TEMPERATURE
        max_chars = _DECLINE_MAX_CHARS if decline else None
        # A decline that fails its checks is not rewritten: the fixed reply is safer.
        attempts = 1 if decline else _ATTEMPTS
        last = ViolationKind.CODE
        for _ in range(attempts):
            released = False
            try:
                messages = self._messages(question, notes, decline=bool(decline))
                async with aclosing(self._attempt(messages, temperature, max_chars, declined)) as attempt:
                    async for item in attempt:
                        if isinstance(item, str):
                            released = True
                            yield {"type": "delta", "text": item}
                        elif decline:
                            # A decline never shows project cards.
                            yield _Done(Reply(response=item["response"], projects={}), fixed=False)
                        else:
                            yield _Done(item, fixed=False)
                return
            except _Rejected as rejected:
                last = rejected.violation.kind
                if last in _STRIKING_VIOLATIONS:
                    self.strikes += 1
                # Nothing shown, nothing to withdraw: a reset would only tell the
                # visitor that a draft was rejected.
                if released:
                    yield {"type": "reset"}
                logger.warning("reply rejected violation=%s", last)
                if last is ViolationKind.BLOCKED_TERM:
                    # Only the name the draft already wrote: the full list of
                    # blocked names never enters the prompt.
                    notes.append(_PROMPTS["blocked"].format(terms=rejected.violation.detail))
                else:
                    notes.append(_PROMPTS["retry"].format(problem=_VIOLATION_NAMES[last]))
                temperature = _RETRY_TEMPERATURE

        fixed = "confidential" if last is ViolationKind.BLOCKED_TERM else "refusal"
        yield _Done(Reply(response=self._fixed(fixed, language), projects={}), fixed=True)

    def _mask_names(self, text: str, names: tuple[str, ...]) -> str:
        """``text`` with every name the knowledge does not contain replaced by one placeholder.

        Blocked names and any other unpublished name get exactly the same
        treatment, so no reply can tell a visitor which names are blocked.
        Blocked names are also masked on their own, whatever the gate listed.
        """
        placeholder = _PROMPTS["masked_name"]
        known = self.knowledge.context.casefold()
        for name in sorted(names, key=len, reverse=True):
            if name.casefold() not in known and name != placeholder:
                # Whole words only: a name such as "Meta" leaves "metadata" alone.
                text = re.sub(r"(?<!\w)" + re.escape(name) + r"(?!\w)", placeholder, text, flags=re.IGNORECASE)
        return self.guard.mask_blocked_terms(text, placeholder)

    async def stream_reply(self, query: str) -> AsyncGenerator[dict[str, Any], None]:
        """Answer one visitor message as a sequence of frames for the client.

        Args:
            query: Visitor message text.

        Yields:
            dict[str, Any]: ``{"type": "delta", "text": ...}`` while the answer
            is written, ``{"type": "reset"}`` when the text sent so far must be
            discarded, and last ``{"type": "message", "response": ..., "projects": ...}``
            with the complete answer.

        Raises:
            LLMError: If the gate or the model could not answer. The gate
                fails closed: an unclassified message is never answered.
        """
        query = normalize(query)
        if hidden_payload(query):
            self.strikes += 1
            logger.info("message refused reason=encoded_payload")
            replies = _PROMPTS["replies"]["refusal"]
            spanish, english = self._variant(replies["es"], replies["en"])
            yield {"type": "message", "response": f"{spanish}\n\n{english}", "projects": {}}
            return

        # After a declined or refused turn the gate sees what was offered then,
        # never the message that was declined, so "yes, go on" reads as an answer.
        offer, self._offer = self._offer, None
        previous = self._history[-1] if self._history else None
        if offer:
            previous_message, previous_reply = None, offer
        else:
            previous_message = previous.question if previous else None
            previous_reply = _split(previous.answer)[0] if previous else None
        verdict = await self.gate.classify(query, previous_message=previous_message, previous_reply=previous_reply)
        language = _lang(verdict.language)
        action = route(verdict)

        if action is Route.REFUSE:
            self.strikes += 1
            logger.info("message refused category=%s", verdict.category)
            reply = self._fixed(_REFUSALS.get(verdict.category, "refusal"), language)
            self._offer = reply
            yield {"type": "message", "response": reply, "projects": {}}
            return

        question, lead, decline = self._mask_names(query, verdict.names), "", None
        if action is Route.REFRAME:
            question = _PROMPTS["canonical_questions"][verdict.topic.value][language]
            lead = self._fixed_reframe(_REFRAME_LEADS[verdict.category], language) + "\n\n"
            yield {"type": "delta", "text": lead}
        elif action is Route.DECLINE:
            # Still a strike: it is outside the chat, and each one costs a model call.
            self.strikes += 1
            decline = self._decline_notes(verdict)
            # The decline is written from a description of the message, never
            # from the message: it cannot repeat, translate or answer what it
            # never reads.
            description = self._mask_names(_describe(verdict.rationale), verdict.names)
            question = _PROMPTS["declined_message"].format(description=description)
            logger.info("message declined category=%s", verdict.category)

        # A reframed question is a canonical one: what was offered before does not apply.
        context = offer if action is not Route.REFRAME else None
        declined = query if decline else None
        async with aclosing(self._generate(question, language, decline, context, declined)) as outcome:
            async for item in outcome:
                if isinstance(item, _Done):
                    done = item
                    continue
                yield item
                if item["type"] == "reset" and lead:
                    yield {"type": "delta", "text": lead}

        reply = done.reply
        if done.fixed or decline:
            self._offer = reply["response"]
        if decline and not done.fixed:
            self._declines.append(reply["response"])
        elif not done.fixed:
            reply = Reply(response=lead + reply["response"], projects=reply["projects"])
            cards = json.dumps(reply["projects"], ensure_ascii=False)
            answer = f"{reply['response']}\n{_DELIMITER}{cards}</projects>"
            self._history = [*self._history, _Exchange(question, answer)][-self._history_turns :]
        yield {"type": "message", **reply}
