"""
custom_topics.py — CRUD for user-defined custom topics.
"""
import json
import re
from db.schema import get_conn


def save_custom_topic(user_id: str, topic: dict) -> str:
    """
    Persist a confirmed custom topic.  Returns the generated topic_id.
    """
    label = topic.get("label", "Custom Topic")
    # Slug-ify label into a topic_id
    topic_id = "custom_" + re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO custom_topics
               (user_id, topic_id, label, description, difficulty, reason,
                insert_after_week, subtopics)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                topic_id,
                label,
                topic.get("description", ""),
                topic.get("difficulty", "intermediate"),
                topic.get("reason", ""),
                int(topic.get("insert_after_week", 0)),
                json.dumps(topic.get("subtopics", [])),
            ),
        )
    return topic_id


def get_custom_topics(user_id: str) -> list[dict]:
    """Return all custom topics for a user, ordered by insert_after_week."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT topic_id, label, description, difficulty, reason,
                      insert_after_week, subtopics, created_at
               FROM custom_topics
               WHERE user_id = ?
               ORDER BY insert_after_week, created_at""",
            (user_id,),
        ).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["subtopics"] = json.loads(d.get("subtopics") or "[]")
        results.append(d)
    return results
