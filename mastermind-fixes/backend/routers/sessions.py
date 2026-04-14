from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from auth import verify_token
from db.helpers import get_db
from db.schema import Session, Card, Curriculum, SRQueue
from db.session_helpers import get_or_create_session, build_review_card
from sr.engine import get_due_cards

router = APIRouter()


@router.get("/today/{curriculum_id}")
def get_today_session(curriculum_id: str, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        session = get_or_create_session(curriculum_id, date.today(), db)
        if not session:
            return {"done": True, "message": "No session scheduled for today."}

        cards = (
            db.query(Card)
            .filter(Card.session_id == session.id)
            .order_by(Card.position)
            .all()
        )

        # Inject due SR review cards at the start
        due_sr = get_due_cards(user_id, db)
        review_cards = [build_review_card(sr, db) for sr in due_sr if build_review_card(sr, db)]

        card_list = review_cards + [
            {
                "id": c.id,
                "card_type": c.card_type,
                "position": c.position,
                "content": c.content_json,
                "completed": c.completed_at is not None,
            }
            for c in cards
        ]

        return {
            "session_id": session.id,
            "week_number": session.week_number,
            "day_number": session.day_number,
            "scheduled_date": session.scheduled_date.isoformat(),
            "status": session.status,
            "cards": card_list,
        }


@router.post("/{session_id}/complete")
def complete_session(session_id: str, claims: dict = Depends(verify_token)):
    with get_db() as db:
        from datetime import datetime
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        session.status = "done"
        session.completed_at = datetime.utcnow()
    return {"ok": True}


@router.get("/{session_id}")
def get_session(session_id: str, claims: dict = Depends(verify_token)):
    with get_db() as db:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        cards = (
            db.query(Card)
            .filter(Card.session_id == session_id)
            .order_by(Card.position)
            .all()
        )
        return {
            "session_id": session.id,
            "week_number": session.week_number,
            "day_number": session.day_number,
            "status": session.status,
            "cards": [
                {"id": c.id, "card_type": c.card_type, "position": c.position,
                 "content": c.content_json}
                for c in cards
            ],
        }
