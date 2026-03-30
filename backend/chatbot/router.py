"""
router.py
Hybrid model router for the Teacher Chatbot.

classify_request(message, progress) -> str

Returns one of:
  "haiku"           – Claude Haiku   (fast, cheap, simple queries)
  "gemini_flash"    – Gemini Flash   (curriculum briefings, resource lookups, emotional support)
  "sonnet"          – Claude Sonnet  (default for code, debugging, explanations)
  "sonnet_thinking" – Claude Sonnet + extended thinking (architecture / trade-off questions)

Rules are applied in order; the FIRST match wins.
All string comparisons are case-insensitive.
"""

from __future__ import annotations

# Only stdlib + config imported here (no other chatbot.* imports)
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent.parent  # backend/
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

# config is imported but not used in classify_request itself;
# it is available for callers who want to resolve model IDs from route strings.
import config as config  # noqa: F401 (re-exported for convenience)

# ---------------------------------------------------------------------------
# Keyword lists (all lowercase)
# ---------------------------------------------------------------------------

# Code / error indicators that disqualify simple routing
_CODE_INDICATORS: frozenset[str] = frozenset(["`", "def ", "import ", "error", "traceback"])

# HAIKU triggers (progress / admin queries)
_HAIKU_PHRASES: list[str] = [
    "which week",
    "what week",
    "done with week",
    "finished week",
    "i completed",
    "mark complete",
    "mark week",
    "add xp",
]

# GEMINI_FLASH triggers (curriculum info, emotional support, pacing)
_GEMINI_PHRASES: list[str] = [
    "what is this week",
    "what does week",
    "briefing",
    "what are the videos",
    "what videos",
    "what resources",
    "show me resources",
    "i'm tired",
    "i am tired",
    "feeling stuck",
    "feeling overwhelmed",
    "break this down",
    "smaller pieces",
    "sprint plan",
]

# SONNET_THINKING triggers (architecture / design / trade-off questions)
_THINKING_PHRASES: list[str] = [
    "best way to",
    "should i use",
    "trade-offs",
    "trade offs",
    "architecture",
    "compare",
    "which is better",
    "pros and cons",
]

# Heavy-topic keywords that trigger sonnet_thinking when 3+ appear in a message
_HEAVY_TOPICS: list[str] = [
    "langgraph",
    "chromadb",
    "mcp",
    "langsmith",
    "rag",
    "sqlite",
    "fastapi",
    "embeddings",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _has_code_indicator(message_lower: str) -> bool:
    """Return True if the message contains any code/error indicator."""
    return any(ind in message_lower for ind in _CODE_INDICATORS)


def _contains_any(message_lower: str, phrases: list[str]) -> bool:
    """Return True if message_lower contains at least one phrase from *phrases*."""
    return any(phrase in message_lower for phrase in phrases)


def _count_heavy_topics(message_lower: str) -> int:
    """Count how many heavy-topic keywords appear in *message_lower*."""
    return sum(1 for topic in _HEAVY_TOPICS if topic in message_lower)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def classify_request(message: str, progress: dict) -> str:
    """
    Classify an incoming student message and return the appropriate model route.

    Parameters
    ----------
    message : str
        The raw student message (any case).
    progress : dict
        Student progress record (not currently used in routing logic, but
        available for future rule expansion).

    Returns
    -------
    str
        One of: "haiku", "gemini_flash", "sonnet", "sonnet_thinking"
    """
    msg_lower = message.lower()
    word_count = len(message.split())
    has_code = _has_code_indicator(msg_lower)

    # ------------------------------------------------------------------
    # GEMINI_FLASH phrases checked FIRST — before word-count haiku shortcut
    # so "what videos for week 3?" routes correctly despite being short
    # ------------------------------------------------------------------
    if _contains_any(msg_lower, _GEMINI_PHRASES):
        return "gemini_flash"

    # ------------------------------------------------------------------
    # HAIKU — simple admin / progress queries, very short messages
    # ------------------------------------------------------------------
    # Case 1: Very short message with no code indicators — only pure admin one-liners
    if word_count <= 4 and not has_code:
        return "haiku"

    # Case 2: Progress / admin intent phrases
    if _contains_any(msg_lower, _HAIKU_PHRASES):
        return "haiku"

    # ------------------------------------------------------------------
    # GEMINI_FLASH — short messages without code (fallthrough)
    # ------------------------------------------------------------------

    # Case 2: Short message with no code/error indicators
    if word_count <= 8 and not has_code:
        return "gemini_flash"

    # ------------------------------------------------------------------
    # SONNET_THINKING — architecture, trade-offs, multi-topic design
    # ------------------------------------------------------------------
    # Case 1: Explicit trade-off / architecture phrases
    if _contains_any(msg_lower, _THINKING_PHRASES):
        return "sonnet_thinking"

    # Case 2: Message references 3+ heavy-topic keywords
    if _count_heavy_topics(msg_lower) >= 3:
        return "sonnet_thinking"

    # ------------------------------------------------------------------
    # DEFAULT — Claude Sonnet handles everything else
    # ------------------------------------------------------------------
    return "sonnet"
