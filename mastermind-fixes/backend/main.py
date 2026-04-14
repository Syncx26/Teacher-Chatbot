"""
Mastermind FastAPI entry point.
All routers are registered here. DB is initialised on startup.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import FRONTEND_URL
from db.helpers import init_db
from routers import curriculum, cards, chat, checkpoints, onboarding, sessions, explore, push, transcribe, users

app = FastAPI(title="Mastermind API", version="1.0.0")

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


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
