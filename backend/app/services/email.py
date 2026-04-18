import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

from backend.app.config import settings

logger = logging.getLogger(__name__)


def _send_sync(message: EmailMessage) -> None:
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASSWORD

    context = ssl.create_default_context()
    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as smtp:
            if user and password:
                smtp.login(user, password)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.ehlo()
            try:
                smtp.starttls(context=context)
                smtp.ehlo()
            except smtplib.SMTPNotSupportedError:
                pass
            if user and password:
                smtp.login(user, password)
            smtp.send_message(message)


async def send_email(
    to: str, subject: str, html: str, text: Optional[str] = None
) -> bool:
    if not settings.SMTP_HOST:
        logger.warning(
            "[email] SMTP_HOST not set; email NOT sent.\n"
            "  To: %s\n  Subject: %s\n  Text:\n%s",
            to,
            subject,
            text or html,
        )
        return False

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text or "Please view this email in an HTML-capable client.")
    message.add_alternative(html, subtype="html")

    try:
        await asyncio.to_thread(_send_sync, message)
    except (smtplib.SMTPException, OSError) as exc:
        logger.error("[email] SMTP send failed: %s", exc)
        return False
    return True


def build_password_reset_email(reset_url: str) -> tuple[str, str, str]:
    subject = "Đặt lại mật khẩu SmartLearn"
    html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
  <h2 style="margin:0 0 16px;color:#0f172a;">Đặt lại mật khẩu SmartLearn</h2>
  <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
  <p>Nhấn nút bên dưới để chọn mật khẩu mới. Liên kết có hiệu lực trong {settings.RESET_TOKEN_TTL_MINUTES} phút.</p>
  <p style="margin:24px 0;">
    <a href="{reset_url}"
       style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
      Đặt lại mật khẩu
    </a>
  </p>
  <p style="color:#64748b;font-size:12px;">Nếu nút không hoạt động, sao chép đường dẫn sau vào trình duyệt:<br>{reset_url}</p>
  <p style="color:#64748b;font-size:12px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
</div>
"""
    text = (
        "Đặt lại mật khẩu SmartLearn\n\n"
        f"Mở liên kết sau để đặt lại mật khẩu (hết hạn sau {settings.RESET_TOKEN_TTL_MINUTES} phút):\n"
        f"{reset_url}\n\n"
        "Nếu bạn không yêu cầu, hãy bỏ qua email này."
    )
    return subject, html, text


async def send_password_reset_email(to: str, reset_url: str) -> bool:
    subject, html, text = build_password_reset_email(reset_url)
    return await send_email(to=to, subject=subject, html=html, text=text)
