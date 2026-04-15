"""
Post-meeting email service.
Sends a summary email to all active org members after a session ends.
Uses Resend's REST API via httpx — no extra dependency needed.
"""
import logging
import asyncio
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _build_html(title: str, summary: str, app_url: str) -> str:
    safe_title = title.replace("<", "&lt;").replace(">", "&gt;")
    safe_summary = summary.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0;font-size:20px">Meeting Summary</h1>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <h2 style="color:#111827;font-size:18px;margin:0 0 12px">{safe_title}</h2>
    <p style="color:#374151;line-height:1.6;margin:0 0 20px">{safe_summary}</p>
    <a href="{app_url}/dashboard"
       style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;
              border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
      View Tasks on Platform
    </a>
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
      You received this because you are a member of the organization that held this meeting.
    </p>
  </div>
</body>
</html>"""


async def send_meeting_summary(
    supabase,
    org_id: str,
    session_title: str,
    session_summary: str,
) -> None:
    """
    Send a meeting summary email to all active org members.
    Failures are logged but never raise — this must not block the API response.
    """
    settings = get_settings()

    if not getattr(settings, "resend_api_key", None):
        logger.info("RESEND_API_KEY not configured — skipping post-meeting email")
        return

    app_url = settings.app_url.rstrip("/")
    email_from = settings.email_from

    # Collect active member emails (non-pending invites)
    try:
        result = (
            supabase.table("org_memberships")
            .select("profile:profiles(email)")
            .eq("org_id", org_id)
            .not_.is_("user_id", "null")
            .execute()
        )
        emails = [
            m["profile"]["email"]
            for m in (result.data or [])
            if m.get("profile") and m["profile"].get("email")
        ]
    except Exception:
        logger.exception("Failed to fetch org member emails for post-meeting email")
        return

    if not emails:
        return

    html_body = _build_html(session_title, session_summary, app_url)
    subject = f"Meeting Summary: {session_title}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = [
            _send_one(client, settings.resend_api_key, email_from, email, subject, html_body)
            for email in emails
        ]
        await asyncio.gather(*tasks, return_exceptions=True)


async def _send_one(
    client: httpx.AsyncClient,
    api_key: str,
    from_addr: str,
    to_addr: str,
    subject: str,
    html: str,
) -> None:
    try:
        resp = await client.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": from_addr, "to": [to_addr], "subject": subject, "html": html},
        )
        if resp.status_code >= 400:
            logger.warning("Resend returned %s for %s: %s", resp.status_code, to_addr, resp.text)
    except Exception:
        logger.exception("Failed to send email to %s", to_addr)
