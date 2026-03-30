"""
24-hour paper refresh scheduler.
Checks staleness on app startup; also exposes a manual trigger.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from research.fetcher import fetch_all_papers, is_stale

_scheduler: AsyncIOScheduler | None = None
_current_week_getter = lambda: 1  # replaced at startup by main.py


def set_week_getter(fn):
    global _current_week_getter
    _current_week_getter = fn


async def _refresh_job():
    week = _current_week_getter()
    print(f"[scheduler] Auto-refreshing papers for week {week}...")
    added = await fetch_all_papers(week)
    print(f"[scheduler] Added {added} new papers.")


def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(_refresh_job, "interval", hours=24, id="paper_refresh")
    _scheduler.start()
    print("[scheduler] Paper refresh scheduler started (every 24h).")


def stop_scheduler():
    if _scheduler:
        _scheduler.shutdown(wait=False)


async def trigger_refresh(current_week: int) -> dict:
    """Manual refresh trigger — called from API endpoint."""
    print(f"[scheduler] Manual refresh triggered for week {current_week}...")
    added = await fetch_all_papers(current_week)
    return {"status": "ok", "papers_added": added}


async def startup_check(current_week: int):
    """Run on app startup — refresh if stale."""
    if is_stale():
        print("[scheduler] Papers are stale — running startup refresh...")
        await fetch_all_papers(current_week)
    else:
        print("[scheduler] Papers are fresh — skipping startup fetch.")
