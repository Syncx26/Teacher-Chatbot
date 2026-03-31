"""
Persistent student memory — stores key facts about the student across sessions.

Curriculum-independent: stored by concept/topic name, never by week number.
This means memories survive curriculum restructuring or week reordering.

Memory types:
  knowledge    — things the student understands or has built
  struggle     — recurring difficulties or confusions
  breakthrough — moments when something clicked
  preference   — how they like to learn (video, hands-on, analogies, etc.)
  goal         — things they want to build or achieve
"""

from db.schema import get_conn


def save_memory(user_id: str, memory_type: str, topic: str, content: str) -> None:
    """Upsert a memory. If same user+type+topic exists, update the content."""
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM student_memory WHERE user_id=? AND memory_type=? AND topic=?",
            (user_id, memory_type, topic),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE student_memory SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (content, existing["id"]),
            )
        else:
            conn.execute(
                """INSERT INTO student_memory (user_id, memory_type, topic, content)
                   VALUES (?, ?, ?, ?)""",
                (user_id, memory_type, topic, content),
            )


def get_memories(user_id: str, limit: int = 40) -> list[dict]:
    """Return all memories for a user, most recently updated first."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT memory_type, topic, content, updated_at
               FROM student_memory
               WHERE user_id = ?
               ORDER BY updated_at DESC
               LIMIT ?""",
            (user_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def format_memories_for_prompt(memories: list[dict]) -> str:
    """Format memories into a concise block to inject into the system prompt."""
    if not memories:
        return ""

    by_type: dict[str, list[str]] = {}
    for m in memories:
        by_type.setdefault(m["memory_type"], []).append(
            f"{m['topic']}: {m['content']}"
        )

    type_labels = {
        "knowledge":    "Has learned / built",
        "struggle":     "Struggles with",
        "breakthrough": "Had a breakthrough on",
        "preference":   "Learns best via",
        "goal":         "Wants to build",
    }

    lines = ["WHAT YOU KNOW ABOUT THIS STUDENT FROM PAST SESSIONS:"]
    for t, label in type_labels.items():
        if t in by_type:
            items = by_type[t][:6]
            lines.append(f"  {label}: {'; '.join(items)}")

    return "\n".join(lines)
