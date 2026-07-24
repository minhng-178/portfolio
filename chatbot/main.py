import json
import logging
import os
import re
import smtplib
import time
import unicodedata
from collections import defaultdict, deque
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Literal

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000"
).split(",")

# SMTP configuration for contact form email delivery
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
CONTACT_RECEIVER_EMAIL = os.environ.get("CONTACT_RECEIVER_EMAIL", "")

CONTACT_RATE_LIMIT_MAX = 5
CONTACT_RATE_LIMIT_WINDOW = 600  # 10 minutes
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

CV_DATA_PATH = Path(__file__).resolve().parent.parent / "cv_data.json"
if not CV_DATA_PATH.exists():
    CV_DATA_PATH = Path(__file__).resolve().parent.parent / "ui" / "cv_data.json"

MAX_HISTORY_MESSAGES = 20
MAX_MESSAGE_LENGTH = 2000
# How many recent turns to fold into the topic-relevance check, so short
# follow-ups like "tell me more" inherit the relevance of the prior turn.
RELEVANCE_CONTEXT_TURNS = 2

# Per-IP rate limit for the public /api/chat endpoint, to bound abuse/cost
# once this is reachable from the open internet rather than just localhost.
RATE_LIMIT_MAX_REQUESTS = 20
RATE_LIMIT_WINDOW_SECONDS = 600

SALARY_STATEMENT = (
    "$1,500-$2,000 USD per month, negotiable depending on role scope, "
    "seniority, and whether the position is remote or based in Ho Chi Minh City."
)

# Static topic keywords (English + Vietnamese) covering CV-related subjects
# and basic small talk. Combined at startup with keywords extracted from
# cv_data.json (company names, tech stack, schools, etc.) to build the
# allow-list used by is_on_topic().
STATIC_KEYWORDS = [
    # English - CV subjects
    "experience", "work", "job", "career", "skill", "skills", "project",
    "projects", "education", "degree", "school", "university", "salary",
    "compensation", "pay", "rate", "expect", "expected", "contact", "email",
    "phone", "linkedin", "github", "location", "available", "availability",
    "hire", "hiring", "opportunity", "cv", "resume", "background",
    "developer", "engineer", "role", "position", "company", "tech stack",
    "technology", "technologies", "gpa", "recruiter", "interview",
    "notice period", "remote", "relocate", "relocation",
    # English - small talk
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "thanks", "thank you", "bye", "goodbye",
    # Vietnamese - CV subjects
    "kinh nghiệm", "làm việc", "công việc", "kỹ năng", "dự án", "học vấn",
    "bằng cấp", "trường", "đại học", "lương", "mức lương", "thu nhập",
    "liên hệ", "điện thoại", "địa chỉ", "sẵn sàng", "cơ hội", "tuyển dụng",
    "phỏng vấn", "hồ sơ", "kỹ sư", "lập trình", "vị trí", "công ty",
    "làm remote", "làm từ xa",
    # Vietnamese - small talk
    "xin chào", "chào", "cảm ơn", "tạm biệt",
]

VIETNAMESE_CHARS_PATTERN = re.compile(
    "[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡ"
    "ùúụủũưừứựửữỳýỵỷỹđ]",
    re.IGNORECASE,
)

OFF_TOPIC_REPLY_EN = (
    "I'm only able to answer questions about Minh's CV — his work experience, "
    "skills, projects, education, expected salary, or how to contact him. "
    "Feel free to ask about any of those!"
)
OFF_TOPIC_REPLY_VI = (
    "Mình chỉ có thể trả lời các câu hỏi "
    "liên quan đến CV của Minh — kinh nghiệm làm "
    "việc, kỹ năng, dự án, học vấn, mức "
    "lương mong muốn, hoặc cách liên hệ. Bạn "
    "hãy hỏi về những chủ đề này nhé!"
)


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def build_topic_keywords(cv_data: dict) -> List[str]:
    keywords = set(STATIC_KEYWORDS)

    for job in cv_data.get("work_experience", []):
        keywords.add(job["company"].lower())
        keywords.add(job["role"].lower())
        for tech in job.get("tech", []):
            keywords.add(tech.lower())

    for project in cv_data.get("projects", []):
        keywords.add(project["name"].lower())
        for tech in project.get("tech", []):
            keywords.add(tech.lower())

    for category in cv_data.get("skills", []):
        for item in category["items"].split(","):
            item = item.strip().lower()
            if len(item) > 2:
                keywords.add(item)

    for edu in cv_data.get("education", []):
        keywords.add(edu["school"].lower())
        keywords.add(edu["degree"].lower())

    return sorted(keywords)


def contains_vietnamese(text: str) -> bool:
    return bool(VIETNAMESE_CHARS_PATTERN.search(text))


def is_on_topic(text: str, keywords: List[str]) -> bool:
    haystack = _strip_accents(text.lower())
    for keyword in keywords:
        needle = _strip_accents(keyword.lower())
        if needle and needle in haystack:
            return True
    return False


_rate_limit_buckets: dict = defaultdict(deque)


def client_ip(request: Request) -> str:
    # Caddy (or any reverse proxy) sets this; fall back to the direct peer
    # address for local/dev runs without a proxy in front.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(ip: str) -> bool:
    now = time.monotonic()
    bucket = _rate_limit_buckets[ip]
    while bucket and now - bucket[0] > RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    bucket.append(now)
    return True


def build_system_prompt(cv_data: dict) -> str:
    info = cv_data["personal_info"]

    lines = [
        f"You are the virtual assistant for {info['name']}'s portfolio website. "
        f"Speak in first person as if you are representing {info['name']} "
        f"({info['title']}) to recruiters and hiring managers.",
        "",
        f"Summary: {cv_data['summary']}",
        "",
        "Work experience:",
    ]

    for job in cv_data["work_experience"]:
        lines.append(f"- {job['role']} at {job['company']} ({job['dates']})")
        for bullet in job["bullets"]:
            lines.append(f"  - {bullet}")

    lines.append("")
    lines.append("Projects:")
    for project in cv_data.get("projects", []):
        lines.append(f"- {project['name']} ({project['dates']}): {project['description']}")

    lines.append("")
    lines.append("Skills:")
    for category in cv_data.get("skills", []):
        lines.append(f"- {category['category']}: {category['items']}")

    lines.append("")
    lines.append("Education:")
    for edu in cv_data.get("education", []):
        lines.append(f"- {edu['degree']}, {edu['school']} ({edu['dates']}), GPA {edu['gpa']}")

    lines += [
        "",
        f"Contact info: email {info['email']}, phone {info['phone']}, "
        f"LinkedIn {info['linkedin_url']}, GitHub {info['github_url']}, "
        f"location {info['location']}.",
        "",
        "Instructions:",
        "- Only state facts drawn from the information above. Never invent experience, "
        "employers, dates, or skills that are not listed.",
        f"- If asked about expected salary, compensation, or rate, state exactly: "
        f"{SALARY_STATEMENT}",
        "- Keep answers concise (a few sentences) and professional, suitable for a "
        "recruiter or hiring manager reading on a website widget.",
        "- Detect the language of the user's message (English or Vietnamese) and "
        "always reply in that same language.",
        "- If asked something unrelated to this CV or outside what's listed above, "
        f'refuse and reply with exactly: "{OFF_TOPIC_REPLY_EN}" (or the Vietnamese '
        f'equivalent "{OFF_TOPIC_REPLY_VI}" if the user wrote in Vietnamese). Do not '
        "guess or answer questions outside this CV's scope.",
    ]

    return "\n".join(lines)


with open(CV_DATA_PATH, "r", encoding="utf-8") as f:
    CV_DATA = json.load(f)

SYSTEM_PROMPT = build_system_prompt(CV_DATA)
TOPIC_KEYWORDS = build_topic_keywords(CV_DATA)

app = FastAPI(title="CV Chatbot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


@app.get("/api/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Ollama is not reachable")
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    if not check_rate_limit(client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail="Too many messages. Please wait a bit before trying again.",
        )

    trimmed_history = req.history[-MAX_HISTORY_MESSAGES:]

    # Hard rule: reject off-topic questions before ever calling the model.
    # Recent turns are folded in so short follow-ups ("tell me more") inherit
    # the relevance of the conversation they belong to.
    recent_context = " ".join(
        m.content for m in trimmed_history[-RELEVANCE_CONTEXT_TURNS:]
    )
    relevance_text = f"{recent_context} {req.message}"
    if not is_on_topic(relevance_text, TOPIC_KEYWORDS):
        reply = OFF_TOPIC_REPLY_VI if contains_vietnamese(req.message) else OFF_TOPIC_REPLY_EN
        return ChatResponse(reply=reply)

    messages = (
        [{"role": "system", "content": SYSTEM_PROMPT}]
        + [{"role": m.role, "content": m.content} for m in trimmed_history]
        + [{"role": "user", "content": req.message}]
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={"model": MODEL_NAME, "messages": messages, "stream": False},
            )
            response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="The chat assistant is currently unavailable. Please try again shortly.",
        )

    data = response.json()
    reply = data.get("message", {}).get("content", "").strip()
    if not reply:
        raise HTTPException(status_code=502, detail="Empty response from model")

    return ChatResponse(reply=reply)


_contact_rate_limit_buckets: dict = defaultdict(deque)


def check_contact_rate_limit(ip: str) -> bool:
    now = time.monotonic()
    bucket = _contact_rate_limit_buckets[ip]
    while bucket and now - bucket[0] > CONTACT_RATE_LIMIT_WINDOW:
        bucket.popleft()
    if len(bucket) >= CONTACT_RATE_LIMIT_MAX:
        return False
    bucket.append(now)
    return True


def send_contact_email(name: str, email: str, message_text: str) -> bool:
    if not SMTP_USER or not SMTP_PASSWORD:
        logging.warning(
            "SMTP_USER or SMTP_PASSWORD environment variables are not set. "
            "Skipping real SMTP email dispatch (dev mode simulation)."
        )
        return True

    receiver = CONTACT_RECEIVER_EMAIL or SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Portfolio Contact] Message from {name}"
    msg["From"] = SMTP_USER
    msg["To"] = receiver
    msg["Reply-To"] = email

    text_body = (
        f"New contact form submission on your portfolio:\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n\n"
        f"Message:\n{message_text}\n"
    )

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0284c7; margin-top: 0; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">New Contact Form Message</h2>
          <p style="margin: 8px 0;"><strong>Sender Name:</strong> {name}</p>
          <p style="margin: 8px 0;"><strong>Sender Email:</strong> <a href="mailto:{email}" style="color: #0284c7;">{email}</a></p>
          <div style="margin-top: 16px; padding: 16px; background-color: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 4px;">
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">{message_text}</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This message was sent from your portfolio contact form.</p>
        </div>
      </body>
    </html>
    """

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, receiver, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, receiver, msg.as_string())
        return True
    except Exception as e:
        logging.error(f"Failed to send contact email: {e}")
        return False


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=1, max_length=5000)


class ContactResponse(BaseModel):
    status: str
    message: str


@app.post("/api/contact", response_model=ContactResponse)
async def contact_form(req: ContactRequest, request: Request):
    if not check_contact_rate_limit(client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail="Too many contact submissions. Please wait 10 minutes before sending another message.",
        )

    clean_name = req.name.strip()
    clean_email = req.email.strip()
    clean_message = req.message.strip()

    if not clean_name or not clean_email or not clean_message:
        raise HTTPException(status_code=400, detail="All fields are required.")

    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    sent_successfully = send_contact_email(clean_name, clean_email, clean_message)
    if not sent_successfully:
        raise HTTPException(
            status_code=500,
            detail="Unable to send email at this time. Please try again later.",
        )

    return ContactResponse(
        status="success",
        message=f"Thank you, {clean_name}! Your message has been sent successfully."
    )

