"""
claude_client.py
Dispatches chat requests to the correct model based on the tier returned
by the router.

Tier → Provider mapping:
  admin              → Claude Haiku      (Anthropic SDK, no tools)
  free_llama         → Llama 3.3 70B     (OpenRouter, free)
  free_gemma         → Gemma 3 27B       (OpenRouter, free)
  budget_flash_lite  → Gemini Flash Lite (OpenRouter, ~$0.25/M input)
  premium_sonnet     → Claude Sonnet 4.6 (Anthropic SDK, tools + optional thinking)

OpenRouter uses the OpenAI-compatible endpoint; we call it via httpx.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

import anthropic
import google.generativeai as genai
import httpx

from config import (
    ANTHROPIC_API_KEY,
    GOOGLE_API_KEY,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    MODEL_HAIKU,
    MODEL_SONNET,
    MODEL_GEMINI,
    MODEL_LLAMA_FREE,
    MODEL_GEMMA_FREE,
    MODEL_FLASH_LITE,
    MAX_TOKENS,
)
from chatbot.tools import TOOL_DEFINITIONS, dispatch_tool

# ---------------------------------------------------------------------------
# Client initialisation
# ---------------------------------------------------------------------------

_anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
genai.configure(api_key=GOOGLE_API_KEY)


# ---------------------------------------------------------------------------
# Confidence-block parser  (unchanged)
# ---------------------------------------------------------------------------

def _parse_confidence(text: str) -> tuple[str, int | None, str | None]:
    pattern = re.compile(r"<confidence>(.*?)</confidence>", re.DOTALL | re.IGNORECASE)
    match = pattern.search(text)
    if not match:
        return text, None, None

    raw_block = match.group(0)
    inner = match.group(1).strip()

    score: int | None = None
    try:
        parsed = json.loads(inner)
        if isinstance(parsed, dict):
            for key in ("score", "confidence", "confidence_score", "value"):
                if key in parsed:
                    score = int(parsed[key])
                    break
        elif isinstance(parsed, (int, float)):
            score = int(parsed)
    except (json.JSONDecodeError, ValueError, TypeError):
        num_match = re.search(r"\d+", inner)
        if num_match:
            score = int(num_match.group())

    cleaned = pattern.sub("", text).strip()
    return cleaned, score, raw_block


# ---------------------------------------------------------------------------
# OpenRouter helper  (OpenAI-compatible REST call via httpx)
# ---------------------------------------------------------------------------

async def _call_openrouter(model: str, system_prompt: str, messages: list[dict]) -> str:
    """
    Call an OpenRouter model using the OpenAI-compatible chat completions API.
    Falls back to Claude Haiku (Anthropic) if OPENROUTER_API_KEY is not set.
    """
    if not OPENROUTER_API_KEY:
        # Graceful degradation: use Claude Haiku when no OpenRouter key
        return await _run_tool_loop(
            model=MODEL_HAIKU,
            system_prompt=system_prompt,
            messages=messages,
            use_tools=False,
            use_thinking=False,
        )

    payload: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "max_tokens": MAX_TOKENS,
        "temperature": 0.7,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/Syncx26/Teacher-Chatbot",
        "X-Title": "Synapse War Room",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(OPENROUTER_BASE_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Anthropic tool-use loop  (unchanged from original)
# ---------------------------------------------------------------------------

async def _run_tool_loop(
    model: str,
    system_prompt: str,
    messages: list[dict],
    use_tools: bool,
    use_thinking: bool,
) -> str:
    kwargs: dict = {
        "model": model,
        "max_tokens": MAX_TOKENS,
        "system": system_prompt,
        "messages": messages,
    }

    if use_tools:
        kwargs["tools"] = TOOL_DEFINITIONS

    if use_thinking:
        kwargs["betas"] = ["interleaved-thinking-2025-05-14"]
        kwargs["thinking"] = {"type": "enabled", "budget_tokens": 8000}

    response = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: (
            _anthropic.beta.messages.create(**kwargs)
            if use_thinking
            else _anthropic.messages.create(**kwargs)
        ),
    )

    while response.stop_reason == "tool_use":
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
        messages = messages + [{"role": "assistant", "content": response.content}]

        tool_results = []
        for tool_block in tool_use_blocks:
            result_str = await dispatch_tool(tool_block.name, tool_block.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_block.id,
                "content": result_str,
            })

        messages = messages + [{"role": "user", "content": tool_results}]
        kwargs["messages"] = messages

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: (
                _anthropic.beta.messages.create(**kwargs)
                if use_thinking
                else _anthropic.messages.create(**kwargs)
            ),
        )

    text_parts = [block.text for block in response.content if hasattr(block, "text")]
    return "\n".join(text_parts)


# ---------------------------------------------------------------------------
# Public chat function
# ---------------------------------------------------------------------------

async def chat(
    user_message: str,
    system_prompt: str,
    model_tier: str,
    history: list[dict],
) -> dict:
    """
    Route a chat request to the appropriate model and return a standardised dict.

    Args:
        user_message  : latest message from the user
        system_prompt : fully-built system prompt (includes task-type template)
        model_tier    : tier key from router.classify_request()["tier"]
        history       : previous turns as list of {"role", "content"} dicts

    Returns:
        {
            "content":          str,
            "model_tier":       str,
            "confidence_score": int | None,
            "confidence_json":  str | None,
        }
    """
    tier = model_tier.lower()

    # Build conversation messages for OpenRouter / Anthropic
    messages: list[dict] = [
        {"role": t["role"], "content": t["content"]} for t in history
    ]
    messages.append({"role": "user", "content": user_message})

    # ------------------------------------------------------------------
    # FREE TIER — Llama 3.3 70B  (OpenRouter free)
    # ------------------------------------------------------------------
    if tier == "free_llama":
        raw_text = await _call_openrouter(MODEL_LLAMA_FREE, system_prompt, messages)
        cleaned, score, conf_json = _parse_confidence(raw_text)
        return {"content": cleaned, "model_tier": tier,
                "confidence_score": score, "confidence_json": conf_json}

    # ------------------------------------------------------------------
    # FREE TIER — Gemma 3 27B  (OpenRouter free)
    # ------------------------------------------------------------------
    if tier == "free_gemma":
        raw_text = await _call_openrouter(MODEL_GEMMA_FREE, system_prompt, messages)
        cleaned, score, conf_json = _parse_confidence(raw_text)
        return {"content": cleaned, "model_tier": tier,
                "confidence_score": score, "confidence_json": conf_json}

    # ------------------------------------------------------------------
    # BUDGET TIER — Gemini Flash Lite  (OpenRouter)
    # ------------------------------------------------------------------
    if tier == "budget_flash_lite":
        raw_text = await _call_openrouter(MODEL_FLASH_LITE, system_prompt, messages)
        cleaned, score, conf_json = _parse_confidence(raw_text)
        return {"content": cleaned, "model_tier": tier,
                "confidence_score": score, "confidence_json": conf_json}

    # ------------------------------------------------------------------
    # ADMIN — Claude Haiku  (Anthropic, no tools)
    # ------------------------------------------------------------------
    if tier == "admin":
        raw_text = await _run_tool_loop(
            model=MODEL_HAIKU,
            system_prompt=system_prompt,
            messages=messages,
            use_tools=False,
            use_thinking=False,
        )
        cleaned, score, conf_json = _parse_confidence(raw_text)
        return {"content": cleaned, "model_tier": tier,
                "confidence_score": score, "confidence_json": conf_json}

    # ------------------------------------------------------------------
    # PREMIUM — Claude Sonnet 4.6  (Anthropic, tools + optional thinking)
    # ------------------------------------------------------------------
    # Treat "premium_sonnet" and legacy tier names the same
    raw_text = await _run_tool_loop(
        model=MODEL_SONNET,
        system_prompt=system_prompt,
        messages=messages,
        use_tools=True,
        use_thinking=False,
    )
    cleaned, score, conf_json = _parse_confidence(raw_text)
    return {"content": cleaned, "model_tier": "premium_sonnet",
            "confidence_score": score, "confidence_json": conf_json}
