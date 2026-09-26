"""
LLM service — OpenAI-compatible Chat Completions client.

Works against any provider or gateway that speaks the OpenAI Chat Completions
API, including a local Ollama (LLM_BASE_URL=http://localhost:11434/v1).
Switching providers is a configuration change, not a code change.
"""

import logging

import httpx
from fastapi import HTTPException

from app.config import (
    LLM_API_KEY,
    LLM_BASE_URL,
    LLM_MAX_TOKENS,
    LLM_MODEL,
    LLM_TIMEOUT_SECONDS,
)


def is_configured() -> bool:
    return bool(LLM_BASE_URL and LLM_MODEL)


async def complete_chat(system_prompt: str, messages: list) -> str:
    """
    Send a chat request and return the assistant's reply text.
    Raises HTTPException on configuration, network or model errors.
    """
    if not is_configured():
        raise HTTPException(status_code=503, detail="The chat assistant is not configured.")

    headers = {"Authorization": f"Bearer {LLM_API_KEY}"} if LLM_API_KEY else {}
    payload = {
        "model": LLM_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "max_tokens": LLM_MAX_TOKENS,
        "temperature": 0.3,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{LLM_BASE_URL}/chat/completions", json=payload, headers=headers
            )
            response.raise_for_status()
    except httpx.HTTPError as e:
        logging.error(f"LLM request failed: {e!r}")
        raise HTTPException(
            status_code=503,
            detail="The chat assistant is currently unavailable. Please try again shortly.",
        )

    try:
        reply = response.json()["choices"][0]["message"]["content"] or ""
    except (ValueError, KeyError, IndexError, TypeError):
        reply = ""
    reply = reply.strip()
    if not reply:
        raise HTTPException(status_code=502, detail="Empty response from model")

    return reply
