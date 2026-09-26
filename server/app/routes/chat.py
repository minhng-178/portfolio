"""POST /api/chat — Main chat endpoint."""

from typing import List, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, RELEVANCE_CONTEXT_TURNS
from app.services import llm
from app.utils.rate_limit import chat_limiter, get_client_ip
from app.utils.topic import contains_vietnamese, is_on_topic

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=MAX_MESSAGE_LENGTH)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="The chat assistant is not configured.")

    if not chat_limiter.allow(get_client_ip(request)):
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

    state = request.app.state
    if not is_on_topic(relevance_text, state.topic_matcher):
        lang = "vi" if contains_vietnamese(req.message) else "en"
        return ChatResponse(reply=state.off_topic_replies[lang])

    messages = [
        {"role": m.role, "content": m.content} for m in trimmed_history
    ] + [{"role": "user", "content": req.message}]

    reply = await llm.complete_chat(state.system_prompt, messages)
    return ChatResponse(reply=reply)
