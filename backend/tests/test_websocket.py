"""The WebSocket perimeter: limits that hold before any model is called."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app import main
from app.guard import Category, Language, Topic, Verdict
from tests.test_chat import ScriptedGate, ScriptedLLM, session

REFUSE = Verdict(Category.OFF_TOPIC, Topic.NONE, Language.EN)


@pytest.fixture
def scripted(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Replace the real models with scripted ones and return them."""
    parts = {"llm": ScriptedLLM(), "gate": ScriptedGate(REFUSE)}
    monkeypatch.setattr(main, "new_session", lambda: session(parts["llm"], parts["gate"]))
    return parts


def test_oversized_message_never_reaches_a_model(scripted: dict) -> None:
    with TestClient(main.app).websocket_connect("/api/v1/chat") as socket:
        assert socket.receive_json() == {"type": "ready"}

        socket.send_text("x" * 20_000)
        frame = socket.receive_json()

    assert frame["type"] == "error"
    assert scripted["gate"].calls == []
    assert scripted["llm"].calls == []


def test_conversation_closes_after_too_many_strikes(scripted: dict) -> None:
    with TestClient(main.app).websocket_connect("/api/v1/chat") as socket:
        assert socket.receive_json() == {"type": "ready"}

        for _ in range(main.settings.max_strikes - 1):
            socket.send_text("what is the capital of Australia?")
            assert socket.receive_json()["type"] == "message"

        socket.send_text("what is the capital of Australia?")
        assert socket.receive_json()["type"] == "message"
        assert socket.receive_json()["type"] == "error"
        with pytest.raises(WebSocketDisconnect):
            socket.receive_json()

    assert scripted["llm"].calls == []


@pytest.mark.parametrize(
    ("forwarded", "client"),
    [
        ("6.6.6.6, 1.2.3.4, 10.0.0.1", "1.2.3.4"),  # Forged first entry is ignored.
        ("1.2.3.4, 10.0.0.1", "1.2.3.4"),
        ("10.0.0.1", "10.0.0.1"),  # Shorter chain: its first entry.
    ],
)
def test_client_is_read_from_the_trusted_end_of_the_chain(forwarded: str, client: str) -> None:
    class Socket:
        headers = {"x-forwarded-for": forwarded}

    assert main._client_id(Socket()) == client


def test_unexpected_error_ends_in_an_error_frame(monkeypatch: pytest.MonkeyPatch) -> None:
    gate = ScriptedGate(RuntimeError("boom"))
    monkeypatch.setattr(main, "new_session", lambda: session(ScriptedLLM(), gate))

    with TestClient(main.app).websocket_connect("/api/v1/chat") as socket:
        assert socket.receive_json() == {"type": "ready"}
        socket.send_text("hello")

        assert socket.receive_json()["type"] == "error"


def test_missing_forwarded_header_uses_the_peer() -> None:
    class Peer:
        host = "9.9.9.9"

    class Socket:
        headers: dict = {}
        client = Peer()

    assert main._client_id(Socket()) == "9.9.9.9"
