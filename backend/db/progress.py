from datetime import datetime
from typing import Optional
from db.schema import get_conn


def get_or_create_user(user_id: str) -> dict:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if not row:
            conn.execute(
                "INSERT INTO users (user_id) VALUES (?)", (user_id,)
            )
            row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        conn.execute(
            "UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE user_id = ?", (user_id,)
        )
        return dict(row)


def get_progress(user_id: str) -> dict:
    user = get_or_create_user(user_id)
    with get_conn() as conn:
        milestones = conn.execute(
            "SELECT week FROM milestones WHERE user_id = ? ORDER BY week",
            (user_id,)
        ).fetchall()
    user["completed_weeks"] = [m["week"] for m in milestones]
    return user


def set_current_week(user_id: str, week: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET current_week = ? WHERE user_id = ?", (week, user_id)
        )


def mark_milestone_complete(user_id: str, week: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO milestones (user_id, week) VALUES (?, ?)",
            (user_id, week)
        )
        conn.execute(
            "UPDATE users SET current_week = ?, xp = xp + 100 WHERE user_id = ?",
            (week + 1, user_id)
        )


def add_xp(user_id: str, amount: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET xp = xp + ? WHERE user_id = ?", (amount, user_id)
        )


def get_conversation_history(user_id: str, limit: int = 20) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT role, content FROM messages
               WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit)
        ).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


def append_message(
    user_id: str,
    role: str,
    content: str,
    model_tier: Optional[str] = None,
    confidence_score: Optional[int] = None,
    confidence_json: Optional[str] = None,
) -> None:
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO messages (user_id, role, content, model_tier, confidence_score, confidence_json)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, role, content, model_tier, confidence_score, confidence_json)
        )


def reset_progress(user_id: str) -> None:
    """Reset a user's progress to week 1. Memories are preserved."""
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET current_week = 1, xp = 0 WHERE user_id = ?", (user_id,)
        )
        conn.execute("DELETE FROM milestones WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM sprint_goals WHERE user_id = ?", (user_id,))
        # Clear chat history so Nova starts fresh for the new curriculum
        conn.execute("DELETE FROM messages WHERE user_id = ?", (user_id,))
    """Returns how many sessions the user has had while on this week (for stuck detection)."""
    with get_conn() as conn:
        row = conn.execute(
            """SELECT COUNT(DISTINCT DATE(created_at)) as days
               FROM messages WHERE user_id = ? AND role = 'user'""",
            (user_id,)
        ).fetchone()
    return row["days"] if row else 0


def save_sprint_goal(user_id: str, topic_id: str, subtopic_id: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO sprint_goals (user_id, topic_id, subtopic_id) VALUES (?, ?, ?)",
            (user_id, topic_id, subtopic_id)
        )
        return cur.lastrowid


def get_active_sprint(user_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT * FROM sprint_goals WHERE user_id = ? AND status = 'in_progress'
               ORDER BY created_at DESC LIMIT 1""",
            (user_id,)
        ).fetchone()
    return dict(row) if row else None
