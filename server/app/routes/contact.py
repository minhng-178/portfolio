"""POST /api/contact — Contact form submission endpoint."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import EMAIL_REGEX
from app.services.smtp import send_contact_email
from app.utils.rate_limit import check_contact_rate_limit, get_client_ip

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
    if not check_contact_rate_limit(get_client_ip(request)):
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

    if not send_contact_email(clean_name, clean_email, clean_message):
        raise HTTPException(
            status_code=500,
            detail="Unable to send email at this time. Please try again later.",
        )

    return ContactResponse(
        status="success",
        message=f"Thank you, {clean_name}! Your message has been sent successfully.",
    )
