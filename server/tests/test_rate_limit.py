from starlette.requests import Request

from app.utils import rate_limit
from app.utils.rate_limit import SlidingWindowLimiter, get_client_ip


def make_request(headers=None, client=("10.0.0.1", 1234)):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "headers": raw, "client": client})


def test_limiter_blocks_after_max_and_keys_are_independent():
    limiter = SlidingWindowLimiter(max_requests=2, window_seconds=60, max_keys=100)
    assert limiter.allow("a")
    assert limiter.allow("a")
    assert not limiter.allow("a")
    assert limiter.allow("b")


def test_limiter_window_expires(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(rate_limit.time, "monotonic", lambda: now[0])
    limiter = SlidingWindowLimiter(max_requests=1, window_seconds=60, max_keys=100)
    assert limiter.allow("a")
    assert not limiter.allow("a")
    now[0] += 61
    assert limiter.allow("a")


def test_limiter_memory_is_bounded():
    limiter = SlidingWindowLimiter(max_requests=5, window_seconds=60, max_keys=3)
    for i in range(50):
        limiter.allow(f"ip-{i}")
    assert len(limiter._buckets) == 3


def test_client_ip_ignores_spoofable_forwarded_for():
    request = make_request({"X-Forwarded-For": "6.6.6.6"})
    assert get_client_ip(request) == "10.0.0.1"


def test_client_ip_uses_configured_platform_header(monkeypatch):
    monkeypatch.setattr(rate_limit, "CLIENT_IP_HEADER", "cf-connecting-ip")
    request = make_request({"CF-Connecting-IP": "203.0.113.7"})
    assert get_client_ip(request) == "203.0.113.7"
    # Falls back to the peer if the platform header is absent.
    assert get_client_ip(make_request()) == "10.0.0.1"
