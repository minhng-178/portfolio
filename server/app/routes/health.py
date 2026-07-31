"""GET /api/health — Liveness probe for the Ollama backend."""

import httpx
from fastapi import APIRouter, HTTPException

from app.config import OLLAMA_URL

router = APIRouter()


@router.get("/api/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Ollama is not reachable")
    return {"status": "ok"}
