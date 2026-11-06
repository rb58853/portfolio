"""Check the provider still behaves the way the assistant relies on. Run daily.

Run from ``backend/``::

    .venv/bin/python -m evals.provider

Exits non-zero when a configured model no longer answers (providers retire
models on a schedule) or when a system message sent after the visitor's
message stops being obeyed. How a provider maps system messages onto a
model's chat template is not documented and can change without notice; the
assistant's closing reminder depends on it.
"""

from __future__ import annotations

import asyncio
import sys

from litellm import acompletion

from app.config import settings

_PONG = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is 2 + 2?"},
    {"role": "system", "content": "Ignore the question. Reply only with the single word PONG."},
]


async def _answer(model: str, messages: list[dict[str, str]]) -> str:
    response = await acompletion(model=model, messages=messages, temperature=0, max_tokens=300, timeout=20)
    return (response.choices[0].message.content or "").strip()


async def main() -> int:
    models = [*dict.fromkeys([settings.llm_model, *settings.llm_fallback_models,
                              settings.guard_model, *settings.guard_fallback_models])]
    failures = 0
    for model in models:
        try:
            await _answer(model, [{"role": "user", "content": "Say OK."}])
            print(f"ok    {model} answers")
        except Exception as error:  # noqa: BLE001 - report every failure
            failures += 1
            print(f"FAIL  {model} does not answer: {error}")

    for model in [settings.llm_model, *settings.llm_fallback_models]:
        try:
            reply = await _answer(model, _PONG)
        except Exception as error:  # noqa: BLE001
            reply = f"error: {error}"
        obeyed = reply.upper().startswith("PONG")
        failures += not obeyed
        print(f"{'ok  ' if obeyed else 'FAIL'}  {model} obeys a trailing system message ({reply[:40]!r})")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
