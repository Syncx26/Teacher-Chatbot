"""
Export curriculum content as Markdown or JSON.
GET /export/{curriculum_id}?format=markdown|json
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from auth import verify_token
from db.helpers import get_db
from db.schema import Curriculum, Session, Card

router = APIRouter()


def _card_to_md(card: Card) -> str:
    c = card.content_json
    ct = card.card_type

    if ct == "concept":
        lines = [
            f"#### 💡 Concept: {c.get('title', '')}",
            "",
            c.get("body", ""),
        ]
        if c.get("analogy"):
            lines += ["", f"> **Think of it like…** {c['analogy']}"]
        if c.get("key_term"):
            lines += ["", f"**{c['key_term']}** — {c.get('key_term_definition', '')}"]

    elif ct == "exercise":
        lines = [
            f"#### ✏️ Exercise",
            "",
            f"**Prompt:** {c.get('prompt', '')}",
            "",
            f"**Answer:** {c.get('answer', '')}",
        ]
        if c.get("explanation"):
            lines += ["", f"*{c['explanation']}*"]

    elif ct == "checkpoint":
        lines = [
            f"#### 🎯 Checkpoint",
            "",
            f"**Question:** {c.get('question', '')}",
        ]
        if c.get("rubric"):
            lines += ["", f"**Rubric:** {c['rubric']}"]

    elif ct == "explore":
        subtype = c.get("subtype", "explore").replace("_", " ").title()
        lines = [
            f"#### ✦ {subtype}: {c.get('title', '')}",
            "",
            c.get("body", ""),
        ]
        if c.get("source"):
            lines += ["", f"— *{c['source']}*"]

    elif ct == "review":
        inner = c.get("content", {})
        lines = [
            "#### 🔁 Review",
            "",
            f"**Prompt:** {inner.get('title') or inner.get('prompt') or inner.get('question', '')}",
            f"**Answer:** {inner.get('answer') or inner.get('explanation', '')}",
        ]

    else:
        lines = [f"#### Card ({ct})", "", str(c)]

    return "\n".join(lines)


def _build_markdown(curriculum: Curriculum) -> str:
    opus = curriculum.opus_json
    lines = [
        f"# {curriculum.topic}",
        "",
        f"**Mastery Goal:** {opus.get('mastery_goal', '')}",
        f"**Duration:** {curriculum.duration_weeks} weeks",
        "",
        "---",
        "",
    ]

    with get_db() as db:
        sessions = (
            db.query(Session)
            .filter(Session.curriculum_id == curriculum.id)
            .order_by(Session.week_number, Session.day_number)
            .all()
        )

        current_week = 0
        for session in sessions:
            if session.week_number != current_week:
                current_week = session.week_number
                week_data = next(
                    (w for w in opus.get("weeks", []) if w["week_number"] == current_week),
                    {}
                )
                theme = week_data.get("theme", f"Week {current_week}")
                lines += [
                    f"## Week {current_week}: {theme}",
                    "",
                ]

            day_label = "Weekend" if session.is_weekend else f"Day {session.day_number}"
            status = "✓" if session.status == "done" else "○"
            lines += [f"### {status} {day_label}", ""]

            cards = (
                db.query(Card)
                .filter(Card.session_id == session.id)
                .order_by(Card.position)
                .all()
            )
            for card in cards:
                lines.append(_card_to_md(card))
                lines.append("")

            lines.append("---")
            lines.append("")

    return "\n".join(lines)


@router.get("/{curriculum_id}")
def export_curriculum(
    curriculum_id: str,
    format: str = "markdown",
    claims: dict = Depends(verify_token),
):
    user_id = claims["sub"]
    with get_db() as db:
        curriculum = db.query(Curriculum).filter(
            Curriculum.id == curriculum_id,
            Curriculum.user_id == user_id,
        ).first()
        if not curriculum:
            raise HTTPException(status_code=404, detail="Curriculum not found")

        topic_slug = curriculum.topic.lower().replace(" ", "-")[:40]

        if format == "markdown":
            content = _build_markdown(curriculum)
            return Response(
                content=content,
                media_type="text/markdown",
                headers={
                    "Content-Disposition": f'attachment; filename="mastermind-{topic_slug}.md"'
                },
            )

        if format == "json":
            import json
            return Response(
                content=json.dumps(curriculum.opus_json, indent=2),
                media_type="application/json",
                headers={
                    "Content-Disposition": f'attachment; filename="mastermind-{topic_slug}.json"'
                },
            )

        raise HTTPException(status_code=400, detail="format must be markdown or json")
