"""
Onboarding router — 3-question dialogue with Opus before curriculum is built.
Server-side state keyed by user_id so progress survives page refresh.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from auth import verify_token
from chatbot.router import stream_opus

router = APIRouter()

# In-memory state. Replace with Redis/DB for multi-instance deployments.
_STATE: dict[str, dict] = {}

QUESTIONS = [
    "Why does this topic matter to your work or life right now?",
    "What have you tried before to learn this, and why didn't it stick?",
    "What should you be able to DO when this course is finished?",
]


class StartBody(BaseModel):
    topic: str
    duration_weeks: int
    weekday_minutes: int
    weekend_minutes: int


class AnswerBody(BaseModel):
    answer: str


@router.post("/start")
def start_onboarding(body: StartBody, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    _STATE[user_id] = {
        "topic": body.topic,
        "duration_weeks": body.duration_weeks,
        "weekday_minutes": body.weekday_minutes,
        "weekend_minutes": body.weekend_minutes,
        "answers": [],
        "step": 0,
    }
    return {"question": QUESTIONS[0], "step": 0, "total": len(QUESTIONS)}


@router.post("/answer")
def answer_question(body: AnswerBody, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    state = _STATE.get(user_id)
    if not state:
        raise HTTPException(status_code=400, detail="No active onboarding session. Call /onboarding/start first.")

    state["answers"].append(body.answer)
    state["step"] += 1

    if state["step"] < len(QUESTIONS):
        return {
            "question": QUESTIONS[state["step"]],
            "step": state["step"],
            "total": len(QUESTIONS),
        }

    # All questions answered — signal frontend to call /curriculum/build
    return {"done": True, "step": state["step"], "total": len(QUESTIONS)}


@router.get("/state")
def get_state(claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    state = _STATE.get(user_id)
    if not state:
        raise HTTPException(status_code=404, detail="No active onboarding session.")
    return state
