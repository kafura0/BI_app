"""
Async email service using SMTP.
Falls back to console logging when SMTP is not configured (dev mode).
"""
import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import aiosmtplib
from jinja2 import Environment, FileSystemLoader

from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_template_dir = os.path.join(os.path.dirname(__file__), "../templates/email")
_jinja_env = Environment(loader=FileSystemLoader(_template_dir))


def _render(template_name: str, **kwargs: Any) -> str:
    tmpl = _jinja_env.get_template(f"{template_name}.html")
    return tmpl.render(**kwargs)


async def send_email(to: str, subject: str, html_body: str) -> None:
    if not settings.emails_enabled:
        logger.info("[EMAIL STUB] To: %s | Subject: %s", to, subject)
        logger.debug("[EMAIL BODY]\n%s", html_body)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
    except Exception:
        logger.exception("Failed to send email to %s", to)


async def send_verification_email(to: str, full_name: str, org_name: str, token: str) -> None:
    verify_url = f"{settings.APP_URL}/verify-email?token={token}"
    html = _render("verify_email", full_name=full_name, org_name=org_name, verify_url=verify_url, expire_hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    await send_email(to, "Verify your BI Platform email", html)


async def send_invite_email(to: str, invited_by: str, org_name: str, role: str, token: str) -> None:
    invite_url = f"{settings.APP_URL}/accept-invite?token={token}"
    html = _render("invite_member", invited_by=invited_by, org_name=org_name, role=role, invite_url=invite_url, expire_hours=settings.INVITE_TOKEN_EXPIRE_HOURS)
    await send_email(to, f"You're invited to join {org_name} on BI Platform", html)


async def send_password_reset_email(to: str, full_name: str, token: str) -> None:
    reset_url = f"{settings.APP_URL}/reset-password?token={token}"
    html = _render("reset_password", full_name=full_name, reset_url=reset_url, expire_hours=1)
    await send_email(to, "Reset your BI Platform password", html)


async def send_welcome_email(to: str, full_name: str, org_name: str) -> None:
    html = _render("welcome", full_name=full_name, org_name=org_name, app_url=settings.APP_URL)
    await send_email(to, f"Welcome to BI Platform, {full_name}!", html)
