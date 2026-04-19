"""
Curriculum router — Opus builds the curriculum, we stream it back and save to DB.
"""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import Curriculum, User
from db.session_helpers import parse_and_save_curriculum
from chatbot.router import TASK_ROUTES, _get_anthropic
from routers.onboarding import _STATE as ONBOARDING_STATE

router = APIRouter()

CURRICULUM_SYSTEM = """You are a master curriculum designer using adult learning principles:
- Andragogy (Knowles): adults are self-directed, problem-oriented, need to know WHY
- SM-2 spaced repetition: schedule review at increasing intervals
- Deliberate practice (Ericsson): exercises slightly harder than current ability
- Cognitive load theory (Sweller): ONE concept per card, never two ideas
- Flow state (Csikszentmihalyi): challenge must match skill level
- Zeigarnik effect: end each session mid-thought so learner returns tomorrow
- Testing effect: never allow passive reading — every concept needs an exercise

Design rules:
- Every concept card is immediately followed by an exercise card
- Every week ends with a checkpoint card
- Weekend sessions use review + explore cards only (shorter)
- End daily sessions on a cliffhanger (hint at tomorrow's concept)
- Include one explore card per week (variable reward, not a lesson)
- Exercise difficulty increases 5-10% each week (deliberate practice)

Return ONLY valid JSON. No markdown fences, no explanation, just the JSON object."""


def build_prompt(state: dict) -> str:
    context_block = ""
    if state.get("context"):
        context_block = f"\n\nSource material (use to ground the curriculum with real examples and accurate details):\n---\n{state['context'][:6000]}\n---"

    return f"""Build a {state['duration_weeks']}-week mastery curriculum for: {state['topic']}

User context:
- Why it matters to them: {state['answers'][0] if state['answers'] else 'not provided'}
- What failed before: {state['answers'][1] if len(state['answers']) > 1 else 'not provided'}
- Desired outcome: {state['answers'][2] if len(state['answers']) > 2 else 'not provided'}
- Weekday session: {state['weekday_minutes']} minutes
- Weekend session: {state['weekend_minutes']} minutes (0 = no weekend sessions){context_block}

Return JSON exactly matching this schema:
{{
  "topic": string,
  "total_weeks": number,
  "mastery_goal": string,
  "weeks": [
    {{
      "week_number": number,
      "theme": string,
      "days": [
        {{
          "day_number": number,
          "is_weekend": boolean,
          "cards": [
            {{"type": "concept", "title": string, "body": string, "analogy": string, "key_term": string, "key_term_definition": string}},
            {{"type": "exercise", "prompt": string, "hints": [string], "answer": string, "explanation": string}},
            {{"type": "checkpoint", "question": string, "rubric": string, "passing_threshold": 3, "gap_if_fail": string}}
          ]
        }}
      ]
    }}
  ]
}}"""


class BuildBody(BaseModel):
    user_id: str


@router.post("/build")
def build_curriculum(body: BuildBody, claims: dict = Depends(verify_token)):
    state = ONBOARDING_STATE.get(body.user_id)
    if not state:
        raise HTTPException(status_code=400, detail="Complete onboarding first.")

    curriculum_id = str(uuid.uuid4())

    def generate():
        client = _get_anthropic()
        full_text = ""
        with client.messages.stream(
            model=TASK_ROUTES["curriculum_build"]["model"],
            max_tokens=24000,
            system=CURRICULUM_SYSTEM,
            messages=[{"role": "user", "content": build_prompt(state)}],
        ) as stream:
            for text in stream.text_stream:
                full_text += text
                yield f"data: {text}\n\n"

        # Parse and save after stream completes
        try:
            opus_json = json.loads(full_text)
        except json.JSONDecodeError:
            yield "data: [ERROR:invalid_json]\n\n"
            return

        if not isinstance(opus_json, dict) or not opus_json.get("weeks"):
            yield "data: [ERROR:invalid_schema]\n\n"
            return

        try:
            with get_db() as db:
                curriculum = Curriculum(
                    id=curriculum_id,
                    user_id=body.user_id,
                    topic=state["topic"],
                    duration_weeks=state["duration_weeks"],
                    weekday_minutes=state["weekday_minutes"],
                    weekend_minutes=state["weekend_minutes"],
                    opus_json=opus_json,
                    status="active",
                )
                db.add(curriculum)
                db.flush()
                parse_and_save_curriculum(curriculum_id, opus_json, db)
            yield f"data: [DONE:{curriculum_id}]\n\n"
        except Exception as e:
            print(f"Curriculum save failed: {e}")
            yield "data: [ERROR:save_failed]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/{curriculum_id}")
def get_curriculum(curriculum_id: str, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        c = db.query(Curriculum).filter(
            Curriculum.id == curriculum_id,
            Curriculum.user_id == user_id,
        ).first()
        if not c:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        return {
            "id": c.id,
            "topic": c.topic,
            "duration_weeks": c.duration_weeks,
            "weekday_minutes": c.weekday_minutes,
            "weekend_minutes": c.weekend_minutes,
            "status": c.status,
            "mastery_goal": c.opus_json.get("mastery_goal", ""),
            "total_weeks": c.opus_json.get("total_weeks", c.duration_weeks),
        }


@router.get("/user/{user_id}")
def get_user_curricula(user_id: str, claims: dict = Depends(verify_token)):
    if claims["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    with get_db() as db:
        curricula = (
            db.query(Curriculum)
            .filter(Curriculum.user_id == user_id, Curriculum.status.in_(["active", "completed"]))
            .order_by(Curriculum.created_at.desc())
            .all()
        )
        result = []
        for c in curricula:
            sessions_done = sum(1 for s in c.sessions if s.status == "done")
            sessions_total = len(c.sessions)
            result.append({
                "id": c.id,
                "topic": c.topic,
                "emoji": c.emoji,
                "status": c.status,
                "duration_weeks": c.duration_weeks,
                "weekday_minutes": c.weekday_minutes,
                "mastery_goal": c.opus_json.get("mastery_goal", ""),
                "sessions_done": sessions_done,
                "sessions_total": sessions_total,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            })
        return result


@router.post("/{curriculum_id}/complete")
def complete_curriculum(curriculum_id: str, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        c = db.query(Curriculum).filter(
            Curriculum.id == curriculum_id,
            Curriculum.user_id == user_id,
        ).first()
        if not c:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        c.status = "completed"
        c.completed_at = datetime.utcnow()
    return {"ok": True}


@router.delete("/{curriculum_id}")
def delete_curriculum(curriculum_id: str, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        c = db.query(Curriculum).filter(
            Curriculum.id == curriculum_id,
            Curriculum.user_id == user_id,
        ).first()
        if not c:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        if c.status == "completed":
            raise HTTPException(status_code=400, detail="Cannot delete a completed curriculum — export it first")
        c.status = "deleted"
    return {"ok": True}


class UpdateCurriculumBody(BaseModel):
    emoji: str | None = None


@router.patch("/{curriculum_id}")
def update_curriculum(curriculum_id: str, body: UpdateCurriculumBody, claims: dict = Depends(verify_token)):
    user_id = claims["sub"]
    with get_db() as db:
        c = db.query(Curriculum).filter(
            Curriculum.id == curriculum_id,
            Curriculum.user_id == user_id,
        ).first()
        if not c:
            raise HTTPException(status_code=404, detail="Curriculum not found")
        if body.emoji is not None:
            c.emoji = body.emoji[:8]  # Limit emoji field length
    return {"ok": True}
