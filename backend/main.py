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
from db.schema import init_db
from db.progress import (
    get_progress, set_current_week, mark_milestone_complete,
    get_conversation_history, append_message, add_xp, save_sprint_goal
)
from chatbot.system_prompt import build_prompt
from chatbot.rules_engine import pre_check, post_check
from chatbot.router import classify_request
from chatbot.claude_client import chat
from chatbot.prerequisite import get_prerequisite_chain, get_all_topics_with_state
from research.fetcher import get_papers, get_last_refresh_time, is_stale
from research.summarizer import get_paper_with_summary
from research.scheduler import start_scheduler, stop_scheduler, trigger_refresh, startup_check


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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

    # Build fresh system prompt with live progress + task-specific teaching mode
    system_prompt = build_prompt(progress, task_type=task_type)

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

    return ChatResponse(
        content=content,
        model_tier=tier,
        confidence_score=conf_score,
        post_check=pc,
    )


@app.get("/chat/history/{user_id}")
def get_history(user_id: str, limit: int = 20):
    return get_conversation_history(user_id, limit)


# ── Research Paper Endpoints ──────────────────────────────────────────────────

@app.get("/papers")
def list_papers_endpoint(
    limit: int = 20,
    offset: int = 0,
    source: Optional[str] = None,
):
    papers = get_papers(limit=limit, offset=offset, source=source)
    last_refresh = get_last_refresh_time()
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
async def refresh_papers(req: RefreshRequest):
    progress = get_progress(req.user_id)
    result = await trigger_refresh(progress["current_week"])
    return result


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


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "db": DB_PATH}
