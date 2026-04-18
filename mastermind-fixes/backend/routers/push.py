"""
Push notification router — VAPID web push via pywebpush.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import PushSubscription, User
from config import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_CLAIMS_EMAIL

router = APIRouter()


class SubscribeBody(BaseModel):
    endpoint: str
    keys: dict


class SendBody(BaseModel):
    user_id: str
    title: str
    body: str


class ScheduleBody(BaseModel):
    enabled: bool
    hour: int   # 0–23 UTC hour for daily reminder


def _webpush_to(endpoint: str, keys: dict, title: str, body_text: str):
    from pywebpush import webpush, WebPushException
    try:
        webpush(
            subscription_info={"endpoint": endpoint, "keys": keys},
            data=json.dumps({"title": title, "body": body_text}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"},
        )
    except WebPushException:
        pass


@router.post("/subscribe")
def subscribe(body: SubscribeBody, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        existing = db.query(PushSubscription).filter(
            PushSubscription.endpoint == body.endpoint
        ).first()
        if not existing:
            db.add(PushSubscription(
                user_id=user_id,
                endpoint=body.endpoint,
                keys_json=body.keys,
            ))
    return {"ok": True}


@router.post("/schedule")
def set_push_schedule(body: ScheduleBody, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    if body.enabled and not 0 <= body.hour <= 23:
        raise HTTPException(status_code=400, detail="hour must be 0–23")
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.push_enabled = body.enabled
        user.push_hour = body.hour if body.enabled else None
    return {"ok": True}


@router.get("/schedule")
def get_push_schedule(claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "enabled": getattr(user, "push_enabled", False),
            "hour": getattr(user, "push_hour", None),
        }


@router.post("/send")
def send_push(body: SendBody, claims: dict = Depends(verify_token)):
    if claims["sub"] != body.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not VAPID_PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="Push not configured")

    with get_db() as db:
        subs = db.query(PushSubscription).filter(
            PushSubscription.user_id == body.user_id
        ).all()
        sub_data = [(s.endpoint, s.keys_json) for s in subs]

    sent = 0
    for endpoint, keys in sub_data:
        try:
            _webpush_to(endpoint, keys, body.title, body.body)
            sent += 1
        except Exception:
            pass

    return {"sent": sent}


@router.get("/vapid-public-key")
def get_vapid_key():
    return {"public_key": VAPID_PUBLIC_KEY}


def send_push_to_user(user_id: str, title: str, body_text: str):
    """Internal helper called by the APScheduler job."""
    if not VAPID_PRIVATE_KEY:
        return

    with get_db() as db:
        subs = db.query(PushSubscription).filter(
            PushSubscription.user_id == user_id
        ).all()
        sub_data = [(s.endpoint, s.keys_json) for s in subs]

    for endpoint, keys in sub_data:
        _webpush_to(endpoint, keys, title, body_text)
