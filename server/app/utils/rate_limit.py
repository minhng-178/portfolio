"""
IP-based rate limiting utilities.

Uses an in-memory sliding-window bucket per IP address.
Two separate limiters are provided:
  - chat_rate_limit   — for the /api/chat endpoint
  - contact_rate_limit — for the /api/contact endpoint
"""

import time
from collections import defaultdict, deque

from fastapi import Request

from app.config import (
    CONTACT_RATE_LIMIT_MAX,
    CONTACT_RATE_LIMIT_WINDOW,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
)

# ---------------------------------------------------------------------------
# Internal buckets (module-level singletons)
# ---------------------------------------------------------------------------
_chat_buckets: dict = defaultdict(deque)
_contact_buckets: dict = defaultdict(deque)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_client_ip(request: Request) -> str:
    """
    Extract the real client IP.
    Caddy (or any reverse proxy) sets X-Forwarded-For; fall back to the
    direct peer address for local/dev runs without a proxy.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_limit(bucket: deque, max_requests: int, window_seconds: int) -> bool:
    """Sliding-window check. Returns True if the request is allowed."""
    now = time.monotonic()
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= max_requests:
        return False
    bucket.append(now)
    return True


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def check_chat_rate_limit(ip: str) -> bool:
    return _check_limit(
        _chat_buckets[ip], RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS
    )


def check_contact_rate_limit(ip: str) -> bool:
    return _check_limit(
        _contact_buckets[ip], CONTACT_RATE_LIMIT_MAX, CONTACT_RATE_LIMIT_WINDOW
    )
