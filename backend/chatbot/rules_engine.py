"""
rules_engine.py
Pre- and post-processing rules applied to every chat turn.

pre_check  – injects instructional prefixes based on week gating and wellbeing
post_check – scans the model response for milestone / stuck signals
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Week-gate definitions
# Each entry: (min_week_required, list_of_trigger_substrings, prefix_message)
# The gate fires when current_week < min_week_required AND the input contains
# at least one of the trigger substrings.
# ---------------------------------------------------------------------------

_WEEK_GATES: list[tuple[int, list[str], str]] = [
    (
        5,
        ["rag", "chromadb", "embeddings", "vector"],
        (
            "[Week Gate] RAG, ChromaDB, embeddings, and vector stores are covered "
            "in Week 5. You're currently on Week {week} — let's build the "
            "foundations first so that material makes full sense when we get there. "
            "That said, here's a brief orientation: "
        ),
    ),
    (
        6,
        ["langgraph", "stategraph"],
        (
            "[Week Gate] LangGraph and StateGraph are introduced in Week 6. "
            "You're currently on Week {week} — we'll get there soon! "
            "For now: "
        ),
    ),
    (
        8,
        ["mcp", "fastmcp", "model context protocol"],
        (
            "[Week Gate] MCP (Model Context Protocol) and FastMCP are Week 8 "
            "material. You're on Week {week} right now. "
            "Here's a quick heads-up: "
        ),
    ),
    (
        9,
        ["multi-agent", "subgraph", "multi agent"],
        (
            "[Week Gate] Multi-agent systems and subgraphs are covered in Week 9. "
            "You're on Week {week}. "
            "Quick preview: "
        ),
    ),
]

# ---------------------------------------------------------------------------
# Wellbeing trigger substrings
# ---------------------------------------------------------------------------

_WELLBEING_TRIGGERS: list[str] = [
    "can't sleep",
    "cannot sleep",
    "not sleeping",
    "haven't slept",
    "have not slept",
    "been up",
    "wired all night",
    "exhausted",
    "burned out",
    "burnt out",
    "no sleep",
]

_WELLBEING_PREFIX = (
    "[Wellbeing Check] Before we continue — it sounds like you might be "
    "running on empty. Please take a break, drink some water, and rest if "
    "you can. You're making real progress and the curriculum will still be "
    "here when you're recharged. Whenever you're ready, just say the word "
    "and we'll pick right back up. \U0001f9e1 "
)

# ---------------------------------------------------------------------------
# Milestone language (post_check)
# ---------------------------------------------------------------------------

_MILESTONE_PHRASES: list[str] = [
    "you've completed",
    "you finished",
    "congratulations",
    "well done",
    "milestone achieved",
    "week complete",
]

# ---------------------------------------------------------------------------
# Stuck language (post_check)
# ---------------------------------------------------------------------------

_STUCK_PHRASES: list[str] = [
    "same error",
    "try again",
]

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def pre_check(user_input: str, progress: dict) -> str:
    """
    Inspect *user_input* and optionally prepend a contextual prefix.

    Checks are applied in order; the first matching check wins (only one
    prefix is prepended per message).

    Parameters
    ----------
    user_input : str
        The raw message from the student.
    progress : dict
        Student progress record.  Must contain ``current_week`` (int).

    Returns
    -------
    str
        The original message, possibly with a prefix prepended.
    """
    lower_input = user_input.lower()
    current_week: int = progress.get("current_week", 1)

    # --- Wellbeing check (highest priority) --------------------------------
    for trigger in _WELLBEING_TRIGGERS:
        if trigger in lower_input:
            return _WELLBEING_PREFIX + user_input

    # --- Week gates ---------------------------------------------------------
    for min_week, triggers, prefix_template in _WEEK_GATES:
        if current_week < min_week:
            for trigger in triggers:
                if trigger in lower_input:
                    prefix = prefix_template.format(week=current_week)
                    return prefix + user_input

    return user_input


def post_check(response: str, progress: dict) -> dict:
    """
    Scan the model *response* for milestone or stuck signals.

    Parameters
    ----------
    response : str
        The full text response returned by the model.
    progress : dict
        Student progress record.  Must contain ``current_week`` (int).

    Returns
    -------
    dict
        One of:
          {"suggest_advance": True,  "week": <current_week>}  – milestone detected
          {"suggest_break":   True}                           – stuck loop detected
          {}                                                  – nothing detected

        Milestone detection takes precedence over stuck detection.
    """
    lower_response = response.lower()
    current_week: int = progress.get("current_week", 1)

    # --- Milestone detection ------------------------------------------------
    for phrase in _MILESTONE_PHRASES:
        if phrase in lower_response:
            return {"suggest_advance": True, "week": current_week}

    # --- Stuck detection ----------------------------------------------------
    for phrase in _STUCK_PHRASES:
        if phrase in lower_response:
            return {"suggest_break": True}

    return {}
