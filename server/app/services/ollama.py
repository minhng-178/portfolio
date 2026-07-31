"""
Ollama LLM service.

Handles system-prompt construction from cv_data and the HTTP call to Ollama.
To swap the LLM backend (e.g. OpenAI, local Mistral), only this file changes.
"""

import httpx
from fastapi import HTTPException

from app.config import MODEL_NAME, OLLAMA_URL, SALARY_STATEMENT
from app.utils.topic import OFF_TOPIC_REPLY_EN, OFF_TOPIC_REPLY_VI


def build_system_prompt(cv_data: dict) -> str:
    """
    Build the LLM system prompt from cv_data at startup.
    The prompt instructs the model to speak on behalf of the candidate
    and only answer questions within the CV's scope.
    """
    info = cv_data["personal_info"]

    lines = [
        f"You are the virtual assistant for {info['name']}'s portfolio website. "
        f"Speak in first person as if you are representing {info['name']} "
        f"({info['title']}) to recruiters and hiring managers.",
        "",
        f"Summary: {cv_data['summary']}",
        "",
        "Work experience:",
    ]

    for job in cv_data["work_experience"]:
        lines.append(f"- {job['role']} at {job['company']} ({job['dates']})")
        for bullet in job["bullets"]:
            lines.append(f"  - {bullet}")

    lines.append("")
    lines.append("Projects:")
    for project in cv_data.get("projects", []):
        lines.append(
            f"- {project['name']} ({project['dates']}): {project['description']}"
        )

    lines.append("")
    lines.append("Skills:")
    for category in cv_data.get("skills", []):
        lines.append(f"- {category['category']}: {category['items']}")

    lines.append("")
    lines.append("Education:")
    for edu in cv_data.get("education", []):
        lines.append(
            f"- {edu['degree']}, {edu['school']} ({edu['dates']}), GPA {edu['gpa']}"
        )

    lines += [
        "",
        f"Contact info: email {info['email']}, phone {info['phone']}, "
        f"LinkedIn {info['linkedin_url']}, GitHub {info['github_url']}, "
        f"location {info['location']}.",
        "",
        "Instructions:",
        "- Only state facts drawn from the information above. Never invent experience, "
        "employers, dates, or skills that are not listed.",
        f"- If asked about expected salary, compensation, or rate, state exactly: "
        f"{SALARY_STATEMENT}",
        "- Keep answers concise (a few sentences) and professional, suitable for a "
        "recruiter or hiring manager reading on a website widget.",
        "- Detect the language of the user's message (English or Vietnamese) and "
        "always reply in that same language.",
        "- If asked something unrelated to this CV or outside what's listed above, "
        f'refuse and reply with exactly: "{OFF_TOPIC_REPLY_EN}" (or the Vietnamese '
        f'equivalent "{OFF_TOPIC_REPLY_VI}" if the user wrote in Vietnamese). Do not '
        "guess or answer questions outside this CV's scope.",
    ]

    return "\n".join(lines)


async def call_ollama(system_prompt: str, messages: list) -> str:
    """
    Send a chat request to Ollama and return the assistant's reply text.
    Raises HTTPException on network or model errors.
    """
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="The chat assistant is currently unavailable. Please try again shortly.",
        )

    reply = response.json().get("message", {}).get("content", "").strip()
    if not reply:
        raise HTTPException(status_code=502, detail="Empty response from model")

    return reply
