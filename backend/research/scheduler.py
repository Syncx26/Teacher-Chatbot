"""
24-hour paper refresh scheduler.
Checks staleness on app startup; also exposes a manual trigger.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from research.fetcher import fetch_all_papers, fetch_all_for_topic, is_stale

_scheduler: AsyncIOScheduler | None = None
_current_week_getter = lambda: 1  # replaced at startup by main.py


def set_week_getter(fn):
    global _current_week_getter
    _current_week_getter = fn


async def refresh_all_topics() -> int:
    """Fetch papers for all 4 topic tabs. Used by the scheduled job."""
    total = 0
    for topic in ["ai", "physics", "tech", "medical"]:
        print(f"[scheduler] Fetching topic: {topic}...")
        added = await fetch_all_for_topic(topic)
        print(f"[scheduler] Topic '{topic}': added {added} papers.")
        total += added
        await asyncio.sleep(5)
    return total


async def _refresh_job():
    week = _current_week_getter()
    print(f"[scheduler] Auto-refreshing all topics (week context: {week})...")
    total = await refresh_all_topics()
    print(f"[scheduler] Refresh complete — {total} new papers total.")


def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(_refresh_job, "interval", hours=24, id="paper_refresh")
    _scheduler.start()
    print("[scheduler] Paper refresh scheduler started (every 24h).")


def stop_scheduler():
    if _scheduler:
        _scheduler.shutdown(wait=False)


async def trigger_refresh(current_week: int, topic: str | None = None) -> dict:
    """Manual refresh trigger — called from API endpoint."""
    if topic:
        print(f"[scheduler] Manual refresh triggered for topic: {topic}...")
        added = await fetch_all_for_topic(topic)
    else:
        print(f"[scheduler] Manual refresh triggered — all topics (week context: {current_week})...")
        added = await refresh_all_topics()
    return {"status": "ok", "papers_added": added}


async def startup_check(current_week: int):
    """Run on app startup — refresh if stale."""
    if is_stale():
        print("[scheduler] Papers are stale — running startup refresh (all topics)...")
        await refresh_all_topics()
    else:
        print("[scheduler] Papers are fresh — skipping startup fetch.")
