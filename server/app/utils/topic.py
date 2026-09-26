"""
Topic detection utilities.

Determines whether a user message is related to the CV/portfolio topic,
so off-topic questions can be rejected before calling the LLM.
"""

import re
import unicodedata
from typing import List, Pattern

# ---------------------------------------------------------------------------
# Static keyword allow-list (English + Vietnamese)
# Combined at startup with dynamic keywords extracted from cv_data.json.
# Matched as whole words (plural "s"/"es" allowed), accent-insensitive.
# ---------------------------------------------------------------------------
STATIC_KEYWORDS: List[str] = [
    # English - CV subjects
    "experience", "work", "worked", "job", "career", "skill", "project",
    "education", "degree", "school", "university", "salary", "compensation",
    "pay", "rate", "expect", "expected", "contact", "email", "phone",
    "linkedin", "github", "location", "available", "availability", "hire",
    "hiring", "opportunity", "opportunities", "cv", "resume", "background",
    "developer", "engineer", "role", "position", "company", "companies",
    "tech stack", "technology", "technologies", "gpa", "recruiter",
    "interview", "notice period", "remote", "relocate", "relocation",
    "portfolio", "freelance", "full-time", "part-time", "start",
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

_VIETNAMESE_CHARS_PATTERN = re.compile(
    "[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡ"
    "ùúụủũưừứựửữỳýỵỷỹđ]",
    re.IGNORECASE,
)


def _normalize(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def build_topic_matcher(cv_data: dict) -> Pattern[str]:
    """
    Compile the keyword allow-list — static keywords plus terms extracted from
    cv_data (companies, roles, tech stack, schools) — into one whole-word
    regex. Call once at startup.
    """
    keywords: set = set(STATIC_KEYWORDS)

    for job in cv_data.get("work_experience", []):
        keywords.add(job["company"])
        keywords.add(job["role"])
        keywords.update(job.get("tech", []))

    for project in cv_data.get("projects", []):
        keywords.add(project["name"])
        # "BonVoye — Location-Based ..." is usually asked about as "BonVoye"
        keywords.add(re.split(r"\s+[—–-]\s+", project["name"])[0])
        keywords.update(project.get("tech", []))

    for category in cv_data.get("skills", []):
        keywords.update(item.strip() for item in category["items"].split(","))

    for edu in cv_data.get("education", []):
        keywords.add(edu["school"])
        keywords.add(edu["degree"])

    needles = sorted(
        {_normalize(k).strip() for k in keywords if len(k.strip()) >= 2},
        key=len,
        reverse=True,
    )
    alternation = "|".join(re.escape(n) for n in needles if n)
    return re.compile(rf"(?<!\w)(?:{alternation})(?:e?s)?(?!\w)")


def contains_vietnamese(text: str) -> bool:
    return bool(_VIETNAMESE_CHARS_PATTERN.search(text))


def is_on_topic(text: str, matcher: Pattern[str]) -> bool:
    return bool(matcher.search(_normalize(text)))
