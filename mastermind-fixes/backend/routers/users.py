from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import User, Curriculum, Session, Card, SRQueue

router = APIRouter()


class SyncBody(BaseModel):
    id: str
    email: str | None = None
    display_name: str | None = None


@router.post("/sync")
def sync_user(body: SyncBody, claims: dict = Depends(verify_token)):
    with get_db() as db:
        user = db.query(User).filter(User.id == body.id).first()
        if not user:
            user = User(id=body.id, email=body.email, display_name=body.display_name)
            db.add(user)
        else:
            if body.email:
                user.email = body.email
            if body.display_name:
                user.display_name = body.display_name
    return {"ok": True}


@router.get("/{user_id}/stats")
def get_user_stats(user_id: str, claims: dict = Depends(verify_token)):
    with get_db() as db:
        curricula = (
            db.query(Curriculum)
            .filter(Curriculum.user_id == user_id, Curriculum.status.in_(["active", "completed"]))
            .all()
        )

        total_cards = 0
        completed_cards = 0
        active_topics = 0

        for c in curricula:
            if c.status == "active":
                active_topics += 1
            for s in c.sessions:
                cards = db.query(Card).filter(Card.session_id == s.id).all()
                total_cards += len(cards)
                completed_cards += sum(1 for card in cards if card.completed_at is not None)

        # Streak — consecutive days with ≥1 completed session
        today = datetime.utcnow().date()
        streak = 0
        for i in range(90):
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

        # Due reviews
        due_reviews = (
            db.query(SRQueue)
            .filter(SRQueue.user_id == user_id, SRQueue.due_date <= today)
            .count()
        )

    return {
        "total_cards": total_cards,
        "completed_cards": completed_cards,
        "streak_days": streak,
        "due_reviews": due_reviews,
        "active_topics": active_topics,
    }


@router.get("/{user_id}")
def get_user(user_id: str, claims: dict = Depends(verify_token)):
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "not found"}
        return {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "language": user.language,
            "english_level": user.english_level,
            "timezone": user.timezone,
        }


class UpdateBody(BaseModel):
    language: str | None = None
    english_level: str | None = None
    timezone: str | None = None
    display_name: str | None = None


@router.patch("/{user_id}")
def update_user(user_id: str, body: UpdateBody, claims: dict = Depends(verify_token)):
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "not found"}
        if body.language is not None:
            user.language = body.language
        if body.english_level is not None:
            user.english_level = body.english_level
        if body.timezone is not None:
            user.timezone = body.timezone
        if body.display_name is not None:
            user.display_name = body.display_name
    return {"ok": True}
