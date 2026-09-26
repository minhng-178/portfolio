"""GET /api/health — Liveness plus which features are configured.

Deliberately does not call the LLM provider: the UI polls this on every page
load and a paid API should not be billed for it.
"""

from fastapi import APIRouter

from app.services import llm, smtp

router = APIRouter()


@router.get("/api/health")
async def health():
    return {
        "status": "ok",
        "chat": llm.is_configured(),
        "contact": smtp.is_configured(),
    }
