"""One visitor conversation: prompt assembly, streamed LLM call and reply validation."""

from __future__ import annotations

import json
import re
from contextlib import aclosing
from datetime import date
from pathlib import Path
from typing import Any, AsyncGenerator, TypedDict

import yaml

from app.knowledge import Knowledge
from app.llm import LLM, LLMError, parse_json_object

_PROMPTS = yaml.safe_load(
    (Path(__file__).with_name("prompts.yaml")).read_text(encoding="utf-8")
)
_DELIMITER: str = _PROMPTS["delimiter"]
_DELIMITER_PATTERN = re.compile(re.escape(_DELIMITER), re.IGNORECASE)
_MAX_PROJECTS = 4
_ATTEMPTS = 2


class Reply(TypedDict):
    """Complete answer: markdown text plus the project cards to show."""

    response: str
    projects: dict[str, str]


class _BlockedTerm(Exception):
    """The model wrote a name that must never reach the visitor."""


def _split(raw: str) -> tuple[str, bool, str]:
    """Split model output into answer text, whether the cards block opened, and the block."""
    match = _DELIMITER_PATTERN.search(raw)
    if match is None:
        return raw, False, ""
    return raw[: match.start()], True, raw[match.end() :]


class ChatSession:
    """Keep the history of one conversation and answer its messages."""

    def __init__(
        self,
        llm: LLM,
        knowledge: Knowledge,
        history_turns: int = 8,
        blocked_terms: list[str] | None = None,
    ) -> None:
        """Bind the session to an LLM and a knowledge base.

        Args:
            llm: LLM wrapper used for every reply.
            knowledge: Knowledge base the answers must come from.
            history_turns: Past question/answer pairs kept as context.
            blocked_terms: Names that must never appear in an answer.
        """
        self.llm = llm
        self.knowledge = knowledge
        self.history: list[dict[str, str]] = []
        self._history_messages = history_turns * 2
        self._blocked_terms = [term.lower() for term in blocked_terms or []]
        # Text is released this many characters behind the model, so neither a
        # blocked name nor the delimiter is ever sent before it is recognised.
        self._holdback = max(len(term) for term in [_DELIMITER, *self._blocked_terms]) - 1

    def _system_prompts(self) -> list[str]:
        knowledge_prompt = _PROMPTS["knowledge"].format(
            today=date.today().isoformat(),
            knowledge=self.knowledge.context,
        )
        return [_PROMPTS["persona"], _PROMPTS["output"], knowledge_prompt]

    def _blocked_in(self, text: str) -> list[str]:
        lowered = text.lower()
        return [term for term in self._blocked_terms if term in lowered]

    def _parse_projects(self, tail: str) -> dict[str, str]:
        """Read the project cards that follow the delimiter.

        Args:
            tail: Model output after the delimiter.

        Returns:
            dict[str, str]: Comments by project id, for ids the knowledge defines.
        """
        known = [
            (project_id, str(comment))
            for project_id, comment in (parse_json_object(tail) or {}).items()
            if project_id in self.knowledge.project_ids and not self._blocked_in(str(comment))
        ]
        return dict(known[:_MAX_PROJECTS])

    async def _attempt(
        self, query: str, system_prompts: list[str]
    ) -> AsyncGenerator[str | Reply, None]:
        """Run one streamed LLM call.

        Args:
            query: Visitor message text.
            system_prompts: Ordered list of system prompts.

        Yields:
            str | Reply: Answer text deltas as they become safe to show, then
            the complete reply as the last item.

        Raises:
            _BlockedTerm: If the answer text names a blocked term.
            LLMError: If no model produced a usable answer.
        """
        raw = ""
        sent = 0

        stream = self.llm.stream_call(
            user_query=query,
            system_prompts=system_prompts,
            history=self.history,
        )
        async with aclosing(stream):
            async for chunk in stream:
                raw += chunk
                text, delimiter, _ = _split(raw)
                text = text.lstrip()
                if self._blocked_in(text):
                    raise _BlockedTerm

                # Trailing whitespace waits too: it is only part of the answer
                # if more text follows it.
                visible = text if delimiter else text[: max(0, len(text) - self._holdback)]
                safe = len(visible.rstrip())
                if safe > sent:
                    yield text[sent:safe]
                    sent = safe

        text, _, tail = _split(raw)
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
        if self._blocked_in(text):
            raise _BlockedTerm

        if len(text) > sent:
            yield text[sent:]
        yield Reply(response=text, projects=projects)

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
            LLMError: If no model produced a usable answer.
        """
        system_prompts = self._system_prompts()
        mentioned = self._blocked_in(query)
        if mentioned:
            system_prompts.append(_PROMPTS["blocked"].format(terms=", ".join(mentioned)))

        # A blocked name gets one stricter attempt, then a fixed answer.
        reply = Reply(response=_PROMPTS["blocked_reply"].strip(), projects={})
        for _ in range(_ATTEMPTS):
            try:
                async with aclosing(self._attempt(query, system_prompts)) as attempt:
                    async for item in attempt:
                        if isinstance(item, str):
                            yield {"type": "delta", "text": item}
                        else:
                            reply = item
                break
            except _BlockedTerm:
                yield {"type": "reset"}
                system_prompts.append(
                    _PROMPTS["blocked"].format(terms=", ".join(self._blocked_terms))
                )

        cards = json.dumps(reply["projects"], ensure_ascii=False)
        answer = f"{reply['response']}\n{_DELIMITER}{cards}</projects>"
        exchange = [
            {"role": "user", "content": query},
            {"role": "assistant", "content": answer},
        ]
        self.history = [*self.history, *exchange][-self._history_messages :]
        yield {"type": "message", **reply}
