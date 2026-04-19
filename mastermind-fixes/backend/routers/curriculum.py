"""
Curriculum router — builds week-by-week using Opus for prose and Haiku for JSON conversion.

Architecture:
1. Opus preamble call: generate mastery_goal + N week themes in natural language
2. Haiku converts preamble → {mastery_goal, weeks: [{week_number, theme}]}
3. For each week 1..N:
   - Opus writes natural-language curriculum for that week's days
   - Haiku converts → structured week JSON
4. Save curriculum + sessions + cards atomically
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import Curriculum
from db.session_helpers import parse_and_save_curriculum
from chatbot.router import TASK_ROUTES, _get_anthropic

router = APIRouter()

OPUS_MODEL = TASK_ROUTES["curriculum_build"]["model"]  # claude-opus-4-7
HAIKU_MODEL = "claude-haiku-4-5-20251001"

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

PREAMBLE_SYSTEM = """You are a master curriculum designer using adult learning principles:
- Andragogy (Knowles): adults need to know WHY, learn through problems
- SM-2 spaced repetition: review at increasing intervals
- Deliberate practice (Ericsson): exercises slightly harder than current ability
- Cognitive load theory (Sweller): ONE concept per card, never two ideas
- Flow state (Csikszentmihalyi): challenge must match skill level
- Zeigarnik effect: cliffhangers drive return engagement

Design the week-by-week arc:
- Build from foundations → application → mastery → synthesis
- Each week has a single theme that builds on prior weeks
- Difficulty ramps ~5–10% per week
- The final week is synthesis / capstone"""


WEEK_SYSTEM = """You are a master curriculum designer writing ONE week of a mastery curriculum.

Principles:
- ONE idea per card. Never two ideas on one screen.
- Every concept card is immediately followed by an exercise card.
- The last weekday of the week ends with a checkpoint card.
- Weekend sessions (if enabled) use explore cards only — shorter, feel like a reward, not a lesson.
- End each day on a cliffhanger hinting at tomorrow's concept (Zeigarnik).
- Exercise difficulty is slightly above current ability (deliberate practice).

Card types you can use:
- concept:    (title, body, analogy, key_term, key_term_definition)
- exercise:   (prompt, hints, answer, explanation)
- checkpoint: (question, rubric, gap_if_fail)
- explore:    (subtype ∈ {real_story, hot_take, connection, did_you_know, what_would_you_do}, title, body, source)

Analogies should be from everyday life, concrete, relatable."""


HAIKU_SYSTEM = """You convert natural-language curriculum content into structured data by calling the emit_json tool.
Extract every concept, exercise, checkpoint, and explore card from the source text.
Preserve all content — do not omit or summarise."""


# JSON schemas passed as tool input_schema — guarantees valid structure via forced tool use
PREAMBLE_TOOL_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "mastery_goal": {
            "type": "string",
            "description": "One sentence: what the learner will be able to DO by the end",
        },
        "weeks": {
            "type": "array",
            "description": "Week-by-week learning arc in order",
            "items": {
                "type": "object",
                "properties": {
                    "week_number": {"type": "integer"},
                    "theme": {"type": "string"},
                },
                "required": ["week_number", "theme"],
            },
        },
    },
    "required": ["mastery_goal", "weeks"],
}

WEEK_TOOL_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "week_number": {"type": "integer"},
        "theme": {"type": "string"},
        "days": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "day_number": {"type": "integer"},
                    "is_weekend": {
                        "type": "boolean",
                        "description": "true for days 6–7 (weekend), false for days 1–5",
                    },
                    "cards": {
                        "type": "array",
                        "description": (
                            "Ordered cards for this day. "
                            "Each card has a 'type' field: concept | exercise | checkpoint | explore. "
                            "concept fields: title, body, analogy, key_term, key_term_definition. "
                            "exercise fields: prompt, hints (array), answer, explanation. "
                            "checkpoint fields: question, rubric, passing_threshold (always 3), gap_if_fail. "
                            "explore fields: subtype (real_story|hot_take|connection|did_you_know|what_would_you_do), title, body, source (optional)."
                        ),
                        "items": {"type": "object"},
                    },
                },
                "required": ["day_number", "is_weekend", "cards"],
            },
        },
    },
    "required": ["week_number", "theme", "days"],
}


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def _context_block(state: dict) -> str:
    ctx = state.get("context") or ""
    if not ctx:
        return ""
    return f"\n\nSource material (use to ground the curriculum with real examples and accurate details):\n---\n{ctx[:6000]}\n---"


def build_preamble_prompt(state: dict) -> str:
    answers = state.get("answers", [])
    return f"""Design the high-level structure for a {state['duration_weeks']}-week mastery curriculum.

Topic: {state['topic']}

User context:
- Why it matters to them: {answers[0] if len(answers) > 0 else 'not provided'}
- What failed before: {answers[1] if len(answers) > 1 else 'not provided'}
- Desired outcome: {answers[2] if len(answers) > 2 else 'not provided'}
- Weekday session: {state['weekday_minutes']} minutes
- Weekend session: {state['weekend_minutes']} minutes (0 = no weekend sessions){_context_block(state)}

Output in natural language (NO JSON):

Mastery goal: [one clear sentence describing what the user will be able to DO by the end]

Week 1: [short theme title — the week's focus]
Week 2: [short theme title]
...
Week {state['duration_weeks']}: [short theme title — synthesis / capstone]

Build the arc progressively. Early weeks establish foundations; middle weeks apply and deepen;
final weeks synthesize toward the user's desired outcome."""


def build_week_prompt(state: dict, week_num: int, total_weeks: int, theme: str, prev_themes: list[str]) -> str:
    answers = state.get("answers", [])
    prev_line = ", ".join(f"W{i+1} ({t})" for i, t in enumerate(prev_themes)) or "none — this is week 1"
    weekend_section = ""
    if state["weekend_minutes"] > 0:
        weekend_section = """

== Day 6 (weekend) ==
Explore:
  Subtype: [one of: real_story | hot_take | connection | did_you_know | what_would_you_do]
  Title: [catchy]
  Body: [2–4 sentences, first-person where possible — feels like a reward, not a lesson]
  Source: [source or omit]

== Day 7 (weekend) ==
Explore:
  Subtype: [pick a different subtype than day 6]
  Title: [catchy]
  Body: [2–4 sentences]
  Source: [source or omit]"""

    checkpoint_note = ("\n  (On the LAST weekday of the week ONLY, add a Checkpoint after the exercise:"
                       "\n   Checkpoint:"
                       "\n     Question: [synthesizing question that tests the week's mastery]"
                       "\n     Rubric: [what a good answer looks like]"
                       "\n     Gap if fail: [specific knowledge gap if they can't answer])")

    cliffhanger_target = f"week {week_num + 1}" if week_num < total_weeks else "the capstone synthesis"

    return f"""Write the content for week {week_num} of {total_weeks}.

Topic: {state['topic']}
This week's theme: {theme}
Previous weeks: {prev_line}

User context (already known — do not restate):
- Why it matters: {answers[0] if len(answers) > 0 else 'not provided'}
- What failed before: {answers[1] if len(answers) > 1 else 'not provided'}
- Desired outcome: {answers[2] if len(answers) > 2 else 'not provided'}

Session lengths:
- Weekday: {state['weekday_minutes']} min — fit 1 concept + 1 exercise per day (+ checkpoint on last weekday)
- Weekend: {state['weekend_minutes']} min ({'skip weekends entirely' if state['weekend_minutes'] == 0 else '1 explore card per day'})

Output in natural language (NO JSON) with this EXACT structure:

== Day 1 (weekday) ==
Concept:
  Title: [title]
  Body: [2–3 sentences teaching ONE idea]
  Analogy: [one line — everyday comparison]
  Key term: [term] = [definition]
Exercise:
  Prompt: [what the learner must do]
  Hints: [hint1 | hint2]
  Answer: [expected answer]
  Explanation: [why this is the answer]{checkpoint_note}

== Day 2 (weekday) ==
(same structure — concept + exercise)

== Day 3 (weekday) ==
(same)

== Day 4 (weekday) ==
(same)

== Day 5 (weekday) ==
(same — AND add the Checkpoint, since this is the last weekday){weekend_section}

End the week on a cliffhanger that hints at {cliffhanger_target}.
The content must build directly on the theme "{theme}" and assume the user has completed previous weeks."""


# ---------------------------------------------------------------------------
# Model calls
# ---------------------------------------------------------------------------

def _text_from(response) -> str:
    """Concatenate text blocks from an Anthropic response."""
    return "".join(b.text for b in response.content if b.type == "text")


def call_opus_preamble(client, state: dict) -> str:
    response = client.messages.create(
        model=OPUS_MODEL,
        max_tokens=2000,
        system=PREAMBLE_SYSTEM,
        messages=[{"role": "user", "content": build_preamble_prompt(state)}],
    )
    return _text_from(response)


def call_opus_week(client, state: dict, week_num: int, total_weeks: int, theme: str, prev_themes: list[str]) -> str:
    response = client.messages.create(
        model=OPUS_MODEL,
        max_tokens=8000,
        system=[{"type": "text", "text": WEEK_SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": build_week_prompt(state, week_num, total_weeks, theme, prev_themes)}],
    )
    return _text_from(response)


def haiku_to_json(client, schema: dict, content: str) -> dict | None:
    """Convert prose to structured JSON using Haiku forced tool use.

    Forces emit_json tool call — the model cannot produce invalid JSON.
    Returns the tool input dict, or None if the tool was somehow not called.
    """
    response = client.messages.create(
        model=HAIKU_MODEL,
        max_tokens=8000,
        system=HAIKU_SYSTEM,
        tools=[{
            "name": "emit_json",
            "description": "Emit the structured JSON representation of the curriculum content.",
            "input_schema": schema,
        }],
        tool_choice={"type": "tool", "name": "emit_json"},
        messages=[{"role": "user", "content": content}],
    )
    for block in response.content:
        if block.type == "tool_use" and block.name == "emit_json":
            return block.input  # Already a parsed dict — no json.loads needed
    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

class BuildBody(BaseModel):
    user_id: str


@router.post("/build")
def build_curriculum(body: BuildBody, claims: dict = Depends(verify_token)):
    # Lazy import to avoid circular dependency at module load
    from routers.onboarding import _STATE as ONBOARDING_STATE

    state = ONBOARDING_STATE.get(body.user_id)
    if not state:
        raise HTTPException(status_code=400, detail="Complete onboarding first.")

    curriculum_id = str(uuid.uuid4())

    def generate():
        client = _get_anthropic()

        try:
            # -------- Step 1: preamble (mastery goal + week themes) --------
            yield "data: [STAGE:preamble]\n\n"
            preamble_text = call_opus_preamble(client, state)
            preamble = haiku_to_json(client, PREAMBLE_TOOL_SCHEMA, preamble_text)
            if not preamble or not preamble.get("weeks"):
                yield "data: [ERROR:invalid_preamble]\n\n"
                return

            weeks_meta = preamble["weeks"]
            total_weeks = len(weeks_meta)
            mastery_goal = preamble.get("mastery_goal", "")

            # -------- Step 2: per-week generation --------
            weeks_json = []
            for i, meta in enumerate(weeks_meta, start=1):
                theme = meta.get("theme", "")
                prev_themes = [w.get("theme", "") for w in weeks_meta[: i - 1]]

                week_text = call_opus_week(client, state, i, total_weeks, theme, prev_themes)
                week_data = haiku_to_json(client, WEEK_TOOL_SCHEMA, week_text)

                if not week_data or not week_data.get("days"):
                    yield f"data: [ERROR:week_{i}_failed]\n\n"
                    return

                # Normalize: ensure week_number matches, days are sorted, card positions preserved
                week_data["week_number"] = i
                weeks_json.append(week_data)
                yield f"data: [WEEK:{i}/{total_weeks}]\n\n"

            # -------- Step 3: save atomically --------
            opus_json = {
                "topic": state["topic"],
                "total_weeks": total_weeks,
                "mastery_goal": mastery_goal,
                "weeks": weeks_json,
            }

            with get_db() as db:
                curriculum = Curriculum(
                    id=curriculum_id,
                    user_id=body.user_id,
                    topic=state["topic"],
                    duration_weeks=total_weeks,
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
            print(f"Curriculum build failed: {e}")
            yield "data: [ERROR:build_failed]\n\n"

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
            c.emoji = body.emoji[:8]
    return {"ok": True}
