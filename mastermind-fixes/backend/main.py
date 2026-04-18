"""
Mastermind FastAPI entry point.
All routers are registered here. DB is initialised on startup.
APScheduler runs daily reminder + weekly digest jobs.
"""
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import FRONTEND_URL
from db.helpers import init_db, get_db
from db.schema import User
from routers import (
    curriculum, cards, chat, checkpoints, onboarding, sessions,
    explore, push, transcribe, users, ingest, email, export,
)
from routers.push import send_push_to_user
from routers.email import send_digest_for_user

app = FastAPI(title="Mastermind API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(onboarding.router,   prefix="/onboarding",   tags=["onboarding"])
app.include_router(curriculum.router,   prefix="/curriculum",   tags=["curriculum"])
app.include_router(sessions.router,     prefix="/sessions",     tags=["sessions"])
app.include_router(cards.router,        prefix="/cards",        tags=["cards"])
app.include_router(chat.router,         prefix="/chat",         tags=["chat"])
app.include_router(checkpoints.router,  prefix="/checkpoints",  tags=["checkpoints"])
app.include_router(explore.router,      prefix="/explore",      tags=["explore"])
app.include_router(push.router,         prefix="/push",         tags=["push"])
app.include_router(transcribe.router,   prefix="/transcribe",   tags=["transcribe"])
app.include_router(users.router,        prefix="/users",        tags=["users"])
app.include_router(ingest.router,       prefix="/ingest",       tags=["ingest"])
app.include_router(email.router,        prefix="/email",        tags=["email"])
app.include_router(export.router,       prefix="/export",       tags=["export"])


def _hourly_job():
    """Runs every hour — sends daily reminders + weekly digests when time matches."""
    now = datetime.utcnow()
    current_hour = now.hour
    current_weekday = now.weekday()  # 0=Mon … 6=Sun

    with get_db() as db:
        # Daily push reminders
        push_users = db.query(User).filter(
            User.push_enabled == True,  # noqa: E712
            User.push_hour == current_hour,
        ).all()
        push_user_ids = [u.id for u in push_users]

        # Weekly digest — runs once per week on user's chosen day + hour
        digest_users = db.query(User).filter(
            User.digest_enabled == True,  # noqa: E712
            User.digest_day == current_weekday,
            User.digest_hour == current_hour,
        ).all()
        digest_user_ids = [u.id for u in digest_users]

    for user_id in push_user_ids:
        try:
            send_push_to_user(
                user_id,
                "Time to study 🧠",
                "Your daily Mastermind session is ready.",
            )
        except Exception as e:
            print(f"Push error for {user_id}: {e}")

    for user_id in digest_user_ids:
        try:
            send_digest_for_user(user_id)
        except Exception as e:
            print(f"Digest error for {user_id}: {e}")


@app.on_event("startup")
async def startup():
    init_db()

    # Start background scheduler — runs hourly to dispatch push + digest
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler()
        scheduler.add_job(_hourly_job, "cron", minute=0)
        scheduler.start()
        app.state.scheduler = scheduler
    except ImportError:
        print("apscheduler not installed — push/digest scheduling disabled")


@app.get("/health")
def health():
    return {"status": "ok"}
