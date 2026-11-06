"""One visitor conversation: gate, prompt assembly, streamed LLM call and reply validation.

A message goes through four layers, each able to stop what the previous one
missed:

1. Normalisation removes invisible characters and folds look-alike forms,
   so every later check reads what the model reads. A request hidden in an
   encoding is refused here, in code.
2. The input gate classifies the message. Code, not the model, decides the
   route: answer it, answer a canonical question in its place, or send a
   fixed refusal.
3. The model answers under a fixed output contract.
4. The output guard checks the answer while it streams, and only whole lines
   are released, so no line reaches the visitor before it is checked. A
   violation discards what was shown, the model retries once, then a fixed
   reply is sent.

Only delivered, validated exchanges enter the history, so a refused or
broken turn can never serve as an example for the next one.
"""

from __future__ import annotations

import json
import logging
import re
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
# Lines are released whole. A paragraph longer than this is released up to
# its last finished sentence, so long answers still stream.
_LONG_LINE = 200
_SENTENCE_END = re.compile(r"[.!?…](?=\s)")

_VIOLATION_NAMES = {
    ViolationKind.CODE: "code or a data format",
    ViolationKind.LEAK: "text copied from your instructions",
    ViolationKind.KNOWLEDGE_DUMP: "raw lines copied from the knowledge block",
    ViolationKind.UNKNOWN_LINK: "a link that is not in the knowledge block",
}


class Reply(TypedDict):
    """Complete answer: markdown text plus the project cards to show."""

    response: str
    projects: dict[str, str]


class Route(Enum):
    """What the session does with a message, chosen from the gate verdict."""

    ANSWER = auto()
    REFRAME = auto()
    REFUSE = auto()


def route(verdict: Verdict) -> Route:
    """Map a gate verdict to an action. The whole policy decision lives here.

    A question about the engineer asked in a forbidden form is not refused:
    it is answered as the plain question on the same topic, so the model
    never reads the request for that form. Everything else that is not SAFE
    gets the fixed refusal.
    """
    if verdict.category is Category.SAFE:
        return Route.ANSWER
    if verdict.category is Category.FORMAT_HIJACK and verdict.topic is not Topic.NONE:
        return Route.REFRAME
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
    return [_PROMPTS[key] for key in ("persona", "output", "reminder", "retry", "blocked")]


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
        # Text is released this many characters behind the model, so neither a
        # literal the guard looks for nor the delimiter is sent before it is seen.
        self._holdback = max(guard.holdback, len(_DELIMITER) - 1)

    @property
    def history(self) -> list[dict[str, str]]:
        """Delivered exchanges as chat messages, oldest first."""
        messages: list[dict[str, str]] = []
        for exchange in self._history:
            messages.append({"role": "user", "content": exchange.question})
            messages.append({"role": "assistant", "content": exchange.answer})
        return messages

    def _messages(self, question: str, notes: list[str]) -> list[dict[str, str]]:
        """Full prompt: one static system message, history, question, then the reminder.

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
        return [
            {"role": "system", "content": system},
            *self.history,
            {"role": "user", "content": question},
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
        self, messages: list[dict[str, str]], temperature: float
    ) -> AsyncGenerator[str | Reply, None]:
        """Run one streamed LLM call under the output guard.

        Yields:
            str | Reply: Answer text deltas as they become safe to show, then
            the complete reply as the last item.

        Raises:
            _Rejected: If the answer breaks the output contract.
            LLMError: If no model produced a usable answer.
        """
        raw = ""
        sent = 0

        stream = self.llm.stream_call(messages, temperature=temperature)
        async with aclosing(stream):
            async for chunk in stream:
                raw += chunk
                text, delimiter, _ = _split(_unix(raw))
                text = text.lstrip()
                if text.startswith("{"):
                    continue  # A JSON reply is unwrapped and checked at the end.

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
        if violation := self.guard.check(text, complete=True):
            raise _Rejected(violation)

        if len(text) > sent:
            yield text[sent:]
        yield Reply(response=text, projects=projects)

    async def _generate(self, question: str, language: str) -> AsyncGenerator[dict[str, Any] | _Done, None]:
        """Answer ``question``, retrying once if the draft is rejected.

        Yields:
            dict[str, Any] | _Done: Client frames while the answer streams,
            then the outcome. After two rejected drafts the outcome is a
            fixed reply, never a third generated one.
        """
        notes: list[str] = []
        if mentioned := self.guard.blocked_terms_in(question):
            notes.append(_PROMPTS["blocked"].format(terms=", ".join(mentioned)))

        temperature = _TEMPERATURE
        last = ViolationKind.CODE
        for _ in range(_ATTEMPTS):
            try:
                messages = self._messages(question, notes)
                async with aclosing(self._attempt(messages, temperature)) as attempt:
                    async for item in attempt:
                        if isinstance(item, str):
                            yield {"type": "delta", "text": item}
                        else:
                            yield _Done(item, fixed=False)
                return
            except _Rejected as rejected:
                self.strikes += 1
                yield {"type": "reset"}
                last = rejected.violation.kind
                logger.warning("reply rejected violation=%s", last)
                if last is ViolationKind.BLOCKED_TERM:
                    # Only the name the draft already wrote: the full list of
                    # blocked names never enters the prompt.
                    notes.append(_PROMPTS["blocked"].format(terms=rejected.violation.detail))
                else:
                    notes.append(_PROMPTS["retry"].format(problem=_VIOLATION_NAMES[last]))
                temperature = _RETRY_TEMPERATURE

        fixed = "confidential" if last is ViolationKind.BLOCKED_TERM else "refusal"
        yield _Done(Reply(response=_PROMPTS["replies"][fixed][language], projects={}), fixed=True)

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
            yield {"type": "message", "response": f"{replies['es']}\n\n{replies['en']}", "projects": {}}
            return

        previous = self._history[-1] if self._history else None
        verdict = await self.gate.classify(
            query,
            previous_message=previous.question if previous else None,
            previous_reply=_split(previous.answer)[0] if previous else None,
        )
        language = _lang(verdict.language)
        action = route(verdict)

        if action is Route.REFUSE:
            self.strikes += 1
            logger.info("message refused category=%s", verdict.category)
            yield {"type": "message", "response": _PROMPTS["replies"]["refusal"][language], "projects": {}}
            return

        question, lead = query, ""
        if action is Route.REFRAME:
            question = _PROMPTS["canonical_questions"][verdict.topic.value][language]
            lead = _PROMPTS["replies"]["reframe"][language] + "\n\n"
            yield {"type": "delta", "text": lead}

        async with aclosing(self._generate(question, language)) as outcome:
            async for item in outcome:
                if isinstance(item, _Done):
                    done = item
                    continue
                yield item
                if item["type"] == "reset" and lead:
                    yield {"type": "delta", "text": lead}

        reply = done.reply
        if not done.fixed:
            reply = Reply(response=lead + reply["response"], projects=reply["projects"])
            cards = json.dumps(reply["projects"], ensure_ascii=False)
            answer = f"{reply['response']}\n{_DELIMITER}{cards}</projects>"
            self._history = [*self._history, _Exchange(question, answer)][-self._history_turns :]
        yield {"type": "message", **reply}
