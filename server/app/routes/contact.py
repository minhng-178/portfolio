"""POST /api/contact — Contact form submission endpoint."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.config import EMAIL_REGEX
from app.services import smtp
from app.utils.rate_limit import contact_limiter, get_client_ip

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=1, max_length=5000)


class ContactResponse(BaseModel):
    status: str
    message: str


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/api/contact", response_model=ContactResponse)
async def contact_form(req: ContactRequest, request: Request):
    # Never report success for a message that went nowhere: the UI falls back
    # to mailto: when this endpoint is unavailable.
    if not smtp.is_configured():
        raise HTTPException(status_code=503, detail="The contact form is not configured.")

    if not contact_limiter.allow(get_client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail="Too many contact submissions. Please wait 10 minutes before sending another message.",
        )

    # Collapse whitespace in single-line fields (also keeps CR/LF out of headers).
    clean_name = " ".join(req.name.split())
    clean_email = req.email.strip()
    clean_message = req.message.strip()

    if not clean_name or not clean_email or not clean_message:
        raise HTTPException(status_code=400, detail="All fields are required.")

    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    # smtplib blocks; keep it off the event loop so chat requests aren't stalled.
    sent = await run_in_threadpool(
        smtp.send_contact_email, clean_name, clean_email, clean_message
    )
    if not sent:
        raise HTTPException(
            status_code=500,
            detail="Unable to send email at this time. Please try again later.",
        )

    return ContactResponse(
        status="success",
        message=f"Thank you, {clean_name}! Your message has been sent successfully.",
    )
