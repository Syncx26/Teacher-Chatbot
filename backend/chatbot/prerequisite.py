"""
prerequisite.py
Prerequisite chain resolution and topic state helpers for the Teacher Chatbot.

Public API
----------
get_prerequisite_chain(topic_id, current_week) -> dict
    DFS traversal of the prerequisite graph for the given topic.
    Returns completed prerequisites, remaining prerequisites, distance to topic,
    and whether the topic is in scope for the student's current week.

get_all_topics_with_state(current_week) -> list[dict]
    Returns every topic in the map with an added "state" field:
      "completed" | "current" | "locked"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure the backend package root is on sys.path so relative imports work
# when this module is executed standalone (e.g. during testing).
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent.parent  # backend/
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

# ---------------------------------------------------------------------------
# Topic map – cached at module level so the JSON file is read only once.
# ---------------------------------------------------------------------------

_TOPIC_MAP_PATH = Path(__file__).resolve().parent.parent / "data" / "topic_map.json"


def _load_topic_map() -> dict:
    """Load topic_map.json and return the parsed dict."""
    if not _TOPIC_MAP_PATH.exists():
        return {"topics": []}
    with _TOPIC_MAP_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


# Module-level cache: raw map and a lookup dict keyed by topic_id.
_RAW_MAP: dict = _load_topic_map()

_TOPICS_BY_ID: dict[str, dict] = {
    topic["topic_id"]: topic for topic in _RAW_MAP.get("topics", [])
}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _dfs_prerequisites(
    topic_id: str,
    visited: set[str] | None = None,
) -> list[str]:
    """
    Return an ordered list of all (transitive) prerequisite topic_ids for
    *topic_id* using a depth-first traversal.

    The list is ordered so that deeper dependencies appear first (i.e. you
    can satisfy them in list order and the final topic will be unblocked).
    *topic_id* itself is NOT included in the returned list.
    """
    if visited is None:
        visited = set()

    topic = _TOPICS_BY_ID.get(topic_id)
    if topic is None:
        return []

    result: list[str] = []
    for prereq_id in topic.get("prerequisites", []):
        if prereq_id in visited:
            continue
        visited.add(prereq_id)
        # Recurse first so deeper deps come first
        result.extend(_dfs_prerequisites(prereq_id, visited))
        result.append(prereq_id)

    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_prerequisite_chain(topic_id: str, current_week: int) -> dict:
    """
    Resolve the full prerequisite chain for *topic_id* relative to the
    student's *current_week*.

    Parameters
    ----------
    topic_id : str
        The ``topic_id`` field from topic_map.json (e.g. "rag_concept").
    current_week : int
        The student's current week number.

    Returns
    -------
    dict with keys:
        topic       : dict  – the topic record (or {} if not found)
        completed   : list  – prerequisite topic dicts already done
                              (topic.week <= current_week)
        remaining   : list  – prerequisite topic dicts not yet done
                              (topic.week > current_week)
        weeks_away  : int   – topic.week - current_week (0 if in scope)
        in_scope    : bool  – topic.week <= current_week
    """
    topic = _TOPICS_BY_ID.get(topic_id, {})

    if not topic:
        return {
            "topic": {},
            "completed": [],
            "remaining": [],
            "weeks_away": 0,
            "in_scope": False,
        }

    # Collect all transitive prerequisites via DFS
    prereq_ids = _dfs_prerequisites(topic_id)

    completed: list[dict] = []
    remaining: list[dict] = []

    for pid in prereq_ids:
        prereq_topic = _TOPICS_BY_ID.get(pid)
        if prereq_topic is None:
            continue
        if prereq_topic.get("week", 0) <= current_week:
            completed.append(prereq_topic)
        else:
            remaining.append(prereq_topic)

    topic_week: int = topic.get("week", 0)
    in_scope: bool = topic_week <= current_week
    weeks_away: int = max(0, topic_week - current_week)

    return {
        "topic": topic,
        "completed": completed,
        "remaining": remaining,
        "weeks_away": weeks_away,
        "in_scope": in_scope,
    }


def get_all_topics_with_state(current_week: int) -> list[dict]:
    """
    Return every topic in the topic map with an added ``state`` field.

    State values:
        "completed" – topic.week <  current_week  (the student has passed it)
        "current"   – topic.week == current_week  (active week)
        "locked"    – topic.week >  current_week  (not yet reached)

    Parameters
    ----------
    current_week : int
        The student's current week number.

    Returns
    -------
    list[dict]
        A copy of each topic dict from the map with ``state`` added.
        Order matches the order in topic_map.json.
    """
    result: list[dict] = []
    for topic in _RAW_MAP.get("topics", []):
        topic_copy = dict(topic)
        week: int = topic.get("week", 0)
        if week < current_week:
            topic_copy["state"] = "completed"
        elif week == current_week:
            topic_copy["state"] = "current"
        else:
            topic_copy["state"] = "locked"
        result.append(topic_copy)
    return result
