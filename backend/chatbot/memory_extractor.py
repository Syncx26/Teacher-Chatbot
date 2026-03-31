"""
memory_extractor.py

After each chat turn, calls Claude Haiku to extract key facts about the
student and saves them to student_memory. Runs as a background task so
it never delays the response.

Extracted facts are curriculum-independent — stored by concept name, not
week number, so they survive curriculum changes.
"""

from __future__ import annotations

import asyncio
import json

from config import MODEL_HAIKU
from db.memory import save_memory


async def extract_and_save_memories(
    user_id: str,
    user_message: str,
    assistant_response: str,
) -> None:
    """
    Analyse one conversation turn and persist any extractable student facts.
    Failures are swallowed — memory extraction is best-effort.
    """
    # Import here to avoid circular imports at module load time
    from chatbot.claude_client import _run_tool_loop

    # Truncate to keep the Haiku call cheap
    user_snippet = user_message[:400]
    assistant_snippet = assistant_response[:600]

    extraction_prompt = f"""Analyse this single conversation turn between a student and their AI tutor.

Student: {user_snippet}
Tutor: {assistant_snippet}

Extract key facts about the student's learning. Return ONLY a valid JSON array — no markdown fences, no explanation.

Each item must be:
  {{"type": "<type>", "topic": "<short concept name>", "content": "<one sentence fact>"}}

Allowed types:
  "knowledge"    — student demonstrated understanding or completed something
  "struggle"     — student expressed confusion, made an error, or got stuck
  "breakthrough" — student had an aha moment or something finally clicked
  "preference"   — how they prefer to learn (video, analogies, building, etc.)
  "goal"         — something specific they want to build or achieve

Rules:
  - Only extract clear signals, not guesses
  - topic must be a concept name, never a week number (e.g. "RAG" not "Week 5")
  - content is one sentence, plain English
  - Return [] if nothing clear to extract
  - Max 3 items

JSON array:"""

    try:
        raw = await _run_tool_loop(
            model=MODEL_HAIKU,
            system_prompt=(
                "You extract student learning facts from tutoring conversations. "
                "Return only a JSON array."
            ),
            messages=[{"role": "user", "content": extraction_prompt}],
            use_tools=False,
            use_thinking=False,
        )

        # Strip accidental markdown fences
        cleaned = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        memories: list[dict] = json.loads(cleaned)

        if isinstance(memories, list):
            for m in memories:
                if all(k in m for k in ("type", "topic", "content")):
                    if m["type"] in (
                        "knowledge", "struggle", "breakthrough", "preference", "goal"
                    ):
                        save_memory(user_id, m["type"], m["topic"], m["content"])

    except Exception:
        # Never crash the main request over a memory extraction failure
        pass
