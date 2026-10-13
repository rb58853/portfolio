"""FastAPI application: health check and the portfolio chat WebSocket."""

from __future__ import annotations

import asyncio
import logging
import os
from contextlib import aclosing

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.chat import ChatSession, RateLimiter
from app.config import settings
from app.knowledge import load_knowledge
from app.llm import LLM, LLMError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

_PROVIDER_KEYS = ("GROQ_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY")
_POLICY_VIOLATION = 1008

_TOO_LONG = "That message is too long. Please keep it under {limit} characters."
_SESSION_LIMIT = "This conversation has reached its message limit. Reload the page to start a new one."
_RATE_LIMIT = "The assistant has received too many messages. Please try again later."
_UNAVAILABLE = (
    "The assistant is not available right now. Please try again in a moment, "
    "or use the contact details on the home page."
)

knowledge = load_knowledge(settings.knowledge_dir)
llm = LLM(
    model=settings.llm_model,
    fallback_models=settings.llm_fallback_models,
    max_tokens=settings.llm_max_tokens,
    timeout=settings.llm_timeout_seconds,
)
limiter = RateLimiter(
    max_connections_per_ip=settings.max_connections_per_ip,
    max_messages_per_ip_hour=settings.max_messages_per_ip_hour,
    max_messages_per_day=settings.max_messages_per_day,
)

if not any(os.getenv(key) for key in _PROVIDER_KEYS):
    logger.warning("No LLM provider key is set (%s): the chat will not answer", ", ".join(_PROVIDER_KEYS))

# The API surface is the chat only, so the interactive docs stay off.
app = FastAPI(title="Portfolio assistant", docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def _client_id(websocket: WebSocket) -> str:
    """Identify the visitor behind the reverse proxy, falling back to the peer."""
    # The service is only reachable through nginx, which appends the real peer
    # to X-Forwarded-For. A forged first entry dodges the per-client limits
    # but not the daily cap.
    forwarded = websocket.headers.get("x-forwarded-for", "")
    first_hop = forwarded.split(",")[0].strip()
    return first_hop or (websocket.client.host if websocket.client else "unknown")


def _origin_allowed(websocket: WebSocket) -> bool:
    if not settings.allowed_origins:
        return True
    return websocket.headers.get("origin") in settings.allowed_origins


async def _send(websocket: WebSocket, kind: str, response: str, projects: dict[str, str] | None = None) -> None:
    await websocket.send_json({"type": kind, "response": response, "projects": projects or {}})


@app.websocket("/api/v1/chat")
async def chat(websocket: WebSocket) -> None:
    """Serve one conversation.

    The server sends ``{"type": "ready"}`` once the chat is open. Each text
    frame from the client is a visitor message. The answer is streamed as
    ``{"type": "delta", "text": ...}`` frames (``{"type": "reset"}`` discards
    the text sent so far) and always ends with one frame
    ``{"type": "message" | "error", "response": <markdown>, "projects": {id: comment}}``.
    """
    client = _client_id(websocket)
    if not _origin_allowed(websocket) or not limiter.open_connection(client):
        await websocket.close(code=_POLICY_VIOLATION)
        return

    try:
        await websocket.accept()
        await websocket.send_json({"type": "ready"})

        session = ChatSession(
            llm,
            knowledge,
            history_turns=settings.history_turns,
            blocked_terms=settings.blocked_terms,
        )
        answered = 0

        while True:
            query = await asyncio.wait_for(
                websocket.receive_text(), timeout=settings.idle_timeout_seconds
            )
            query = query.strip()
            if not query:
                continue

            if len(query) > settings.max_message_chars:
                await _send(websocket, "error", _TOO_LONG.format(limit=settings.max_message_chars))
            elif answered >= settings.max_messages_per_session:
                await _send(websocket, "error", _SESSION_LIMIT)
            elif not limiter.allow_message(client):
                await _send(websocket, "error", _RATE_LIMIT)
            else:
                answered += 1
                try:
                    async with aclosing(session.stream_reply(query)) as frames:
                        async for frame in frames:
                            await websocket.send_json(frame)
                except LLMError as error:
                    logger.error("chat reply failed: %s", error)
                    await _send(websocket, "error", _UNAVAILABLE)
    except WebSocketDisconnect:
        pass
    except asyncio.TimeoutError:
        await websocket.close()
    finally:
        limiter.close_connection(client)
