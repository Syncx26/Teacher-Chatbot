from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import Card
from sr.engine import record_review

router = APIRouter()


class SwipeBody(BaseModel):
    grade: int  # 0-5 SM-2 grade


@router.get("/{card_id}")
def get_card(card_id: str, claims: dict = Depends(verify_token)):
    with get_db() as db:
        card = db.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        return {
            "id": card.id,
            "card_type": card.card_type,
            "position": card.position,
            "content": card.content_json,
            "completed": card.completed_at is not None,
        }


@router.post("/{card_id}/swipe")
def swipe_card(card_id: str, body: SwipeBody, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    if body.grade < 0 or body.grade > 5:
        raise HTTPException(status_code=400, detail="Grade must be 0-5")

    with get_db() as db:
        card = db.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")

        card.completed_at = datetime.utcnow()

        # Record in SR queue for concept and exercise cards
        if card.card_type in ("concept", "exercise"):
            sr_result = record_review(card_id, user_id, body.grade, db)
            return {"ok": True, "sr": sr_result}

    return {"ok": True}
