"""
Push notification router — VAPID web push via pywebpush.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import PushSubscription
from config import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_CLAIMS_EMAIL

router = APIRouter()


class SubscribeBody(BaseModel):
    endpoint: str
    keys: dict  # {p256dh: str, auth: str}


class SendBody(BaseModel):
    user_id: str
    title: str
    body: str


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


@router.post("/send")
def send_push(body: SendBody, claims: dict = Depends(verify_token)):
    if not VAPID_PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="Push not configured")

    from pywebpush import webpush, WebPushException

    with get_db() as db:
        subs = db.query(PushSubscription).filter(
            PushSubscription.user_id == body.user_id
        ).all()

    sent = 0
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": sub.keys_json,
                },
                data=json.dumps({"title": body.title, "body": body.body}),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"},
            )
            sent += 1
        except WebPushException:
            pass

    return {"sent": sent}


@router.get("/vapid-public-key")
def get_vapid_key():
    return {"public_key": VAPID_PUBLIC_KEY}
