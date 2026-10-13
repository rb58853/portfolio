"""Chat session behaviour against a scripted LLM, and the usage limits."""

from __future__ import annotations

import asyncio

import pytest

from app.chat import ChatSession, RateLimiter
from app.chat.chat import _DELIMITER, _PROMPTS
from app.knowledge import Knowledge
from app.llm import LLMError, parse_json_object

KNOWLEDGE = Knowledge(context="projects: []", project_ids=frozenset({"alpha", "beta"}))


class ScriptedLLM:
    """Stand-in for ``LLM`` that streams queued replies and records its calls."""

    def __init__(self, *replies: str, chunk: int = 5) -> None:
        self.replies = list(replies)
        self.chunk = chunk
        self.calls: list[dict] = []

    async def stream_call(self, **kwargs):
        self.calls.append(kwargs)
        reply = self.replies.pop(0)
        for start in range(0, len(reply), self.chunk):
            yield reply[start : start + self.chunk]


def answer(text: str, projects: str = "{}") -> str:
    return f"{text}\n{_DELIMITER}{projects}</projects>"


def ask(session: ChatSession, query: str) -> list[dict]:
    async def collect() -> list[dict]:
        return [frame async for frame in session.stream_reply(query)]

    return asyncio.run(collect())


def streamed_text(frames: list[dict]) -> str:
    """Text a client shows after applying the delta and reset frames."""
    text = ""
    for frame in frames:
        if frame["type"] == "delta":
            text += frame["text"]
        elif frame["type"] == "reset":
            text = ""
    return text


def test_answer_is_streamed_and_ends_with_the_complete_message() -> None:
    llm = ScriptedLLM(answer("Hello there, visitor.", '{"alpha": "A", "ghost": "G"}'))

    frames = ask(ChatSession(llm, KNOWLEDGE), "show me projects")

    assert frames[-1] == {
        "type": "message",
        "response": "Hello there, visitor.",
        "projects": {"alpha": "A"},
    }
    assert [frame["type"] for frame in frames[:-1]] == ["delta"] * (len(frames) - 1)
    assert streamed_text(frames) == "Hello there, visitor."


def test_delimiter_and_cards_never_reach_the_stream() -> None:
    for chunk in (1, 3, 7, 50):
        llm = ScriptedLLM(answer("A long enough answer to be streamed.", '{"alpha": "A"}'), chunk=chunk)

        text = streamed_text(ask(ChatSession(llm, KNOWLEDGE), "hello"))

        assert text == "A long enough answer to be streamed."


def test_reply_without_delimiter_has_no_cards() -> None:
    llm = ScriptedLLM("Just text, the model forgot the cards.")

    frames = ask(ChatSession(llm, KNOWLEDGE), "hello")

    assert frames[-1]["response"] == "Just text, the model forgot the cards."
    assert frames[-1]["projects"] == {}


def test_json_object_reply_is_unwrapped() -> None:
    llm = ScriptedLLM('{"response": "Hi", "projects": {"beta": "B"}}')

    frames = ask(ChatSession(llm, KNOWLEDGE), "hello")

    assert frames[-1] == {"type": "message", "response": "Hi", "projects": {"beta": "B"}}


def test_reply_without_answer_text_is_an_error() -> None:
    llm = ScriptedLLM(answer("", '{"alpha": "A"}'))

    with pytest.raises(LLMError):
        ask(ChatSession(llm, KNOWLEDGE), "hello")


def test_history_is_sent_and_trimmed() -> None:
    llm = ScriptedLLM(answer("ok"), answer("ok"), answer("ok"))
    session = ChatSession(llm, KNOWLEDGE, history_turns=1)

    for query in ("one", "two", "three"):
        ask(session, query)

    assert [message["content"] for message in llm.calls[2]["history"]][0] == "two"
    assert len(session.history) == 2
    assert _DELIMITER in session.history[1]["content"]


def test_knowledge_and_delimiter_are_in_the_system_prompts() -> None:
    llm = ScriptedLLM(answer("ok"))

    ask(ChatSession(llm, KNOWLEDGE), "hello")

    prompts = llm.calls[0]["system_prompts"]
    assert any(KNOWLEDGE.context in prompt for prompt in prompts)
    assert _DELIMITER in _PROMPTS["output"]


def test_blocked_term_in_question_warns_the_model() -> None:
    llm = ScriptedLLM(answer("Only what is published."))

    ask(ChatSession(llm, KNOWLEDGE, blocked_terms=["Acme"]), "do you use ACME?")

    assert "acme" in llm.calls[0]["system_prompts"][-1]


def test_blocked_term_is_never_streamed() -> None:
    leak = answer("The cell uses RF-DETR, not Acme, for detection.")
    clean = answer("Only what is published.")

    for chunk in (1, 2, 4, 9, 80):
        frames = ask(ChatSession(ScriptedLLM(leak, clean, chunk=chunk), KNOWLEDGE, blocked_terms=["acme"]), "hi")
        sent = "".join(frame.get("text", "") for frame in frames).lower()

        assert "acme" not in sent
        assert {"type": "reset"} in frames
        assert streamed_text(frames) == "Only what is published."
        assert frames[-1]["response"] == "Only what is published."


def test_blocked_term_twice_gets_the_fixed_answer() -> None:
    leak = answer("Not Acme.", '{"alpha": "fine"}')

    frames = ask(ChatSession(ScriptedLLM(leak, leak), KNOWLEDGE, blocked_terms=["acme"]), "hi")

    assert "acme" not in frames[-1]["response"].lower()
    assert frames[-1]["projects"] == {}
    assert frames[-1]["response"] == _PROMPTS["blocked_reply"].strip()


def test_card_comment_with_blocked_term_is_dropped() -> None:
    llm = ScriptedLLM(answer("Here they are.", '{"alpha": "built with acme", "beta": "fine"}'))

    frames = ask(ChatSession(llm, KNOWLEDGE, blocked_terms=["acme"]), "hi")

    assert frames[-1]["projects"] == {"beta": "fine"}


def test_parse_json_object_tolerates_fences() -> None:
    assert parse_json_object('```json\n{"response": "x"}\n```') == {"response": "x"}
    assert parse_json_object("no json here") is None


def test_rate_limiter_caps_connections_and_messages() -> None:
    limiter = RateLimiter(max_connections_per_ip=1, max_messages_per_ip_hour=2, max_messages_per_day=3)

    assert limiter.open_connection("a")
    assert not limiter.open_connection("a")
    limiter.close_connection("a")
    assert limiter.open_connection("a")

    assert limiter.allow_message("a")
    assert limiter.allow_message("a")
    assert not limiter.allow_message("a")

    assert limiter.allow_message("b")
    assert not limiter.allow_message("b")
