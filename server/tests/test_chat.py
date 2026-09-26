import json

from app.main import app
from app.utils import rate_limit


def test_health_reports_configured_features(client, fake_llm):
    assert client.get("/api/health").json() == {"status": "ok", "chat": True, "contact": False}


def test_unconfigured_chat_returns_503(client):
    response = client.post("/api/chat", json={"message": "What is your experience?"})
    assert response.status_code == 503


def test_on_topic_question_calls_openai_compatible_endpoint(client, fake_llm):
    response = client.post(
        "/api/chat",
        json={
            "message": "What is your React Native experience?",
            "history": [{"role": "assistant", "content": "Hi! Ask me anything."}],
        },
    )
    assert response.status_code == 200
    assert response.json() == {"reply": fake_llm.reply}

    [request] = fake_llm
    assert str(request.url) == "https://llm.test/v1/chat/completions"
    assert request.headers["authorization"] == "Bearer sk-test"
    payload = json.loads(request.content)
    assert payload["model"] == "test-model"
    assert payload["messages"][0] == {"role": "system", "content": app.state.system_prompt}
    assert payload["messages"][-1] == {
        "role": "user",
        "content": "What is your React Native experience?",
    }


def test_off_topic_question_never_reaches_the_model(client, fake_llm):
    response = client.post("/api/chat", json={"message": "Which team won the World Cup?"})
    assert response.json() == {"reply": app.state.off_topic_replies["en"]}
    assert fake_llm == []


def test_off_topic_reply_matches_vietnamese(client, fake_llm):
    response = client.post("/api/chat", json={"message": "Đội nào vô địch World Cup?"})
    assert response.json() == {"reply": app.state.off_topic_replies["vi"]}


def test_follow_up_inherits_topic_from_history(client, fake_llm):
    response = client.post(
        "/api/chat",
        json={
            "message": "Tell me more",
            "history": [
                {"role": "user", "content": "Tell me about BonVoye"},
                {"role": "assistant", "content": "BonVoye is a Flutter travel app."},
            ],
        },
    )
    assert response.json() == {"reply": fake_llm.reply}


def test_chat_rate_limited(client, fake_llm, monkeypatch):
    monkeypatch.setattr(rate_limit.chat_limiter, "max_requests", 2)
    codes = [
        client.post("/api/chat", json={"message": "What skills do you have?"}).status_code
        for _ in range(3)
    ]
    assert codes == [200, 200, 429]


def test_empty_model_reply_is_an_error(client, fake_llm):
    fake_llm.reply = "   "
    response = client.post("/api/chat", json={"message": "What skills do you have?"})
    assert response.status_code == 502
