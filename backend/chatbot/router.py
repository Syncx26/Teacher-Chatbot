"""
router.py
Educational Router — classifies queries by task type and complexity,
then selects the most cost-effective model tier.

Design spec: Educational Router: Foundational Knowledge + Teaching Efficiency Plan
  TIER 1 FOUNDATIONAL     (40%) → free_llama  / free_gemma
  TIER 2 STRUCTURED       (35%) → budget_flash_lite
  TIER 3 REASONING        (15%) → premium_sonnet  (or budget when complexity ≤ 6)
  TIER 4 META_LEARNING    (10%) → premium_sonnet  (or budget_flash_lite)

classify_request(message, progress) -> RouteDecision dict:
  {
    "tier":       str   — model tier key
    "task_type":  str   — FOUNDATIONAL | STRUCTURED_LEARNING | REASONING | META_LEARNING
    "complexity": int   — 1-10
  }
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Task-type keyword lists  (all lowercase)
# ---------------------------------------------------------------------------

# FOUNDATIONAL — "What is X?", "Define X", "Explain X", "How does X work?"
_FOUNDATIONAL_PHRASES: list[str] = [
    "what is ", "what are ", "what's a ", "what's an ",
    "define ", "definition of", "meaning of", "what does ",
    "explain ", "how does ", "how do ", "describe ",
    "tell me about", "give me an overview", "what kind of",
    "who invented", "when was", "where does",
]

# STRUCTURED LEARNING — guides, plans, comparisons, walkthroughs
_STRUCTURED_PHRASES: list[str] = [
    "how do i ", "how to ", "step by step", "steps to",
    "walk me through", "guide me", "teach me", "show me how",
    "create a plan", "study plan", "compare ", "comparison",
    "difference between", "vs ", "versus ",
    "break it down", "break down", "break this down",
    "sprint plan", "smaller pieces",
    "tutorial", "examples of", "give me examples",
]

# REASONING & SYNTHESIS — analysis, trade-offs, architecture, deep why
_REASONING_PHRASES: list[str] = [
    "why does", "why is ", "why do ", "why should",
    "analyze", "analyse", "analysis of",
    "synthesize", "synthesis", "integrate ", "integration of",
    "trade-off", "trade off", "tradeoff",
    "architecture", "best way to", "should i use",
    "which is better", "pros and cons", "pros/cons",
    "compare and contrast", "relationship between",
    "implications of", "impact of", "consequence",
    "design decision", "when would you", "in what situation",
]

# META-LEARNING — study habits, learning paths, self-assessment, personalization
_META_PHRASES: list[str] = [
    "learning path", "how should i learn", "am i ready",
    "i'm struggling", "i am struggling", "i struggle with",
    "help me understand", "i don't understand", "i dont understand",
    "feedback on my", "assess my", "test my", "quiz me",
    "personalized", "adapt to", "adapt for",
    "study technique", "how do i study", "memory technique",
    "how do i remember", "i keep forgetting",
]

# Heavy topics that raise complexity score
_HEAVY_TOPICS: frozenset[str] = frozenset([
    "langgraph", "chromadb", "mcp", "langsmith", "rag",
    "sqlite", "fastapi", "embeddings", "transformer",
    "attention mechanism", "backpropagation", "gradient",
    "vector database", "retrieval", "fine-tuning", "finetuning",
    "reinforcement learning", "reward model", "rlhf",
    "multimodal", "tokenizer", "context window",
])

# Admin / progress queries that should go straight to haiku (cheap)
_ADMIN_PHRASES: list[str] = [
    "which week am i", "what week am i", "done with week",
    "finished week", "i completed", "mark complete",
    "mark week", "add xp", "my progress", "show progress",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _contains_any(text: str, phrases: list[str]) -> bool:
    return any(p in text for p in phrases)


def _count_heavy_topics(text: str) -> int:
    return sum(1 for t in _HEAVY_TOPICS if t in text)


def _score_complexity(message: str, msg_lower: str) -> int:
    """
    Return an integer complexity score 1-10.

    Factors:
      - Word count (proxy for question depth)
      - Number of heavy technical topics mentioned
      - Presence of high-complexity signal words
      - Multi-part question indicators
    """
    words = message.split()
    wc = len(words)

    # Base score from word count
    if wc <= 5:
        base = 1
    elif wc <= 10:
        base = 2
    elif wc <= 20:
        base = 3
    elif wc <= 35:
        base = 4
    elif wc <= 55:
        base = 5
    else:
        base = 6

    # Heavy topic bonus
    heavy_count = _count_heavy_topics(msg_lower)
    topic_bonus = min(heavy_count, 3)

    # Signal word bonus
    signal_bonus = 0
    high_signal = ["why", "analyze", "synthesize", "integrate", "compare",
                   "architecture", "trade-off", "implications"]
    if any(w in msg_lower for w in high_signal):
        signal_bonus = 1

    # Multi-part question bonus
    multi_bonus = 0
    if any(p in msg_lower for p in [" and also", " additionally", " furthermore",
                                     ". also", "? and", "as well as"]):
        multi_bonus = 1

    # Code / error context raises stakes
    code_bonus = 0
    if any(ind in message for ind in ["`", "def ", "import ", "error:", "traceback"]):
        code_bonus = 1

    return min(base + topic_bonus + signal_bonus + multi_bonus + code_bonus, 10)


def _classify_task_type(msg_lower: str) -> str:
    """Return the task type string for a given lowercased message."""
    # META-LEARNING checked first — these are very specific phrases
    if _contains_any(msg_lower, _META_PHRASES):
        return "META_LEARNING"

    # REASONING — explicit analytical/architectural intent
    if _contains_any(msg_lower, _REASONING_PHRASES):
        return "REASONING"

    # STRUCTURED LEARNING — guides, comparisons, plans
    if _contains_any(msg_lower, _STRUCTURED_PHRASES):
        return "STRUCTURED_LEARNING"

    # FOUNDATIONAL — default for concept questions
    if _contains_any(msg_lower, _FOUNDATIONAL_PHRASES):
        return "FOUNDATIONAL"

    # Fallback: let complexity decide in classify_request
    return "STRUCTURED_LEARNING"


def _select_tier(task_type: str, complexity: int) -> str:
    """
    Map task_type + complexity to a model tier.

    Tier keys  →  handled by claude_client.py:
      "admin"            → Claude Haiku        (progress/admin only)
      "free_llama"       → Llama 3.3 70B free  (OpenRouter)
      "free_gemma"       → Gemma 3 27B free    (OpenRouter)
      "budget_flash_lite"→ Gemini Flash Lite    (OpenRouter)
      "premium_sonnet"   → Claude Sonnet 4.6   (Anthropic)
    """
    if task_type == "FOUNDATIONAL":
        if complexity <= 3:
            return "free_llama"         # simple definitions
        elif complexity <= 6:
            return "free_llama"         # slightly harder but still foundational
        else:
            return "budget_flash_lite"  # complex foundational (rare)

    elif task_type == "STRUCTURED_LEARNING":
        if complexity <= 4:
            return "free_llama"         # simple how-to
        elif complexity <= 7:
            return "budget_flash_lite"  # structured guides, comparisons
        else:
            return "premium_sonnet"     # very complex structured task

    elif task_type == "REASONING":
        if complexity <= 5:
            return "budget_flash_lite"  # lighter reasoning
        elif complexity <= 7:
            return "budget_flash_lite"  # moderate reasoning
        else:
            return "premium_sonnet"     # deep synthesis / architecture

    elif task_type == "META_LEARNING":
        if complexity <= 5:
            return "budget_flash_lite"
        else:
            return "premium_sonnet"     # personalized, nuanced learning plans

    return "free_llama"                 # safe default


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_request(message: str, progress: dict) -> dict:
    """
    Classify an incoming student message and return a routing decision.

    Parameters
    ----------
    message  : str  — raw student message (any case)
    progress : dict — student progress record (reserved for future use)

    Returns
    -------
    dict with keys:
      tier       : str  — model tier key for claude_client.py
      task_type  : str  — FOUNDATIONAL | STRUCTURED_LEARNING | REASONING | META_LEARNING
      complexity : int  — 1-10
    """
    msg_lower = message.lower().strip()

    # Admin / progress queries → haiku (cheapest, no teaching template needed)
    if _contains_any(msg_lower, _ADMIN_PHRASES):
        return {"tier": "admin", "task_type": "ADMIN", "complexity": 1}

    complexity = _score_complexity(message, msg_lower)
    task_type = _classify_task_type(msg_lower)

    # Very high complexity always escalates to premium regardless of task type
    if complexity >= 9:
        tier = "premium_sonnet"
    else:
        tier = _select_tier(task_type, complexity)

    return {
        "tier": tier,
        "task_type": task_type,
        "complexity": complexity,
    }
