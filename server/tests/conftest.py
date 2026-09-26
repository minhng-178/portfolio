import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import llm, smtp
from app.utils import rate_limit


@pytest.fixture(autouse=True)
def _isolate(monkeypatch):
    """Every test starts unconfigured, with empty rate-limit windows."""
    monkeypatch.setattr(llm, "LLM_BASE_URL", "")
    monkeypatch.setattr(llm, "LLM_MODEL", "")
    monkeypatch.setattr(llm, "LLM_API_KEY", "")
    monkeypatch.setattr(smtp, "SMTP_USER", "")
    monkeypatch.setattr(smtp, "SMTP_PASSWORD", "")
    monkeypatch.setattr(smtp, "MAIL_DRY_RUN", False)
    monkeypatch.setattr(rate_limit, "CLIENT_IP_HEADER", "")
    rate_limit.chat_limiter.reset()
    rate_limit.contact_limiter.reset()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def fake_llm(monkeypatch):
    """
    Configure the LLM and route its HTTP calls to an in-process handler.
    Returns the list of captured requests; set `.reply` to change the answer.
    """
    monkeypatch.setattr(llm, "LLM_BASE_URL", "https://llm.test/v1")
    monkeypatch.setattr(llm, "LLM_MODEL", "test-model")
    monkeypatch.setattr(llm, "LLM_API_KEY", "sk-test")

    class Calls(list):
        reply = "I have 2+ years of React Native experience."

    calls = Calls()

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(
            200, json={"choices": [{"message": {"role": "assistant", "content": calls.reply}}]}
        )

    real_async_client = httpx.AsyncClient

    def async_client(*args, **kwargs):
        return real_async_client(*args, transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(llm.httpx, "AsyncClient", async_client)
    return calls
