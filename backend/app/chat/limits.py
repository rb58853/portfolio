"""In-memory usage limits for the public chat endpoint."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import date

_HOUR_SECONDS = 3600


class RateLimiter:
    """Cap connections and messages per client, and messages per day overall.

    State lives in the process, so the service must run as a single worker.
    """

    def __init__(
        self,
        max_connections_per_ip: int,
        max_messages_per_ip_hour: int,
        max_messages_per_day: int,
    ) -> None:
        """Store the limits.

        Args:
            max_connections_per_ip: Simultaneous chats allowed for one client.
            max_messages_per_ip_hour: Messages one client may send per hour.
            max_messages_per_day: Messages answered per day across all clients.
        """
        self.max_connections_per_ip = max_connections_per_ip
        self.max_messages_per_ip_hour = max_messages_per_ip_hour
        self.max_messages_per_day = max_messages_per_day

        self._connections: defaultdict[str, int] = defaultdict(int)
        self._messages: defaultdict[str, deque[float]] = defaultdict(deque)
        self._day = date.today()
        self._day_count = 0

    def open_connection(self, client: str) -> bool:
        """Reserve a connection slot for ``client``; ``False`` when it has none left."""
        if self._connections[client] >= self.max_connections_per_ip:
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
        if self._day_count >= self.max_messages_per_day:
            return False

        now = time.monotonic()
        sent = self._messages[client]
        while sent and now - sent[0] > _HOUR_SECONDS:
            sent.popleft()
        if len(sent) >= self.max_messages_per_ip_hour:
            return False

        sent.append(now)
        self._day_count += 1
        return True
