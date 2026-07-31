"""
Topic detection utilities.

Determines whether a user message is related to the CV/portfolio topic,
so off-topic questions can be rejected before calling the LLM.
"""

import re
import unicodedata
from typing import List


# ---------------------------------------------------------------------------
# Off-topic replies (English + Vietnamese)
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Static keyword allow-list (English + Vietnamese)
# Combined at startup with dynamic keywords extracted from cv_data.json.
# ---------------------------------------------------------------------------
STATIC_KEYWORDS: List[str] = [
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

_VIETNAMESE_CHARS_PATTERN = re.compile(
    "[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡ"
    "ùúụủũưừứựửữỳýỵỷỹđ]",
    re.IGNORECASE,
)


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def build_topic_keywords(cv_data: dict) -> List[str]:
    """
    Build the full keyword allow-list by merging static keywords with
    dynamic terms extracted from cv_data (company names, tech stack, schools).
    Call once at startup.
    """
    keywords: set = set(STATIC_KEYWORDS)

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
    return bool(_VIETNAMESE_CHARS_PATTERN.search(text))


def is_on_topic(text: str, keywords: List[str]) -> bool:
    haystack = _strip_accents(text.lower())
    for keyword in keywords:
        needle = _strip_accents(keyword.lower())
        if needle and needle in haystack:
            return True
    return False
