"""
Chat router — Ask Nova (Sonnet streaming).
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from auth import verify_token
from db.helpers import get_db
from db.schema import Card, User
from chatbot.router import stream_anthropic

router = APIRouter()

NOVA_SYSTEM = """You are Nova, an AI tutor inside the Mastermind learning app.
You are warm, direct, and expert. You never lecture — you ask one focused question
at a time to guide the learner to the answer themselves (Socratic method).
You never say "Great question!" or "That's interesting!" — just answer.
Keep responses short: 2-3 sentences max unless the learner explicitly asks for more.
If the learner is confused, find a new angle — never repeat the same explanation louder.
{language_instruction}"""


class ChatBody(BaseModel):
    card_id: str
    message: str
    history: list[dict] = []
    language: str = "en"
    english_level: str = "fluent"


@router.post("")
def chat(body: ChatBody, claims: dict = Depends(verify_token)):
    language_instruction = ""
    if body.language != "en":
        language_instruction = f"Respond in {body.language}. Keep technical terms in English."
    if body.english_level == "simple":
        language_instruction += " Use sentences under 12 words. No idioms or complex vocabulary."

    system = NOVA_SYSTEM.format(language_instruction=language_instruction)

    # Load card context
    card_context = ""
    with get_db() as db:
        card = db.query(Card).filter(Card.id == body.card_id).first()
        if card:
            content = card.content_json
            card_context = f"\n\nCard context: {content.get('title', '')} — {content.get('body', '')}"

    messages = body.history + [
        {"role": "user", "content": body.message + card_context}
    ]

    def generate():
        for chunk in stream_anthropic("ask_nova", system, messages, max_tokens=512):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
