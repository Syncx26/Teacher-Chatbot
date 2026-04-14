"""
Checkpoint grading — o3 grades the answer, Sonnet writes remediation if needed.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import Card
from chatbot.router import call_openai, stream_anthropic

router = APIRouter()

GRADE_PROMPT = """You are grading a learner's answer to a checkpoint question.

Question: {question}
Rubric: {rubric}
Passing threshold: {threshold}/5
Learner's answer: {answer}

Return JSON only:
{{"score": <0-5>, "passed": <true/false>, "gap": "<one sentence describing the specific gap if failed, empty string if passed>", "feedback": "<one encouraging sentence>"}}"""

REMEDIATION_SYSTEM = """You are Nova, an AI tutor. A learner just failed a checkpoint.
Do NOT repeat the original explanation. Instead, approach the concept from a completely
different angle — use a new analogy, a concrete real-world example, or break it into
smaller steps. Keep it under 150 words."""


class CheckpointBody(BaseModel):
    answer: str
    language: str = "en"
    english_level: str = "fluent"


@router.post("/{card_id}")
def grade_checkpoint(card_id: str, body: CheckpointBody, claims: dict = Depends(verify_token)):
    with get_db() as db:
        card = db.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        if card.card_type != "checkpoint":
            raise HTTPException(status_code=400, detail="Not a checkpoint card")

        content = card.content_json

    grade_messages = [
        {
            "role": "user",
            "content": GRADE_PROMPT.format(
                question=content.get("question", ""),
                rubric=content.get("rubric", ""),
                threshold=content.get("passing_threshold", 3),
                answer=body.answer,
            ),
        }
    ]

    import json
    raw = call_openai("checkpoint_grade", grade_messages)

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"score": 0, "passed": False, "gap": "Could not parse answer.", "feedback": "Try again."}

    if result.get("passed"):
        return {"passed": True, "score": result["score"], "feedback": result["feedback"]}

    # Failed — stream remediation from Sonnet
    gap = result.get("gap", content.get("gap_if_fail", ""))
    language_note = ""
    if body.language != "en":
        language_note = f"Respond in {body.language}. Keep technical terms in English."
    if body.english_level == "simple":
        language_note += " Use sentences under 12 words."

    remediation_messages = [
        {
            "role": "user",
            "content": f"The learner failed a checkpoint. Specific gap: {gap}\n"
                       f"Original question: {content.get('question', '')}\n"
                       f"{language_note}\nWrite a short remediation card body.",
        }
    ]

    def generate():
        import json as _json
        result_json = _json.dumps({"passed": False, "score": result["score"], "feedback": result["feedback"], "gap": gap})
        yield f"data: {result_json}\n\n"
        for chunk in stream_anthropic("remediation", REMEDIATION_SYSTEM, remediation_messages, max_tokens=300):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
