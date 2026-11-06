"""FastAPI application: health check and the portfolio chat WebSocket."""

from __future__ import annotations

import asyncio
import logging
import os
import secrets
from contextlib import aclosing

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.chat import ChatSession, RateLimiter, instruction_texts
from app.config import settings
from app.guard import InputGate, OutputGuard, load_policy
from app.knowledge import load_knowledge
from app.llm import LLM, LLMError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

_PROVIDER_KEYS = ("GROQ_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY")
_POLICY_VIOLATION = 1008

_TOO_LONG = "That message is too long. Please keep it under {limit} characters."
_SESSION_LIMIT = "This conversation has reached its message limit. Reload the page to start a new one."
_RATE_LIMIT = "The assistant has received too many messages. Please try again later."
_STRIKES = (
    "This conversation has ended. The assistant only answers questions about my profile. "
    "Esta conversación ha terminado: el asistente solo responde sobre mi perfil."
)
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
    reasoning_effort=settings.llm_reasoning_effort,
)
gate = InputGate(
    LLM(
        model=settings.guard_model,
        fallback_models=settings.guard_fallback_models,
        timeout=settings.guard_timeout_seconds,
        reasoning_effort="low",
    ),
    policy=load_policy()["policy"],
)
# One canary per process: it sits in the static prompt prefix, which the
# provider caches only while it stays byte-identical.
guard = OutputGuard(
    blocked_terms=settings.blocked_terms,
    protected_prompts=instruction_texts(),
    knowledge_context=knowledge.context,
    canary=secrets.token_hex(8),
)
limiter = RateLimiter(
    max_connections_per_ip=settings.max_connections_per_ip,
    max_messages_per_ip_hour=settings.max_messages_per_ip_hour,
    max_messages_per_day=settings.max_messages_per_day,
    max_strikes_per_ip_hour=settings.max_strikes_per_ip_hour,
)

if not any(os.getenv(key) for key in _PROVIDER_KEYS):
    logger.warning("No LLM provider key is set (%s): the chat will not answer", ", ".join(_PROVIDER_KEYS))

# The API surface is the chat only, so the interactive docs stay off.
app = FastAPI(title="Portfolio assistant", docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def new_session() -> ChatSession:
    """Start one visitor conversation with the service-wide model and limits."""
    return ChatSession(llm, knowledge, gate, guard, history_turns=settings.history_turns)


def _client_id(websocket: WebSocket) -> str:
    """Identify the visitor behind the reverse proxies, falling back to the peer.

    Each trusted proxy appends the address it received the request from to
    X-Forwarded-For, so the client is the entry ``trusted_proxy_hops`` from
    the right. Entries further left were written by the client and can be
    forged. A shorter chain falls back to its first entry.
    """
    hops = [hop.strip() for hop in websocket.headers.get("x-forwarded-for", "").split(",") if hop.strip()]
    if len(hops) >= settings.trusted_proxy_hops:
        return hops[-settings.trusted_proxy_hops]
    if hops:
        return hops[0]
    return websocket.client.host if websocket.client else "unknown"


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

        session = new_session()
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
                strikes = session.strikes
                try:
                    async with aclosing(session.stream_reply(query)) as frames:
                        async for frame in frames:
                            await websocket.send_json(frame)
                except LLMError as error:
                    logger.error("chat reply failed: %s", error)
                    await _send(websocket, "error", _UNAVAILABLE)
                except WebSocketDisconnect:
                    raise
                except Exception:
                    # Whatever broke, the visitor gets an error frame, never a
                    # half-open socket or a partial answer left on screen.
                    logger.exception("chat reply crashed")
                    await _send(websocket, "error", _UNAVAILABLE)
                limiter.record_strikes(client, session.strikes - strikes)
                if session.strikes >= settings.max_strikes:
                    logger.warning("chat closed after %s strikes client=%s", session.strikes, client)
                    await _send(websocket, "error", _STRIKES)
                    await websocket.close(code=_POLICY_VIOLATION)
                    return
    except WebSocketDisconnect:
        pass
    except asyncio.TimeoutError:
        await websocket.close()
    finally:
        limiter.close_connection(client)
