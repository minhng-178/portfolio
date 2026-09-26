"""
IP-based rate limiting utilities.

In-memory sliding-window limiter, one instance per endpoint. State is
per-process: fine for a single container, and best-effort on serverless
(each warm instance keeps its own window). Move to a shared store (e.g. a
hosted Redis) behind the same `allow()` interface if abuse becomes real.
"""

import time
from collections import OrderedDict, deque

from fastapi import Request

from app.config import (
    CLIENT_IP_HEADER,
    CONTACT_RATE_LIMIT_MAX,
    CONTACT_RATE_LIMIT_WINDOW,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_MAX_TRACKED_KEYS,
    RATE_LIMIT_WINDOW_SECONDS,
)


def get_client_ip(request: Request) -> str:
    """
    Extract the client IP. Only the platform header named by CLIENT_IP_HEADER
    is trusted; otherwise use the TCP peer. X-Forwarded-For is never read
    directly because its leftmost value is whatever the client sent.
    """
    if CLIENT_IP_HEADER:
        value = request.headers.get(CLIENT_IP_HEADER, "").strip()
        if value:
            return value
    return request.client.host if request.client else "unknown"


class SlidingWindowLimiter:
    def __init__(self, max_requests: int, window_seconds: float, max_keys: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_keys = max_keys
        self._buckets: "OrderedDict[str, deque]" = OrderedDict()

    def allow(self, key: str) -> bool:
        """Record a hit for `key`. Returns True if the request is allowed."""
        now = time.monotonic()
        bucket = self._buckets.pop(key, None) or deque()
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()

        allowed = len(bucket) < self.max_requests
        if allowed:
            bucket.append(now)

        # Re-insert as most recently used; evict the least recently used keys.
        self._buckets[key] = bucket
        while len(self._buckets) > self.max_keys:
            self._buckets.popitem(last=False)
        return allowed

    def reset(self) -> None:
        self._buckets.clear()


chat_limiter = SlidingWindowLimiter(
    RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS, RATE_LIMIT_MAX_TRACKED_KEYS
)
contact_limiter = SlidingWindowLimiter(
    CONTACT_RATE_LIMIT_MAX, CONTACT_RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_TRACKED_KEYS
)
