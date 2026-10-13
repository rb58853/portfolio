"""Thin wrapper around LiteLLM streaming calls with model fallback and usage logging."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator

import litellm
from litellm import acompletion

logger = logging.getLogger(__name__)

# LiteLLM logs every call at INFO and prints help banners on errors.
litellm.suppress_debug_info = True
logging.getLogger("LiteLLM").setLevel(logging.WARNING)


class LLMError(RuntimeError):
    """Raised when no configured model could answer."""


class LLM:
    """Provide streamed LLM calls over LiteLLM, trying fallback models in order."""

    def __init__(
        self,
        model: str,
        fallback_models: list[str] | None = None,
        max_tokens: int = 1500,
        timeout: int = 40,
    ) -> None:
        """Store the model chain and the limits applied to every call.

        Args:
            model: LiteLLM model id, for example ``groq/openai/gpt-oss-120b``.
            fallback_models: Models tried in order when the previous one fails.
            max_tokens: Completion token limit per call.
            timeout: Seconds to wait for a provider before failing over.
        """
        self.models: list[str] = [model, *(fallback_models or [])]
        self.max_tokens = max_tokens
        self.timeout = timeout

    @staticmethod
    def _build_messages(
        user_query: str,
        system_prompts: list[str],
        history: list[dict[str, str]] | None = None,
    ) -> list[dict[str, str]]:
        """Build a chat-completion message list from prompts, history and query."""
        messages = [{"role": "system", "content": prompt} for prompt in system_prompts]
        messages += history or []
        messages.append({"role": "user", "content": user_query})
        return messages

    @staticmethod
    def _log_usage(model: str, usage: Any) -> None:
        if usage is None:
            return
        logger.info(
            "llm usage model=%s prompt_tokens=%s completion_tokens=%s",
            model,
            getattr(usage, "prompt_tokens", 0),
            getattr(usage, "completion_tokens", 0),
        )

    async def stream_call(
        self,
        user_query: str,
        system_prompts: list[str],
        history: list[dict[str, str]] | None = None,
        temperature: float = 0.3,
    ) -> AsyncGenerator[str, None]:
        """Yield text deltas from the first model that starts answering.

        A model that fails or stays silent is skipped while nothing has been
        yielded yet; once text is out, a failure ends the stream with an error.

        Args:
            user_query: User query text.
            system_prompts: Ordered list of system prompts.
            history: Optional prior messages.
            temperature: Sampling temperature.

        Yields:
            str: Incremental content chunks from the provider.

        Raises:
            LLMError: If every model fails, or a stream breaks after it started.
        """
        messages = self._build_messages(user_query, system_prompts, history)

        for model in self.models:
            started = False
            try:
                response = await acompletion(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=self.max_tokens,
                    timeout=self.timeout,
                    stream=True,
                    stream_options={"include_usage": True},
                )
                async for chunk in response:
                    self._log_usage(model, getattr(chunk, "usage", None))

                    choices = getattr(chunk, "choices", None) or []
                    if not choices:
                        continue
                    text = getattr(choices[0].delta, "content", None) or ""
                    if text:
                        started = True
                        yield text
            except Exception as error:
                if started:
                    raise LLMError(f"Stream from {model} was interrupted") from error
                logger.warning("llm call failed model=%s error=%s", model, error)
                continue

            if started:
                return
            logger.warning("llm returned empty content model=%s", model)

        raise LLMError("No model answered")


def parse_json_object(text: str) -> dict[str, Any] | None:
    """Parse a JSON object out of a model reply, tolerating code fences and prose.

    Args:
        text: Raw assistant message content.

    Returns:
        dict[str, Any] | None: The parsed object, or ``None`` when there is none.
    """
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None
