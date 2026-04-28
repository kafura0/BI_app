"""
Async email service using SMTP.
Falls back to console logging when SMTP is not configured (dev mode).
"""
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import aiosmtplib
from jinja2 import Environment, BaseLoader

from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Inline templates — in production move to a templates/ directory
_TEMPLATES: dict[str, str] = {
    "verify_email": """
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px;">
    <h2 style="color: #6366f1; margin-top: 0;">Verify your email</h2>
    <p>Hi {{ full_name }},</p>
    <p>Click the button below to verify your email address for <strong>{{ org_name }}</strong>.</p>
    <a href="{{ verify_url }}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
      Verify Email
    </a>
    <p style="color: #64748b; font-size: 13px;">This link expires in {{ expire_hours }} hours. If you didn't sign up, ignore this email.</p>
  </div>
</body>
</html>
""",
    "invite_member": """
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px;">
    <h2 style="color: #6366f1; margin-top: 0;">You've been invited</h2>
    <p><strong>{{ invited_by }}</strong> has invited you to join <strong>{{ org_name }}</strong> on BI Platform as <strong>{{ role }}</strong>.</p>
    <a href="{{ invite_url }}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
      Accept Invitation
    </a>
    <p style="color: #64748b; font-size: 13px;">This invitation expires in {{ expire_hours }} hours.</p>
  </div>
</body>
</html>
""",
    "welcome": """
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px;">
    <h2 style="color: #6366f1; margin-top: 0;">Welcome to BI Platform!</h2>
    <p>Hi {{ full_name }},</p>
    <p>Your workspace <strong>{{ org_name }}</strong> is ready. Start by uploading a dataset and generating your first AI-powered dashboard.</p>
    <a href="{{ app_url }}/datasets" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
      Get Started
    </a>
  </div>
</body>
</html>
""",
}

_jinja_env = Environment(loader=BaseLoader())


def _render(template_name: str, **kwargs: Any) -> str:
    tmpl = _jinja_env.from_string(_TEMPLATES[template_name])
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


async def send_welcome_email(to: str, full_name: str, org_name: str) -> None:
    html = _render("welcome", full_name=full_name, org_name=org_name, app_url=settings.APP_URL)
    await send_email(to, f"Welcome to BI Platform, {full_name}!", html)
