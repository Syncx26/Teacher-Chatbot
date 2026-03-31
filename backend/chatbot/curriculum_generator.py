"""
Generates a 12-week curriculum plan as structured JSON using Claude Haiku.
Haiku is fast and cheap — ideal for structured output tasks.
"""
import asyncio
import json
import re

import anthropic
from config import ANTHROPIC_API_KEY, MODEL_HAIKU

_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

_PROMPT = """\
You are a curriculum designer. Create a practical 12-week learning curriculum.

GOAL: {goal}
{memory_context}

Output ONLY valid JSON — no markdown fences, no explanation, nothing else.

{{
  "name": "Short curriculum name (3-5 words)",
  "weeks": [
    {{
      "week": 1,
      "name": "Week Topic (2-4 words)",
      "topics": ["Concept A", "Concept B", "Concept C"],
      "goal": "One clear sentence describing the week's outcome",
      "build": "Specific project or exercise to build this week"
    }}
  ]
}}

Requirements:
- Exactly 12 week objects in the array
- Each week name: 2-4 words, Title Case
- Topics: 2-4 concise items
- Goal: one actionable sentence
- Build: specific, hands-on deliverable
- Progressive difficulty — each week builds on the last
- Practical and project-focused throughout\
"""


async def generate_curriculum(goal: str, memory_context: str = "") -> dict:
    """
    Call Haiku to generate a 12-week curriculum plan.
    Retries up to 3 times if JSON is malformed or schema is wrong.
    Returns a dict with keys: name, goal, weeks.
    """
    prompt = _PROMPT.format(
        goal=goal,
        memory_context=(
            f"Student background (tailor the plan accordingly):\n{memory_context}"
            if memory_context else ""
        ),
    )

    def _call() -> str:
        resp = _client.messages.create(
            model=MODEL_HAIKU,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()

    last_err: Exception | None = None
    for attempt in range(3):
        try:
            raw = await asyncio.get_event_loop().run_in_executor(None, _call)
            # Strip markdown fences if the model added them despite instructions
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw.strip())

            plan = json.loads(raw)

            weeks = plan.get("weeks", [])
            if len(weeks) != 12:
                raise ValueError(f"Expected 12 weeks, got {len(weeks)}")
            for w in weeks:
                missing = [k for k in ("week", "name", "topics", "goal", "build") if k not in w]
                if missing:
                    raise ValueError(f"Week {w.get('week')} missing fields: {missing}")

            plan["goal"] = goal
            return plan

        except Exception as exc:
            last_err = exc
            continue

    raise RuntimeError(f"Curriculum generation failed after 3 attempts: {last_err}")
