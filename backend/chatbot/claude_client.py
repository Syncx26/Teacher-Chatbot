import asyncio
import json
import re

import anthropic
import google.generativeai as genai

from config import (
    ANTHROPIC_API_KEY,
    GOOGLE_API_KEY,
    MODEL_HAIKU,
    MODEL_SONNET,
    MODEL_GEMINI,
    MAX_TOKENS,
)
from chatbot.tools import TOOL_DEFINITIONS, dispatch_tool

# ---------------------------------------------------------------------------
# Module-level client initialisation
# ---------------------------------------------------------------------------

_anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
genai.configure(api_key=GOOGLE_API_KEY)


# ---------------------------------------------------------------------------
# Confidence-block parser
# ---------------------------------------------------------------------------

def _parse_confidence(text: str) -> tuple[str, int | None, str | None]:
    """
    Extract an optional <confidence>...</confidence> block from text.

    Returns:
        (cleaned_text, score_int_or_None, raw_json_block_or_None)
    """
    pattern = re.compile(r"<confidence>(.*?)</confidence>", re.DOTALL | re.IGNORECASE)
    match = pattern.search(text)
    if not match:
        return text, None, None

    raw_block = match.group(0)          # full <confidence>…</confidence>
    inner = match.group(1).strip()      # content inside the tags

    # Try to parse inner as JSON to extract a numeric score
    score: int | None = None
    try:
        parsed = json.loads(inner)
        if isinstance(parsed, dict):
            # Accept common key names
            for key in ("score", "confidence", "confidence_score", "value"):
                if key in parsed:
                    score = int(parsed[key])
                    break
        elif isinstance(parsed, (int, float)):
            score = int(parsed)
    except (json.JSONDecodeError, ValueError, TypeError):
        # Fall back: look for any integer in the inner text
        num_match = re.search(r"\d+", inner)
        if num_match:
            score = int(num_match.group())

    # Strip the block from the returned content
    cleaned = pattern.sub("", text).strip()
    return cleaned, score, raw_block


# ---------------------------------------------------------------------------
# Anthropic tool-use loop helper
# ---------------------------------------------------------------------------

async def _run_tool_loop(
    model: str,
    system_prompt: str,
    messages: list[dict],
    use_tools: bool,
    use_thinking: bool,
) -> str:
    """
    Call the Anthropic API, handle tool-use turns, and return the final
    assistant text content.
    """
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

    # Run the (synchronous) Anthropic SDK call in a thread so it doesn't
    # block the event loop.
    response = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: (
            _anthropic.beta.messages.create(**kwargs)
            if use_thinking
            else _anthropic.messages.create(**kwargs)
        ),
    )

    # Tool-use dispatch loop
    while response.stop_reason == "tool_use":
        # Collect all tool_use blocks from the response
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        # Append the assistant turn with all its content blocks
        messages = messages + [{"role": "assistant", "content": response.content}]

        # Build tool_result content for every tool call
        tool_results = []
        for tool_block in tool_use_blocks:
            result_str = await dispatch_tool(tool_block.name, tool_block.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_block.id,
                "content": result_str,
            })

        # Append a single user message with all tool results
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

    # Extract final text content from the response
    text_parts = []
    for block in response.content:
        if hasattr(block, "text"):
            text_parts.append(block.text)
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
    Route a chat request to the appropriate model tier and return a
    standardised response dict.

    Args:
        user_message:  The latest message from the user.
        system_prompt: The system prompt to use for this conversation.
        model_tier:    One of "haiku", "sonnet", or "gemini_flash".
        history:       Previous conversation turns as a list of
                       {"role": "user"|"assistant", "content": str} dicts.

    Returns:
        {
            "content": str,
            "model_tier": str,
            "confidence_score": int | None,
            "confidence_json": str | None,
        }
    """
    tier = model_tier.lower()

    # ------------------------------------------------------------------
    # Gemini Flash path
    # ------------------------------------------------------------------
    if tier == "gemini_flash":
        gemini_model = genai.GenerativeModel(MODEL_GEMINI)
        prompt = f"{system_prompt}\n\nUser: {user_message}"
        gemini_response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: gemini_model.generate_content(prompt),
        )
        raw_text = gemini_response.text
        cleaned, score, conf_json = _parse_confidence(raw_text)
        return {
            "content": cleaned,
            "model_tier": tier,
            "confidence_score": score,
            "confidence_json": conf_json,
        }

    # ------------------------------------------------------------------
    # Anthropic paths (haiku / sonnet / sonnet_thinking)
    # ------------------------------------------------------------------

    # Build messages list from history + new user message
    messages: list[dict] = []
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})

    if tier == "haiku":
        model = MODEL_HAIKU
        use_tools = False
        use_thinking = False
    elif tier == "sonnet":
        model = MODEL_SONNET
        use_tools = True
        use_thinking = False
    elif tier in ("sonnet_thinking", "sonnet-thinking"):
        model = MODEL_SONNET
        use_tools = True
        use_thinking = True
    else:
        # Default fallback: treat unknown tiers as haiku (safe, cheap)
        model = MODEL_HAIKU
        use_tools = False
        use_thinking = False

    raw_text = await _run_tool_loop(
        model=model,
        system_prompt=system_prompt,
        messages=messages,
        use_tools=use_tools,
        use_thinking=use_thinking,
    )

    cleaned, score, conf_json = _parse_confidence(raw_text)
    return {
        "content": cleaned,
        "model_tier": tier,
        "confidence_score": score,
        "confidence_json": conf_json,
    }
