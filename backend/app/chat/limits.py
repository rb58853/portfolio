"""In-memory usage limits for the public chat endpoint."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import date

_HOUR_SECONDS = 3600


class RateLimiter:
    """Cap connections, messages and strikes per client, and messages per day overall.

    State lives in the process, so the service must run as a single worker.
    """

    def __init__(
        self,
        max_connections_per_ip: int,
        max_messages_per_ip_hour: int,
        max_messages_per_day: int,
        max_strikes_per_ip_hour: int = 10,
    ) -> None:
        """Store the limits.

        Args:
            max_connections_per_ip: Simultaneous chats allowed for one client.
            max_messages_per_ip_hour: Messages one client may send per hour.
            max_messages_per_day: Messages answered per day across all clients.
            max_strikes_per_ip_hour: Refused messages and rejected drafts one
                client may collect per hour, across conversations, before it
                is turned away. A conversation closes at its own, lower limit;
                this one stops reconnecting to start over.
        """
        self.max_connections_per_ip = max_connections_per_ip
        self.max_messages_per_ip_hour = max_messages_per_ip_hour
        self.max_messages_per_day = max_messages_per_day
        self.max_strikes_per_ip_hour = max_strikes_per_ip_hour

        self._connections: defaultdict[str, int] = defaultdict(int)
        self._messages: defaultdict[str, deque[float]] = defaultdict(deque)
        self._strikes: defaultdict[str, deque[float]] = defaultdict(deque)
        self._day = date.today()
        self._day_count = 0

    @staticmethod
    def _recent(events: deque[float], now: float) -> deque[float]:
        while events and now - events[0] > _HOUR_SECONDS:
            events.popleft()
        return events

    def _struck_out(self, client: str) -> bool:
        return len(self._recent(self._strikes[client], time.monotonic())) >= self.max_strikes_per_ip_hour

    def record_strikes(self, client: str, count: int) -> None:
        """Add ``count`` strikes to ``client``."""
        now = time.monotonic()
        self._strikes[client].extend([now] * max(0, count))

    def open_connection(self, client: str) -> bool:
        """Reserve a connection slot for ``client``; ``False`` when it has none left."""
        if self._connections[client] >= self.max_connections_per_ip or self._struck_out(client):
            return False
        self._connections[client] += 1
        return True

    def close_connection(self, client: str) -> None:
        """Release a slot reserved with :meth:`open_connection`."""
        self._connections[client] -= 1
        if self._connections[client] <= 0:
            del self._connections[client]

    def allow_message(self, client: str) -> bool:
        """Count one message for ``client``; ``False`` when a limit is exceeded."""
        today = date.today()
        if today != self._day:
            self._day, self._day_count = today, 0
            self._messages.clear()
        if self._day_count >= self.max_messages_per_day or self._struck_out(client):
            return False

        now = time.monotonic()
        sent = self._recent(self._messages[client], now)
        if len(sent) >= self.max_messages_per_ip_hour:
            return False

        sent.append(now)
        self._day_count += 1
        return True
