from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import User

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
            user = User(
                id=body.id,
                email=body.email,
                display_name=body.display_name,
            )
            db.add(user)
        else:
            if body.email:
                user.email = body.email
            if body.display_name:
                user.display_name = body.display_name
    return {"ok": True}


@router.get("/{user_id}")
def get_user(user_id: str, claims: dict = Depends(verify_token)):
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "not found"}, 404
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
            return {"error": "not found"}, 404
        if body.language is not None:
            user.language = body.language
        if body.english_level is not None:
            user.english_level = body.english_level
        if body.timezone is not None:
            user.timezone = body.timezone
        if body.display_name is not None:
            user.display_name = body.display_name
    return {"ok": True}
