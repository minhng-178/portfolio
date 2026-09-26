from app.services import smtp

VALID = {"name": "Jane Recruiter", "email": "jane@example.com", "message": "Hello!"}


def test_unconfigured_contact_reports_503_instead_of_fake_success(client):
    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 503


def test_dry_run_sends_successfully(client, monkeypatch):
    monkeypatch.setattr(smtp, "MAIL_DRY_RUN", True)
    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_invalid_email_rejected(client, monkeypatch):
    monkeypatch.setattr(smtp, "MAIL_DRY_RUN", True)
    response = client.post("/api/contact", json={**VALID, "email": "not-an-email"})
    assert response.status_code == 400


def test_name_is_single_line_before_it_reaches_headers(client, monkeypatch):
    monkeypatch.setattr(smtp, "MAIL_DRY_RUN", True)
    sent = []
    monkeypatch.setattr(smtp, "send_contact_email", lambda *args: sent.append(args) or True)
    client.post("/api/contact", json={**VALID, "name": "Eve\r\nBcc: victim@example.com"})
    assert sent[0][0] == "Eve Bcc: victim@example.com"


def test_email_html_escapes_visitor_input():
    msg = smtp.build_contact_email(
        '<a href="https://phish.example">Click</a>',
        "jane@example.com",
        "<script>alert(1)</script>",
    )
    html = msg.get_payload()[1].get_payload(decode=True).decode()
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert 'href="https://phish.example"' not in html


def test_contact_rate_limited(client, monkeypatch):
    monkeypatch.setattr(smtp, "MAIL_DRY_RUN", True)
    codes = [client.post("/api/contact", json=VALID).status_code for _ in range(6)]
    assert codes[:5] == [200] * 5
    assert codes[5] == 429
