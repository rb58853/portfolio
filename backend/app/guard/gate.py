"""Input gate: classify each visitor message against the assistant's policy before answering it.

The classifier only picks labels from closed sets. It never writes text the
visitor sees, so a message that manipulates it can at most change a label,
and the code decides what each label means (action-selector pattern).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any

import yaml

from app.llm import LLM, LLMError

logger = logging.getLogger(__name__)

_POLICY_FILE = Path(__file__).with_name("policy.yaml")
# Context the classifier sees from the previous exchange: enough to read a
# follow-up such as "now as a song", short enough to keep the call cheap.
_CONTEXT_CHARS = 600


class Category(StrEnum):
    """What a visitor message asks for, as the policy defines it."""

    SAFE = "SAFE"
    FORMAT_HIJACK = "FORMAT_HIJACK"
    ROLEPLAY = "ROLEPLAY"
    OFF_TOPIC = "OFF_TOPIC"
    PROMPT_EXTRACTION = "PROMPT_EXTRACTION"
    JAILBREAK = "JAILBREAK"


class Topic(StrEnum):
    """Part of the engineer's profile a message is about."""

    PROFILE = "profile"
    EXPERIENCE = "experience"
    SKILLS = "skills"
    PROJECTS = "projects"
    EDUCATION = "education"
    CONTACT = "contact"
    NONE = "none"


class Language(StrEnum):
    """Language of a visitor message; anything else is answered in English."""

    ES = "es"
    EN = "en"
    OTHER = "other"


@dataclass(frozen=True, slots=True)
class Verdict:
    """The gate's reading of one message."""

    category: Category
    topic: Topic
    language: Language
    rationale: str = ""


class GateUnavailable(LLMError):
    """No classifier produced a valid verdict, so the message cannot be cleared."""


def load_policy() -> dict[str, Any]:
    """Read the gate policy and the fixed refusals."""
    return yaml.safe_load(_POLICY_FILE.read_text(encoding="utf-8"))


def _data(text: str) -> str:
    # The visitor controls this text. Angle brackets are swapped for
    # look-alikes so it cannot close the tag it sits in and pose as context.
    return text.replace("<", "‹").replace(">", "›")


def _parse(raw: dict[str, Any]) -> Verdict | None:
    try:
        return Verdict(
            category=Category(str(raw.get("category", "")).upper()),
            topic=Topic(str(raw.get("topic", "none")).lower()),
            language=Language(str(raw.get("language", "other")).lower()),
            rationale=str(raw.get("rationale", ""))[:200],
        )
    except ValueError:
        return None


class InputGate:
    """Classify visitor messages with a policy-following model."""

    def __init__(self, llm: LLM, policy: str) -> None:
        """Bind the gate to its classifier models and policy.

        Args:
            llm: Classifier model chain (tried in order).
            policy: Policy text sent as the system message.
        """
        self._llm = llm
        self._policy = policy

    async def classify(
        self,
        message: str,
        previous_message: str | None = None,
        previous_reply: str | None = None,
    ) -> Verdict:
        """Return the verdict for ``message``.

        Args:
            message: Normalised visitor message.
            previous_message: Visitor message of the last answered exchange.
            previous_reply: Answer of the last answered exchange.

        Returns:
            Verdict: Category, topic and language of the message.

        Raises:
            GateUnavailable: If no classifier returned a valid verdict. The
                caller must not answer the message (fail closed).
        """
        parts = []
        if previous_message:
            parts.append(f"<previous_message>{_data(previous_message[:_CONTEXT_CHARS])}</previous_message>")
        if previous_reply:
            parts.append(f"<previous_reply>{_data(previous_reply[:_CONTEXT_CHARS])}</previous_reply>")
        parts.append(f"<message>{_data(message)}</message>")

        try:
            raw = await self._llm.json_call(
                [
                    {"role": "system", "content": self._policy},
                    {"role": "user", "content": "\n".join(parts)},
                ]
            )
        except LLMError as error:
            raise GateUnavailable("No classifier answered") from error

        verdict = _parse(raw)
        if verdict is None:
            raise GateUnavailable(f"Classifier returned an invalid verdict: {raw!r}")
        logger.info(
            "gate category=%s topic=%s language=%s",
            verdict.category,
            verdict.topic,
            verdict.language,
        )
        return verdict
