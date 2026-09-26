"""
SMTP email service.

Responsible for composing and dispatching contact-form notification emails.
To swap the mail provider (e.g. an HTTP email API, which suits serverless
runtimes better than SMTP) or add retry logic, only this file needs to change.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

from app.config import (
    CONTACT_RECEIVER_EMAIL,
    MAIL_DRY_RUN,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_SERVER,
    SMTP_USER,
)


def is_configured() -> bool:
    return MAIL_DRY_RUN or bool(SMTP_USER and SMTP_PASSWORD)


def build_contact_email(name: str, email: str, message_text: str) -> MIMEMultipart:
    """Compose the notification email. All visitor input is HTML-escaped."""
    receiver = CONTACT_RECEIVER_EMAIL or SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Portfolio Contact] Message from {name}"
    msg["From"] = SMTP_USER
    msg["To"] = receiver
    msg["Reply-To"] = email

    text_body = (
        f"New contact form submission on your portfolio:\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n\n"
        f"Message:\n{message_text}\n"
    )

    safe_name, safe_email, safe_message = (
        escape(name),
        escape(email),
        escape(message_text),
    )
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0284c7; margin-top: 0; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">New Contact Form Message</h2>
          <p style="margin: 8px 0;"><strong>Sender Name:</strong> {safe_name}</p>
          <p style="margin: 8px 0;"><strong>Sender Email:</strong> {safe_email}</p>
          <div style="margin-top: 16px; padding: 16px; background-color: #f1f5f9; border-left: 4px solid #0284c7; border-radius: 4px;">
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">{safe_message}</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This message was sent from your portfolio contact form. Reply to this email to answer the sender.</p>
        </div>
      </body>
    </html>
    """

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def send_contact_email(name: str, email: str, message_text: str) -> bool:
    """
    Send a contact-form notification email (blocking — call from a thread).
    Returns True on success, False if sending fails.
    """
    msg = build_contact_email(name, email, message_text)

    if MAIL_DRY_RUN:
        logging.warning("MAIL_DRY_RUN is set — not sending:\n%s", msg.as_string())
        return True

    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        return True
    except Exception as e:
        logging.error(f"Failed to send contact email: {e}")
        return False
