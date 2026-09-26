"""
Portfolio Backend — FastAPI application entry point.

Responsibilities:
  - Load shared startup data (cv_data.json) once and store in app.state
  - Register middleware
  - Mount all routers

Stateless apart from the per-instance rate limiter, so the same `app` object
runs under uvicorn locally or behind a serverless ASGI adapter.
Business logic lives in routes/, services/, and utils/.
"""

import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS, CV_DATA_PATH
from app.routes import chat, contact, health
from app.services.prompt import build_off_topic_replies, build_system_prompt
from app.utils.topic import build_topic_matcher

# ---------------------------------------------------------------------------
# Startup: load cv_data once, build derived state
# ---------------------------------------------------------------------------
with open(CV_DATA_PATH, "r", encoding="utf-8") as f:
    _cv_data = json.load(f)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Portfolio Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ---------------------------------------------------------------------------
# Shared state (accessible in routes via request.app.state)
# ---------------------------------------------------------------------------
app.state.system_prompt = build_system_prompt(_cv_data)
app.state.off_topic_replies = build_off_topic_replies(_cv_data)
app.state.topic_matcher = build_topic_matcher(_cv_data)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(contact.router)
