"""
Model routing table for Mastermind.
Each task is explicitly mapped to the correct model.
No model is chosen at runtime based on availability — always be explicit.
"""
import anthropic
import openai
import groq as groq_sdk
from config import (
    ANTHROPIC_API_KEY, OPENAI_API_KEY, GROQ_API_KEY,
)

# ---------------------------------------------------------------------------
# Clients (lazy-initialised to avoid import-time errors if keys not set)
# ---------------------------------------------------------------------------
_anthropic: anthropic.Anthropic | None = None
_openai: openai.OpenAI | None = None
_groq: groq_sdk.Groq | None = None


def _get_anthropic() -> anthropic.Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _anthropic


def _get_openai() -> openai.OpenAI:
    global _openai
    if _openai is None:
        _openai = openai.OpenAI(api_key=OPENAI_API_KEY)
    return _openai


def _get_groq() -> groq_sdk.Groq:
    global _groq
    if _groq is None:
        _groq = groq_sdk.Groq(api_key=GROQ_API_KEY)
    return _groq


# ---------------------------------------------------------------------------
# Routing table
# ---------------------------------------------------------------------------
# task_name → {model_id, client_fn, notes}
TASK_ROUTES: dict[str, dict] = {
    # Strategic — Opus only
    "curriculum_build":     {"model": "claude-opus-4-7",         "client": "anthropic"},
    "onboarding_dialogue":  {"model": "claude-opus-4-7",         "client": "anthropic"},
    "curriculum_restructure": {"model": "claude-opus-4-7",       "client": "anthropic"},

    # Primary teaching — Sonnet
    "card_teach":           {"model": "claude-sonnet-4-6",       "client": "anthropic"},
    "remediation":          {"model": "claude-sonnet-4-6",       "client": "anthropic"},
    "explore_cards":        {"model": "claude-sonnet-4-6",       "client": "anthropic"},
    "ask_nova":             {"model": "claude-sonnet-4-6",       "client": "anthropic"},

    # Grading — o3 (extended reasoning, high accuracy)
    "checkpoint_grade":     {"model": "o3",                      "client": "openai"},

    # High-volume / low-stakes
    "spaced_review":        {"model": "mistral-large-latest",    "client": "mistral"},
    "memory_extract":       {"model": "claude-haiku-4-5-20251001", "client": "anthropic"},

    # Background / ultra-fast
    "sentiment_check":      {"model": "llama-3.3-70b-versatile", "client": "groq"},
}


# ---------------------------------------------------------------------------
# Streaming helpers
# ---------------------------------------------------------------------------
def stream_anthropic(task: str, system: str, messages: list[dict], max_tokens: int = 1024):
    """Yield text chunks from an Anthropic streaming call."""
    route = TASK_ROUTES[task]
    assert route["client"] == "anthropic", f"Task {task} is not an Anthropic task"
    client = _get_anthropic()
    with client.messages.stream(
        model=route["model"],
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text


# Alias used by onboarding router
stream_opus = lambda system, messages, max_tokens=2048: stream_anthropic(
    "curriculum_build", system, messages, max_tokens
)


def call_openai(task: str, messages: list[dict]) -> str:
    """Blocking call for o3 grading (extended reasoning)."""
    route = TASK_ROUTES[task]
    assert route["client"] == "openai", f"Task {task} is not an OpenAI task"
    client = _get_openai()
    resp = client.chat.completions.create(
        model=route["model"],
        messages=messages,
    )
    return resp.choices[0].message.content or ""


def call_groq(task: str, messages: list[dict]) -> str:
    """Blocking call for fast Groq inference (sentiment, background)."""
    route = TASK_ROUTES[task]
    assert route["client"] == "groq", f"Task {task} is not a Groq task"
    client = _get_groq()
    resp = client.chat.completions.create(
        model=route["model"],
        messages=messages,
        max_tokens=256,
    )
    return resp.choices[0].message.content or ""
