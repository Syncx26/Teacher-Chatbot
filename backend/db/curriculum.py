"""
Curriculum DB layer.
Each user can have up to 5 saved curriculums. One is active at a time.
The DEFAULT_CURRICULUM is returned when no saved curriculum exists.
"""
import json
from db.schema import get_conn

MAX_CURRICULUMS = 5

DEFAULT_CURRICULUM = {
    "id": None,
    "name": "AI Engineering",
    "goal": "Build real AI systems over 12 weeks",
    "is_active": True,
    "weeks": [
        {"week": 1,  "name": "Python & JSON",   "topics": ["Data structures", "JSON parsing", "File I/O"],            "goal": "Master Python foundations",                   "build": "JSON data processor CLI"},
        {"week": 2,  "name": "REST APIs",        "topics": ["HTTP methods", "Requests library", "API design"],        "goal": "Consume and build REST APIs",                 "build": "Weather app using public API"},
        {"week": 3,  "name": "SQLite",           "topics": ["SQL queries", "sqlite3 library", "Data modelling"],      "goal": "Persist data with SQLite",                    "build": "Note-taking CLI app"},
        {"week": 4,  "name": "LLM APIs",         "topics": ["Anthropic API", "Prompt engineering", "System prompts"],"goal": "Build with LLM APIs",                         "build": "Custom chatbot"},
        {"week": 5,  "name": "RAG",              "topics": ["Embeddings", "Vector databases", "ChromaDB"],           "goal": "Build retrieval-augmented systems",            "build": "Document Q&A system"},
        {"week": 6,  "name": "LangGraph",        "topics": ["State machines", "Graphs", "Conditional edges"],        "goal": "Build stateful AI workflows",                 "build": "Multi-step AI agent"},
        {"week": 7,  "name": "LangSmith",        "topics": ["Tracing", "Observability", "Debugging"],                "goal": "Monitor and debug LLM apps",                  "build": "Traced AI pipeline"},
        {"week": 8,  "name": "MCP",              "topics": ["Model Context Protocol", "Tool calling", "FastMCP"],    "goal": "Build MCP-enabled tools",                     "build": "MCP server"},
        {"week": 9,  "name": "Multi-Agent",      "topics": ["Agent coordination", "Subgraphs", "Handoffs"],          "goal": "Orchestrate multiple AI agents",               "build": "Research agent team"},
        {"week": 10, "name": "Autonomous",       "topics": ["Human-in-loop", "Breakpoints", "Approval flows"],       "goal": "Build autonomous systems",                    "build": "Self-directed agent"},
        {"week": 11, "name": "Dashboard",        "topics": ["Streamlit", "LLM evaluation", "Metrics"],               "goal": "Visualise and evaluate AI systems",            "build": "AI evaluation dashboard"},
        {"week": 12, "name": "Ship It",          "topics": ["Deployment", "Architecture", "Documentation"],          "goal": "Ship your capstone project",                  "build": "Production AI app"},
    ],
}


def get_active_curriculum(user_id: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM curriculums WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1",
            (user_id,),
        ).fetchone()
    if not row:
        return DEFAULT_CURRICULUM
    result = dict(row)
    result["weeks"] = json.loads(result["weeks_json"])
    del result["weeks_json"]
    return result


def list_curriculums(user_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, goal, is_active, created_at FROM curriculums WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def count_curriculums(user_id: str) -> int:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM curriculums WHERE user_id = ?", (user_id,)
        ).fetchone()
    return row["cnt"] if row else 0


def save_curriculum(user_id: str, name: str, goal: str, weeks: list, keep_current: bool = True) -> int:
    """Save a new curriculum. Returns the new row id."""
    weeks_json = json.dumps(weeks)
    with get_conn() as conn:
        if not keep_current:
            # Delete the currently active one
            conn.execute(
                "DELETE FROM curriculums WHERE user_id = ? AND is_active = 1", (user_id,)
            )
        # Deactivate all
        conn.execute("UPDATE curriculums SET is_active = 0 WHERE user_id = ?", (user_id,))
        cur = conn.execute(
            "INSERT INTO curriculums (user_id, name, goal, weeks_json, is_active) VALUES (?, ?, ?, ?, 1)",
            (user_id, name, goal, weeks_json),
        )
        return cur.lastrowid


def switch_curriculum(user_id: str, curriculum_id: int) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE curriculums SET is_active = 0 WHERE user_id = ?", (user_id,))
        conn.execute(
            "UPDATE curriculums SET is_active = 1 WHERE id = ? AND user_id = ?",
            (curriculum_id, user_id),
        )


def delete_curriculum(user_id: str, curriculum_id: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM curriculums WHERE id = ? AND user_id = ?",
            (curriculum_id, user_id),
        )
