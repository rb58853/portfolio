"""Runtime settings, read once from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]

# Local development only: in Docker the variables come from compose.
load_dotenv(BACKEND_ROOT / ".env")


def _csv(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in (os.getenv(name) or default).split(",") if item.strip()]


def _int(name: str, default: int) -> int:
    return int(os.getenv(name) or default)


@dataclass(frozen=True, slots=True)
class Settings:
    """Everything the service reads from the environment."""

    # LiteLLM model ids. Provider keys (GROQ_API_KEY, OPENAI_API_KEY,
    # GEMINI_API_KEY) are read by LiteLLM itself from the environment.
    # A fallback must pass the red-team evaluation too (evals/redteam.py).
    llm_model: str = os.getenv("LLM_MODEL") or "groq/openai/gpt-oss-120b"
    llm_fallback_models: list[str] = field(
        default_factory=lambda: _csv("LLM_FALLBACK_MODELS", "groq/openai/gpt-oss-20b")
    )
    # Reasoning tokens count against this limit too.
    llm_max_tokens: int = _int("LLM_MAX_TOKENS", 1000)
    llm_timeout_seconds: int = _int("LLM_TIMEOUT_SECONDS", 40)
    llm_reasoning_effort: str = os.getenv("LLM_REASONING_EFFORT") or "low"

    # Input gate: the classifier every visitor message passes first. It fails
    # closed, so its chain should hold more than one model.
    guard_model: str = os.getenv("GUARD_MODEL") or "groq/openai/gpt-oss-120b"
    guard_fallback_models: list[str] = field(
        default_factory=lambda: _csv("GUARD_FALLBACK_MODELS", "groq/openai/gpt-oss-safeguard-20b")
    )
    guard_timeout_seconds: int = _int("GUARD_TIMEOUT_SECONDS", 10)

    knowledge_dir: Path = Path(os.getenv("KNOWLEDGE_DIR") or BACKEND_ROOT / "knowledge")

    # Reverse proxies in front of the service that append to X-Forwarded-For:
    # the TLS proxy on the host, then nginx in the portfolio container.
    trusted_proxy_hops: int = _int("TRUSTED_PROXY_HOPS", 2)

    # Browser origins allowed to open the chat. Empty means any origin.
    allowed_origins: list[str] = field(default_factory=lambda: _csv("ALLOWED_ORIGINS"))

    # Names the assistant must never write, confirm or deny. Set outside the
    # repository, since listing them here would publish them.
    blocked_terms: list[str] = field(default_factory=lambda: _csv("CHAT_BLOCKED_TERMS"))

    # The chat is public and every message costs an LLM call, so it is capped.
    max_message_chars: int = _int("CHAT_MAX_MESSAGE_CHARS", 800)
    history_turns: int = _int("CHAT_HISTORY_TURNS", 8)
    max_messages_per_session: int = _int("CHAT_MAX_MESSAGES_PER_SESSION", 40)
    max_messages_per_ip_hour: int = _int("CHAT_MAX_MESSAGES_PER_IP_HOUR", 60)
    max_messages_per_day: int = _int("CHAT_MAX_MESSAGES_PER_DAY", 1500)
    max_connections_per_ip: int = _int("CHAT_MAX_CONNECTIONS_PER_IP", 4)
    idle_timeout_seconds: int = _int("CHAT_IDLE_TIMEOUT_SECONDS", 900)
    # Refused messages and rejected drafts a conversation may collect before
    # it is closed. A visitor asking about the portfolio never gets near it;
    # someone iterating on an attack does.
    max_strikes: int = _int("CHAT_MAX_STRIKES", 5)
    # The same across conversations, per client and hour, so reconnecting
    # does not start over.
    max_strikes_per_ip_hour: int = _int("CHAT_MAX_STRIKES_PER_IP_HOUR", 10)


settings = Settings()
