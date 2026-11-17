"""FastAPI application: health check and the portfolio chat WebSocket."""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import os
import re
import secrets
import time
import unicodedata
from contextlib import aclosing

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.chat import ChatSession, RateLimiter, instruction_texts
from app.config import settings
from app.guard import InputGate, OutputGuard, load_policy, normalize
from app.knowledge import load_knowledge
from app.llm import LLM, LLMError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

_PROVIDER_KEYS = ("GROQ_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY")
_POLICY_VIOLATION = 1008
_UNSUPPORTED_DATA = 1003

_TOO_LONG = "That message is a little too long for me. Could you keep it under {limit} characters?"
_TOO_MANY_SYMBOLS = "That message has more symbols than I can read. Could you write it in plain words?"
_SESSION_LIMIT = (
    "We have reached the message limit for this conversation. Reload the page whenever "
    "you want to start a new one."
)
_RATE_LIMIT = "The assistant is receiving a lot of messages right now. Please try again in a while."
_STRIKES = (
    "I will close this conversation here: this assistant is only meant for questions about my "
    "professional profile. For anything else, the contact details on the home page reach me directly.\n\n"
    "Cierro aquí esta conversación: este asistente solo está pensado para preguntas sobre mi "
    "perfil profesional. Para cualquier otra cosa, puedes escribirme con los datos de contacto de la portada."
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
    # The knowledge's own directive notes are instructions too: never quoted.
    protected_prompts=[*instruction_texts(), *knowledge.directives],
    knowledge_context=knowledge.context,
    canary=secrets.token_hex(8),
    # Project ids that are not ordinary words ("dairyRobotCell") only belong in the cards block.
    internal_ids=[project_id for project_id in knowledge.project_ids if re.search(r"[a-z][A-Z]", project_id)],
)
limiter = RateLimiter(
    max_connections_per_ip=settings.max_connections_per_ip,
    max_messages_per_ip_hour=settings.max_messages_per_ip_hour,
    max_messages_per_day=settings.max_messages_per_day,
    max_strikes_per_ip_hour=settings.max_strikes_per_ip_hour,
    max_messages_per_ip_day=settings.max_messages_per_ip_day,
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
        address = hops[-settings.trusted_proxy_hops]
    elif hops:
        address = hops[0]
    else:
        address = websocket.client.host if websocket.client else "unknown"
    return _subscriber(address)


def _subscriber(address: str) -> str:
    """The unit the limits count: an IPv4 address, or the /64 network of an IPv6 one.

    One IPv6 subscriber holds a whole /64; counting single addresses would
    give it billions of fresh identities.
    """
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return address
    if ip.version == 6:
        return str(ipaddress.ip_network(f"{ip}/64", strict=False))
    return str(ip)


def _symbols(text: str) -> int:
    """Characters that are neither letters, digits, punctuation nor spaces."""
    return sum(1 for char in text if unicodedata.category(char)[0] in "SC" and char != "\n")


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
        opened = last_message = time.monotonic()

        while True:
            # Only accepted messages keep a conversation alive, and none lives forever.
            now = time.monotonic()
            remaining = min(
                settings.idle_timeout_seconds - (now - last_message),
                settings.max_session_seconds - (now - opened),
            )
            if remaining <= 0:
                await websocket.close()
                return
            frame = await asyncio.wait_for(websocket.receive(), timeout=remaining)
            if frame["type"] == "websocket.disconnect":
                raise WebSocketDisconnect(frame.get("code", 1000))
            if frame.get("text") is None:
                # The chat speaks text only.
                await websocket.close(code=_UNSUPPORTED_DATA)
                return

            # Limits apply to the text the models will read: normalisation can
            # turn a few characters into many, and invisible ones into nothing.
            query = normalize(frame["text"])
            if not query:
                continue
            last_message = time.monotonic()

            if len(query) > settings.max_message_chars:
                await _send(websocket, "error", _TOO_LONG.format(limit=settings.max_message_chars))
            elif _symbols(query) > settings.max_message_symbols:
                await _send(websocket, "error", _TOO_MANY_SYMBOLS)
            elif answered >= settings.max_messages_per_session:
                await _send(websocket, "error", _SESSION_LIMIT)
            elif not limiter.allow_message(client):
                await _send(websocket, "error", _RATE_LIMIT)
            else:
                answered += 1
                strikes = session.strikes
                try:
                    async with aclosing(session.stream_reply(query)) as frames:
                        async for reply_frame in frames:
                            await websocket.send_json(reply_frame)
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
                finally:
                    # Also when the visitor leaves mid-answer: closing the
                    # socket must not erase the strikes the message earned.
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
