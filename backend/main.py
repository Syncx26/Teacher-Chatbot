"""
FastAPI backend for Synapse War Room Teacher Chatbot.
All AI logic runs server-side — no API keys exposed to browser.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import DB_PATH
from db.schema import init_db, get_conn
from db.progress import (
    get_progress, set_current_week, mark_milestone_complete,
    get_conversation_history, append_message, add_xp, save_sprint_goal
)
from chatbot.system_prompt import build_prompt
from chatbot.rules_engine import pre_check, post_check
from chatbot.router import classify_request
from chatbot.claude_client import chat
from chatbot.prerequisite import get_prerequisite_chain, get_all_topics_with_state
from db.custom_topics import save_custom_topic, get_custom_topics
from db.progress import reset_progress
from db.memory import get_relevant_memories, format_memories_for_prompt
from chatbot.memory_extractor import extract_and_save_memories
from db.curriculum import (
    get_active_curriculum, list_curriculums, save_curriculum,
    switch_curriculum, delete_curriculum, count_curriculums,
)
from chatbot.curriculum_generator import generate_curriculum
from research.fetcher import get_papers, get_last_refresh_time, is_stale
from research.summarizer import get_paper_with_summary
from research.scheduler import start_scheduler, stop_scheduler, trigger_refresh, startup_check
from research.semantic_scholar import get_related_papers, get_fulltext_url
from config import SEMANTIC_SCHOLAR_API_KEY, UNPAYWALL_EMAIL


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Startup paper refresh (non-blocking)
    asyncio.create_task(startup_check(1))
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Synapse War Room API", version="1.0.0", lifespan=lifespan)

# CORS: allow localhost for dev + any Railway/custom frontend URL from env
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────

class ChatRequest(BaseModel):
    user_id: str
    message: str

class ChatResponse(BaseModel):
    content: str
    model_tier: str
    confidence_score: Optional[int] = None
    post_check: dict = {}

class AdvanceWeekRequest(BaseModel):
    user_id: str
    week: int

class SprintGoalRequest(BaseModel):
    user_id: str
    topic_id: str
    subtopic_id: str

class RefreshRequest(BaseModel):
    user_id: str


# ── Progress Endpoints ────────────────────────────────────────────────────────

@app.get("/progress/{user_id}")
def get_user_progress(user_id: str):
    return get_progress(user_id)


@app.post("/progress/advance")
def advance_week(req: AdvanceWeekRequest):
    mark_milestone_complete(req.user_id, req.week)
    return get_progress(req.user_id)


@app.post("/progress/xp")
def grant_xp(user_id: str, amount: int = 10):
    add_xp(user_id, amount)
    return {"status": "ok"}


class ResetRequest(BaseModel):
    user_id: str

@app.post("/progress/reset")
def reset_user_progress(req: ResetRequest):
    """Reset week/XP/milestones to zero. Memories are preserved."""
    reset_progress(req.user_id)
    return get_progress(req.user_id)


# ── Curriculum Endpoints ──────────────────────────────────────────────────────

class GenerateCurriculumRequest(BaseModel):
    user_id: str
    goal: str

class SaveCurriculumRequest(BaseModel):
    user_id: str
    name: str
    goal: str
    weeks: list
    keep_current: bool = True

@app.get("/curriculum/active/{user_id}")
def get_active_curriculum_endpoint(user_id: str):
    return get_active_curriculum(user_id)

@app.get("/curriculum/list/{user_id}")
def list_curriculums_endpoint(user_id: str):
    return list_curriculums(user_id)

@app.post("/curriculum/generate")
async def generate_curriculum_endpoint(req: GenerateCurriculumRequest):
    if count_curriculums(req.user_id) >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 curriculums reached. Delete one first.")
    memories = get_relevant_memories(req.user_id, req.goal)
    memory_ctx = format_memories_for_prompt(memories) if memories else ""
    try:
        plan = await generate_curriculum(req.goal, memory_ctx)
        return plan
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/curriculum/save")
def save_curriculum_endpoint(req: SaveCurriculumRequest):
    curriculum_id = save_curriculum(req.user_id, req.name, req.goal, req.weeks, req.keep_current)
    reset_progress(req.user_id)
    curriculum = get_active_curriculum(req.user_id)
    curriculum["id"] = curriculum_id
    return curriculum

@app.post("/curriculum/switch/{curriculum_id}")
def switch_curriculum_endpoint(curriculum_id: int, req: ResetRequest):
    switch_curriculum(req.user_id, curriculum_id)
    reset_progress(req.user_id)
    return get_active_curriculum(req.user_id)

@app.delete("/curriculum/{curriculum_id}")
def delete_curriculum_endpoint(curriculum_id: int, user_id: str):
    delete_curriculum(user_id, curriculum_id)
    return {"status": "deleted"}


# ── Topic Endpoints ───────────────────────────────────────────────────────────

@app.get("/topics/{user_id}")
def get_topics(user_id: str):
    progress = get_progress(user_id)
    return get_all_topics_with_state(progress["current_week"])


@app.get("/topics/prerequisite/{topic_id}")
def get_prerequisites(topic_id: str, current_week: int = 1):
    return get_prerequisite_chain(topic_id, current_week)


@app.post("/sprint")
def create_sprint(req: SprintGoalRequest):
    goal_id = save_sprint_goal(req.user_id, req.topic_id, req.subtopic_id)
    return {"goal_id": goal_id}


# ── Chat Endpoint ─────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    try:
        progress = get_progress(req.user_id)
        history = get_conversation_history(req.user_id, limit=20)

        # Persist user message
        append_message(req.user_id, "user", req.message)

        # Rules engine pre-check (may inject gate/wellbeing prefixes)
        gated_message = pre_check(req.message, progress)

        # Route to correct model tier + task type
        route = classify_request(req.message, progress)
        model_tier = route["tier"]
        task_type = route["task_type"]

        # Load only relevant memories for this message (cost-efficient)
        memories = get_relevant_memories(req.user_id, req.message)

        # Load active curriculum (custom or default)
        curriculum = get_active_curriculum(req.user_id)

        # Build fresh system prompt with live progress + memory + curriculum + task mode
        system_prompt = build_prompt(progress, task_type=task_type, memories=memories, curriculum=curriculum)

        # Call AI
        result = await chat(gated_message, system_prompt, model_tier, history)

        content = result["content"]
        tier = result["model_tier"]
        conf_score = result.get("confidence_score")
        conf_json = result.get("confidence_json")

        # Post-check (milestone / stuck detection)
        pc = post_check(content, progress)

        # Persist assistant message
        append_message(
            req.user_id, "assistant", content,
            model_tier=tier,
            confidence_score=conf_score,
            confidence_json=conf_json,
        )

        # Award XP for engagement
        add_xp(req.user_id, 5)

        # Extract + save student memories in the background (non-blocking)
        asyncio.create_task(
            extract_and_save_memories(req.user_id, req.message, content)
        )

        return ChatResponse(
            content=content,
            model_tier=tier,
            confidence_score=conf_score,
            post_check=pc,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/chat/history/{user_id}")
def get_history(user_id: str, limit: int = 20):
    return get_conversation_history(user_id, limit)


# ── Research Paper Endpoints ──────────────────────────────────────────────────

@app.get("/papers")
async def list_papers_endpoint(
    limit: int = 20,
    offset: int = 0,
    source: Optional[str] = None,
    topic: Optional[str] = None,
):
    papers = get_papers(limit=limit, offset=offset, source=source, topic=topic)
    last_refresh = get_last_refresh_time()
    # Auto-trigger background fetch if DB is empty for this topic (first deploy)
    if not papers and last_refresh is None:
        asyncio.create_task(trigger_refresh(1, topic=topic or "ai"))
    return {
        "papers": papers,
        "total": len(papers),
        "last_refresh": last_refresh.isoformat() if last_refresh else None,
        "is_stale": is_stale(),
    }


@app.get("/papers/{paper_id}")
def get_paper(paper_id: int):
    return get_paper_with_summary(paper_id)


@app.post("/papers/refresh")
async def refresh_papers(req: RefreshRequest, topic: Optional[str] = None):
    progress = get_progress(req.user_id)
    result = await trigger_refresh(progress["current_week"], topic=topic)
    return result


class BookmarkRequest(BaseModel):
    user_id: str

@app.post("/papers/{paper_id}/bookmark")
def add_bookmark(paper_id: int, req: BookmarkRequest):
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO bookmarks (user_id, paper_id) VALUES (?, ?)",
            (req.user_id, paper_id),
        )
    return {"bookmarked": True}

@app.delete("/papers/{paper_id}/bookmark")
def remove_bookmark(paper_id: int, req: BookmarkRequest):
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM bookmarks WHERE user_id = ? AND paper_id = ?",
            (req.user_id, paper_id),
        )
    return {"bookmarked": False}

@app.get("/papers/bookmarks/{user_id}")
def get_user_bookmarks(user_id: str):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT p.* FROM papers p
               JOIN bookmarks b ON p.id = b.paper_id
               WHERE b.user_id = ?
               ORDER BY b.created_at DESC""",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/papers/{paper_id}/related")
async def related_papers(paper_id: int):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT arxiv_id FROM papers WHERE id = ?", (paper_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Paper not found")
    results = await get_related_papers(row["arxiv_id"], api_key=SEMANTIC_SCHOLAR_API_KEY)
    return {"related": results}

@app.get("/papers/{paper_id}/fulltext")
async def paper_fulltext(paper_id: int):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT doi FROM papers WHERE id = ?", (paper_id,)
        ).fetchone()
    if not row or not row["doi"]:
        return {"pdf_url": None, "oa_status": "no_doi"}
    pdf_url = await get_fulltext_url(row["doi"], email=UNPAYWALL_EMAIL)
    return {"pdf_url": pdf_url, "oa_status": "open" if pdf_url else "closed"}


# ── Chat About Paper Endpoint ─────────────────────────────────────────────────

class PaperChatRequest(BaseModel):
    user_id: str
    paper_id: int
    message: str

@app.post("/chat/paper")
async def chat_about_paper(req: PaperChatRequest):
    """Chat endpoint with a specific paper injected into context."""
    progress = get_progress(req.user_id)
    history = get_conversation_history(req.user_id, limit=15)

    paper = get_paper_with_summary(req.paper_id)
    if "error" in paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    paper_context = f"""
[PAPER CONTEXT — student is asking about this paper]
Title: {paper['title']}
Authors: {paper.get('authors', 'Unknown')}
Published: {paper.get('published_date', 'Unknown')}
Source: {paper.get('url', '')}

Summary:
{paper.get('summary', paper.get('abstract', ''))}

Student question: {req.message}
"""

    append_message(req.user_id, "user", req.message)
    system_prompt = build_prompt(progress)
    result = await chat(paper_context, system_prompt, "sonnet", history)

    content = result["content"]
    append_message(req.user_id, "assistant", content, model_tier="sonnet")
    add_xp(req.user_id, 5)

    return {"content": content, "model_tier": "sonnet"}


# ── More Resources Endpoint ───────────────────────────────────────────────────

class MoreResourcesRequest(BaseModel):
    user_id: str
    topic: str       # e.g. "LangGraph Fundamentals"
    current_week: int

@app.post("/topics/more-resources")
async def more_resources(req: MoreResourcesRequest):
    """
    Search Tavily + YouTube for additional resources on a given topic and return
    a ranked list of links with titles and descriptions.
    """
    from chatbot.tools import search_youtube
    from tavily import TavilyClient
    from config import TAVILY_API_KEY

    results: list[dict] = []

    # Tavily web search
    try:
        tc = TavilyClient(api_key=TAVILY_API_KEY)
        query = f"{req.topic} tutorial guide 2024 2025"
        web_resp = await asyncio.get_event_loop().run_in_executor(
            None, lambda: tc.search(query, max_results=5, search_depth="basic")
        )
        for r in web_resp.get("results", []):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": r.get("content", "")[:200],
                "type": "article",
            })
    except Exception as e:
        pass  # Don't fail the whole request if Tavily is unavailable

    # YouTube search
    try:
        yt_raw = await search_youtube(f"{req.topic} tutorial")
        import json as _json
        yt_data = _json.loads(yt_raw)
        if isinstance(yt_data, list):
            for v in yt_data[:4]:
                results.append({
                    "title": v.get("title", ""),
                    "url": v.get("url", v.get("link", "")),
                    "description": v.get("description", ""),
                    "type": "video",
                })
    except Exception:
        pass

    return {"resources": results, "topic": req.topic}


# ── Propose + Confirm Custom Topic Endpoints ──────────────────────────────────

class ProposeTopicRequest(BaseModel):
    user_id: str
    topic_name: str

class ConfirmTopicRequest(BaseModel):
    user_id: str
    topic_name: str
    answers: dict   # {difficulty, reason, insert_after_week}

@app.post("/topics/propose")
async def propose_topic(req: ProposeTopicRequest):
    """
    Ask Claude to produce a brief plan for adding a custom topic,
    plus 3 questions the user must answer before it is added.
    """
    import anthropic as _anthropic_mod
    from config import ANTHROPIC_API_KEY, MODEL_SONNET

    client = _anthropic_mod.Anthropic(api_key=ANTHROPIC_API_KEY)
    progress = get_progress(req.user_id)
    current_week = progress.get("current_week", 1)

    prompt = f"""A student on Week {current_week} of a 12-week AI engineering curriculum
wants to add a custom topic: "{req.topic_name}"

Return ONLY valid JSON (no markdown fences) with this exact structure:
{{
  "plan": "2-3 sentence description of what this topic covers and how it fits the curriculum",
  "subtopics": ["subtopic 1", "subtopic 2", "subtopic 3"],
  "questions": [
    {{
      "id": "difficulty",
      "question": "What's your current level with {req.topic_name}?",
      "type": "choice",
      "options": ["Complete beginner", "Some exposure", "Fairly familiar"]
    }},
    {{
      "id": "reason",
      "question": "Why do you want to add this topic?",
      "type": "text"
    }},
    {{
      "id": "insert_after_week",
      "question": "Where in your curriculum should this fit?",
      "type": "choice",
      "options": {list(f"After Week {w}" for w in range(1, 13))}
    }}
  ]
}}"""

    response = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: client.messages.create(
            model=MODEL_SONNET,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        ),
    )

    import json as _json
    raw = response.content[0].text.strip()
    # Strip markdown fences if model adds them
    raw = raw.strip("`").lstrip("json").strip()
    try:
        data = _json.loads(raw)
    except Exception:
        data = {
            "plan": f"We'll cover {req.topic_name} as a focused module covering core concepts, practical examples, and hands-on exercises.",
            "subtopics": [f"{req.topic_name} fundamentals", "Practical application", "Integration with the curriculum"],
            "questions": [
                {"id": "difficulty", "question": f"What's your current level with {req.topic_name}?",
                 "type": "choice", "options": ["Complete beginner", "Some exposure", "Fairly familiar"]},
                {"id": "reason", "question": "Why do you want to add this topic?", "type": "text"},
                {"id": "insert_after_week", "question": "Where in your curriculum should this fit?",
                 "type": "choice", "options": [f"After Week {w}" for w in range(1, 13)]},
            ],
        }

    return {"topic_name": req.topic_name, **data}


@app.post("/topics/confirm")
async def confirm_topic(req: ConfirmTopicRequest):
    """Save the confirmed custom topic and return the created topic object."""
    # Parse insert_after_week from answer like "After Week 3" → 3
    raw_week = req.answers.get("insert_after_week", "After Week 1")
    try:
        week_num = int(str(raw_week).split()[-1])
    except (ValueError, IndexError):
        week_num = 1

    topic_data = {
        "label": req.topic_name,
        "description": req.answers.get("reason", ""),
        "difficulty": req.answers.get("difficulty", "intermediate"),
        "reason": req.answers.get("reason", ""),
        "insert_after_week": week_num,
        "subtopics": [],
    }
    topic_id = save_custom_topic(req.user_id, topic_data)
    add_xp(req.user_id, 10)
    return {"topic_id": topic_id, "label": req.topic_name, "insert_after_week": week_num, "status": "added"}


@app.get("/topics/custom/{user_id}")
def list_custom_topics(user_id: str):
    return get_custom_topics(user_id)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "db": DB_PATH}


@app.get("/health/keys")
def health_keys():
    """Return which API keys are set (not their values) to help diagnose issues."""
    from config import (
        ANTHROPIC_API_KEY, GOOGLE_API_KEY, YOUTUBE_API_KEY,
        TAVILY_API_KEY, OPENROUTER_API_KEY, HF_TOKEN,
    )
    return {
        "ANTHROPIC_API_KEY": bool(ANTHROPIC_API_KEY),
        "GOOGLE_API_KEY": bool(GOOGLE_API_KEY),
        "YOUTUBE_API_KEY": bool(YOUTUBE_API_KEY),
        "TAVILY_API_KEY": bool(TAVILY_API_KEY),
        "OPENROUTER_API_KEY": bool(OPENROUTER_API_KEY),
        "HF_TOKEN": bool(HF_TOKEN),
    }
