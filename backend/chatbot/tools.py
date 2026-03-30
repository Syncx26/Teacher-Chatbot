import json
import re
import os
from pathlib import Path

import httpx
from bs4 import BeautifulSoup
from googleapiclient.discovery import build
from tavily import TavilyClient

from config import YOUTUBE_API_KEY, TAVILY_API_KEY

DATA_DIR = Path(__file__).parent.parent / "data"


# ---------------------------------------------------------------------------
# Tool 1: get_week_resources
# ---------------------------------------------------------------------------

def get_week_resources(week: int) -> str:
    """Return the video resources for a given course week."""
    try:
        with open(DATA_DIR / "video_resources.json", "r") as f:
            data = json.load(f)
        key = f"week_{week}"
        if key not in data:
            return json.dumps({"error": "No resources for that week"})
        return json.dumps(data[key])
    except FileNotFoundError:
        return json.dumps({"error": "video_resources.json not found"})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ---------------------------------------------------------------------------
# Tool 2: get_topic_briefing
# ---------------------------------------------------------------------------

def get_topic_briefing(week: int) -> str:
    """Return the topic briefing for a given course week."""
    try:
        with open(DATA_DIR / "topic_briefings.json", "r") as f:
            data = json.load(f)
        key = f"week_{week}"
        if key not in data:
            return json.dumps({"error": "No briefing for that week"})
        return json.dumps(data[key])
    except FileNotFoundError:
        return json.dumps({"error": "topic_briefings.json not found"})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ---------------------------------------------------------------------------
# Tool 3: search_youtube  (async)
# ---------------------------------------------------------------------------

async def search_youtube(query: str) -> str:
    """Search YouTube for videos matching the query and return top results."""
    try:
        youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        request = youtube.search().list(
            q=query,
            part="snippet",
            type="video",
            maxResults=3,
            videoDuration="medium",
        )
        response = request.execute()

        results = []
        for item in response.get("items", []):
            video_id = item["id"]["videoId"]
            snippet = item["snippet"]
            results.append({
                "title": snippet.get("title", ""),
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "channel": snippet.get("channelTitle", ""),
                "description": snippet.get("description", ""),
            })
        return json.dumps(results)
    except Exception as e:
        return json.dumps({"error": f"YouTube search failed: {str(e)}"})


# ---------------------------------------------------------------------------
# Tool 4: search_web
# ---------------------------------------------------------------------------

def search_web(query: str, search_depth: str = "basic") -> str:
    """Search the web using Tavily and return relevant results."""
    try:
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(
            query,
            search_depth=search_depth,
            max_results=5,
            include_domains=[
                "docs.anthropic.com",
                "langchain.com",
                "python.org",
                "stackoverflow.com",
                "github.com",
                "pypi.org",
                "arxiv.org",
            ],
        )
        results = []
        for item in response.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
            })
        return json.dumps(results)
    except Exception as e:
        return json.dumps({"error": f"Web search failed: {str(e)}"})


# ---------------------------------------------------------------------------
# Tool 5: read_url  (async)
# ---------------------------------------------------------------------------

ALLOWED_DOMAINS = [
    "docs.anthropic.com",
    "langchain.com",
    "python.org",
    "stackoverflow.com",
    "github.com",
    "pypi.org",
    "arxiv.org",
    "modelcontextprotocol.io",
    "langchain-ai.github.io",
]


async def read_url(url: str, focus: str = "") -> str:
    """Fetch and extract readable text from an allowed URL."""
    # Validate domain
    allowed = any(domain in url for domain in ALLOWED_DOMAINS)
    if not allowed:
        return json.dumps({
            "error": (
                f"Domain not allowed. Permitted domains: {', '.join(ALLOWED_DOMAINS)}"
            )
        })

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=15, follow_redirects=True)
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(separator=" ", strip=True)

        # Truncate to 4000 characters
        if len(text) > 4000:
            text = text[:4000]

        return text
    except Exception as e:
        return json.dumps({"error": f"Failed to read URL: {str(e)}"})


# ---------------------------------------------------------------------------
# Tool definitions (Anthropic format)
# ---------------------------------------------------------------------------

TOOL_DEFINITIONS = [
    {
        "name": "get_week_resources",
        "description": (
            "Retrieve the curated list of video resources for a specific week of the course. "
            "Use this when a student asks about the videos, lectures, or materials for a particular week. "
            "Returns a JSON list of resource objects (title, url, description, etc.)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "week": {
                    "type": "integer",
                    "description": "The course week number (e.g. 1, 2, 3 …).",
                },
            },
            "required": ["week"],
        },
    },
    {
        "name": "get_topic_briefing",
        "description": (
            "Retrieve the topic briefing document for a specific week of the course. "
            "Use this when a student asks for an overview, summary, or context about what is covered in a particular week. "
            "Returns the structured briefing as JSON."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "week": {
                    "type": "integer",
                    "description": "The course week number (e.g. 1, 2, 3 …).",
                },
            },
            "required": ["week"],
        },
    },
    {
        "name": "search_youtube",
        "description": (
            "Search YouTube for educational videos related to a query. "
            "Use this when a student asks for video explanations, tutorials, or demonstrations on a topic "
            "that may not be covered by the course resources, or when they want supplementary video content. "
            "Returns up to 3 videos with title, URL, channel, and description."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to find relevant YouTube videos.",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "search_web",
        "description": (
            "Search the web for up-to-date information on a topic using Tavily. "
            "Use this when a student asks about documentation, libraries, APIs, or current best practices "
            "that may require fresh information beyond training knowledge. "
            "Searches across trusted technical domains (Anthropic docs, LangChain, Python.org, Stack Overflow, GitHub, PyPI, arXiv). "
            "Returns up to 5 results with title, URL, and content snippet."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query.",
                },
                "search_depth": {
                    "type": "string",
                    "enum": ["basic", "advanced"],
                    "description": (
                        "Search depth: 'basic' is faster and suitable for straightforward queries; "
                        "'advanced' performs deeper retrieval for complex or nuanced questions. "
                        "Defaults to 'basic'."
                    ),
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "read_url",
        "description": (
            "Fetch and read the text content of a specific URL from an allowed domain. "
            "Use this when you have a direct URL (e.g. from search results or course materials) and need "
            "to read the full content of that page — for example, reading a documentation page, a GitHub README, "
            "a Stack Overflow answer, or an arXiv abstract. "
            "Allowed domains: docs.anthropic.com, langchain.com, python.org, stackoverflow.com, "
            "github.com, pypi.org, arxiv.org, modelcontextprotocol.io, langchain-ai.github.io. "
            "Returns up to 4000 characters of extracted page text."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The full URL to fetch (must be from an allowed domain).",
                },
                "focus": {
                    "type": "string",
                    "description": (
                        "Optional hint describing what aspect of the page content you are interested in. "
                        "Currently used for context only."
                    ),
                },
            },
            "required": ["url"],
        },
    },
]


# ---------------------------------------------------------------------------
# Tool dispatcher
# ---------------------------------------------------------------------------

async def dispatch_tool(name: str, inputs: dict) -> str:
    """Dispatch a tool call by name and return the result as a string."""
    if name == "get_week_resources":
        return get_week_resources(**inputs)
    elif name == "get_topic_briefing":
        return get_topic_briefing(**inputs)
    elif name == "search_youtube":
        return await search_youtube(**inputs)
    elif name == "search_web":
        return search_web(**inputs)
    elif name == "read_url":
        return await read_url(**inputs)
    else:
        return json.dumps({"error": f"Unknown tool: {name}"})
