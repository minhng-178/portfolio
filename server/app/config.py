import os
import re
from pathlib import Path

# ---------------------------------------------------------------------------
# Ollama
# ---------------------------------------------------------------------------
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000"
).split(",")

# ---------------------------------------------------------------------------
# SMTP / Email
# ---------------------------------------------------------------------------
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
CONTACT_RECEIVER_EMAIL = os.environ.get("CONTACT_RECEIVER_EMAIL", "")

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
# cv_data.json lives at the repo root data/ directory.
# Path resolution: server/app/config.py → server/app/ → server/ → repo root
CV_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "cv_data.json"

# ---------------------------------------------------------------------------
# Chat limits
# ---------------------------------------------------------------------------
MAX_HISTORY_MESSAGES = 20
MAX_MESSAGE_LENGTH = 2000

# How many recent turns to fold into the topic-relevance check, so short
# follow-ups like "tell me more" inherit the relevance of the prior turn.
RELEVANCE_CONTEXT_TURNS = 2

# ---------------------------------------------------------------------------
# Rate limiting — chat endpoint
# ---------------------------------------------------------------------------
RATE_LIMIT_MAX_REQUESTS = 20
RATE_LIMIT_WINDOW_SECONDS = 600  # 10 minutes

# ---------------------------------------------------------------------------
# Rate limiting — contact form
# ---------------------------------------------------------------------------
CONTACT_RATE_LIMIT_MAX = 5
CONTACT_RATE_LIMIT_WINDOW = 600  # 10 minutes

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# ---------------------------------------------------------------------------
# Business constants
# ---------------------------------------------------------------------------
SALARY_STATEMENT = (
    "$1,500-$2,000 USD per month, negotiable depending on role scope, "
    "seniority, and whether the position is remote or based in Ho Chi Minh City."
)
