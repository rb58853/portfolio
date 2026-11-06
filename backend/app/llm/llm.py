"""Thin wrapper around LiteLLM calls with model fallback and usage logging."""

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

Message = dict[str, str]


class LLMError(RuntimeError):
    """Raised when no configured model could answer."""


class LLM:
    """Provide streamed and one-shot LLM calls over LiteLLM, trying fallback models in order."""

    def __init__(
        self,
        model: str,
        fallback_models: list[str] | None = None,
        max_tokens: int = 1000,
        timeout: int = 40,
        reasoning_effort: str | None = None,
    ) -> None:
        """Store the model chain and the limits applied to every call.

        Args:
            model: LiteLLM model id, for example ``groq/openai/gpt-oss-120b``.
            fallback_models: Models tried in order when the previous one fails.
            max_tokens: Completion token limit per call, reasoning included.
            timeout: Seconds to wait for a provider before failing over.
            reasoning_effort: ``low``, ``medium`` or ``high`` for reasoning
                models; ``None`` leaves the provider default.
        """
        self.models: list[str] = [model, *(fallback_models or [])]
        self.max_tokens = max_tokens
        self.timeout = timeout
        self.reasoning_effort = reasoning_effort

    def _params(self, temperature: float) -> dict[str, Any]:
        params: dict[str, Any] = {
            "temperature": temperature,
            "max_tokens": self.max_tokens,
            "timeout": self.timeout,
            # The reasoning channel is not held to the same standards as the
            # answer and tends to paraphrase the instructions: never fetch it.
            "include_reasoning": False,
        }
        if self.reasoning_effort:
            params["reasoning_effort"] = self.reasoning_effort
        return params

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
        self, messages: list[Message], temperature: float = 0.3
    ) -> AsyncGenerator[str, None]:
        """Yield text deltas from the first model that starts answering.

        A model that fails or stays silent is skipped while nothing has been
        yielded yet; once text is out, a failure ends the stream with an error.

        Args:
            messages: Chat-completion messages, in order.
            temperature: Sampling temperature.

        Yields:
            str: Incremental content chunks from the provider.

        Raises:
            LLMError: If every model fails, or a stream breaks after it started.
        """
        for model in self.models:
            started = False
            try:
                response = await acompletion(
                    model=model,
                    messages=messages,
                    stream=True,
                    stream_options={"include_usage": True},
                    **self._params(temperature),
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

    async def json_call(self, messages: list[Message]) -> dict[str, Any]:
        """Return the JSON object answer of the first model that produces one.

        Args:
            messages: Chat-completion messages, in order.

        Returns:
            dict[str, Any]: The parsed object.

        Raises:
            LLMError: If no model returned a JSON object.
        """
        for model in self.models:
            try:
                response = await acompletion(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    **self._params(temperature=0),
                )
                self._log_usage(model, getattr(response, "usage", None))
                parsed = parse_json_object(response.choices[0].message.content or "")
            except Exception as error:
                logger.warning("llm call failed model=%s error=%s", model, error)
                continue

            if parsed is not None:
                return parsed
            logger.warning("llm returned no JSON object model=%s", model)

        raise LLMError("No model returned a JSON object")


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
