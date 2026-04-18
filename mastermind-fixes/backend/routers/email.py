"""
Weekly email digest — sends a summary of the past week via Resend.
Call POST /email/digest/{user_id} manually or from the APScheduler job.
"""
import html as _html
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import User, Curriculum, Session, Card
from config import RESEND_API_KEY, FRONTEND_URL

router = APIRouter()


def _build_html(user: User, stats: dict) -> str:
    name = _html.escape(user.display_name or user.email or "there")
    topic_list = "".join(
        f'<li style="margin:4px 0;color:#C9C0AE;">{t}</li>'
        for t in stats["topics"]
    )
    concept_list = "".join(
        f'<li style="margin:4px 0;color:#C9C0AE;">{c}</li>'
        for c in stats["top_concepts"][:5]
    )
    next_preview = (
        f'<p style="color:#D99670;font-style:italic;">Next: {stats["next_theme"]}</p>'
        if stats.get("next_theme") else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Mastermind — Weekly Digest</title></head>
<body style="margin:0;padding:0;background:#0B1116;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1116;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#131B23;border-radius:16px;border:1px solid #2A3742;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2A3742;">
            <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:2px;
                      text-transform:uppercase;color:#D99670;">Weekly Digest</p>
            <h1 style="margin:8px 0 0;font-size:28px;color:#F3EFE6;font-weight:700;">
              Good work this week, {name}
            </h1>
          </td>
        </tr>
        <!-- Stats -->
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding-right:8px;">
                  <div style="background:#1A242E;border-radius:12px;padding:20px;
                              text-align:center;border:1px solid #2A3742;">
                    <p style="margin:0;font-size:32px;font-weight:700;color:#F3EFE6;">
                      {stats["cards_done"]}
                    </p>
                    <p style="margin:4px 0 0;font-size:10px;letter-spacing:1px;
                              text-transform:uppercase;color:#7D8A97;">Cards mastered</p>
                  </div>
                </td>
                <td width="50%" style="padding-left:8px;">
                  <div style="background:#1A242E;border-radius:12px;padding:20px;
                              text-align:center;border:1px solid #2A3742;">
                    <p style="margin:0;font-size:32px;font-weight:700;color:#F3EFE6;">
                      {stats["streak"]}🔥
                    </p>
                    <p style="margin:4px 0 0;font-size:10px;letter-spacing:1px;
                              text-transform:uppercase;color:#7D8A97;">Day streak</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Topics -->
        {"<tr><td style='padding:0 40px 24px;'><p style='margin:0 0 8px;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7D8A97;'>Topics studied</p><ul style='margin:0;padding-left:20px;'>" + topic_list + "</ul></td></tr>" if topic_list else ""}
        <!-- Key concepts -->
        {"<tr><td style='padding:0 40px 24px;'><p style='margin:0 0 8px;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7D8A97;'>Concepts you learned</p><ul style='margin:0;padding-left:20px;'>" + concept_list + "</ul></td></tr>" if concept_list else ""}
        <!-- Next session teaser -->
        {f"<tr><td style='padding:0 40px 24px;border-left:3px solid #D99670;margin-left:40px;'>{next_preview}</td></tr>" if next_preview else ""}
        <!-- CTA -->
        <tr>
          <td style="padding:24px 40px 32px;">
            <a href="{FRONTEND_URL}/today"
               style="display:block;background:#8AA9D1;color:#0B1116;text-align:center;
                      padding:14px 24px;border-radius:100px;font-weight:700;
                      font-size:15px;text-decoration:none;font-family:Inter,sans-serif;">
              Continue Learning →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px 24px;border-top:1px solid #2A3742;">
            <p style="margin:0;font-size:11px;color:#7D8A97;text-align:center;">
              Mastermind · You can disable these emails in Settings
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _collect_stats(user_id: str) -> dict:
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}

        curricula = (
            db.query(Curriculum)
            .filter(Curriculum.user_id == user_id, Curriculum.status == "active")
            .all()
        )
        topics = [c.topic for c in curricula]

        # Sessions completed this week
        sessions_done = []
        for c in curricula:
            for s in c.sessions:
                if s.completed_at and s.completed_at >= one_week_ago:
                    sessions_done.append(s)

        cards_done = sum(
            db.query(Card).filter(
                Card.session_id == s.id,
                Card.completed_at.isnot(None),
            ).count()
            for s in sessions_done
        )

        # Top concept titles from this week
        concepts = []
        for s in sessions_done[:10]:
            for card in s.cards:
                if card.card_type == "concept":
                    title = card.content_json.get("title", "")
                    if title:
                        concepts.append(title)

        # Streak — count consecutive days with completed sessions going back from today
        today = datetime.utcnow().date()
        streak = 0
        for i in range(60):
            d = today - timedelta(days=i)
            found = any(
                s.scheduled_date == d and s.status == "done"
                for c in curricula
                for s in c.sessions
            )
            if found:
                streak += 1
            elif i > 0:
                break

        # Next upcoming session theme
        next_theme = None
        for c in curricula:
            for s in sorted(c.sessions, key=lambda x: x.day_number):
                if s.status == "pending" and s.scheduled_date is None:
                    week_data = c.opus_json.get("weeks", [])
                    for w in week_data:
                        if w.get("week_number") == s.week_number:
                            next_theme = w.get("theme")
                            break
                    if next_theme:
                        break
            if next_theme:
                break

    return {
        "user": user,
        "topics": topics,
        "cards_done": cards_done,
        "streak": streak,
        "top_concepts": concepts,
        "next_theme": next_theme,
    }


def send_digest_for_user(user_id: str):
    """Called by scheduler or manual trigger. Synchronous — safe to call from threads."""
    if not RESEND_API_KEY:
        return

    stats = _collect_stats(user_id)
    if not stats or not stats.get("user"):
        return

    user = stats["user"]
    if not user.email:
        return

    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": "Mastermind <digest@updates.mastermind.app>",
            "to": [user.email],
            "subject": f"Your week in review — {stats['cards_done']} cards mastered 🔥",
            "html": _build_html(user, stats),
        })
    except Exception as e:
        print(f"Digest send error for {user_id}: {e}")


class DigestBody(BaseModel):
    enabled: bool
    day: int = 0    # 0=Mon, 6=Sun
    hour: int = 8   # UTC hour


@router.post("/digest/preferences")
def set_digest_preferences(body: DigestBody, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.digest_enabled = body.enabled
        user.digest_day = body.day
        user.digest_hour = body.hour
    return {"ok": True}


@router.get("/digest/preferences")
def get_digest_preferences(claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "enabled": getattr(user, "digest_enabled", False),
            "day": getattr(user, "digest_day", 0),
            "hour": getattr(user, "digest_hour", 8),
        }


@router.post("/digest/send-now/{user_id}")
def send_now(user_id: str, claims: dict = Depends(verify_token)):
    """Manual trigger for testing."""
    if claims["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    send_digest_for_user(user_id)
    return {"ok": True}
