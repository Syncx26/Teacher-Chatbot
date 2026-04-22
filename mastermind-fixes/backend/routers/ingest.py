"""
URL/YouTube ingestion — extracts text from a URL for curriculum grounding.
YouTube: fetches transcript via youtube-transcript-api (no API key needed).
Webpages: tries direct scrape first, falls back to Jina Reader for JS-rendered pages.
"""
import os
import re
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import verify_token

router = APIRouter()

# Jina Reader — free JS-rendering proxy. Optional API key for higher rate limits.
JINA_API_KEY = os.getenv("JINA_API_KEY", "")
THIN_CONTENT_WORD_THRESHOLD = 300  # below this, assume JS-rendered or broken
AUTH_WALL_MARKERS = ("sign in", "log in", "create account", "subscribe to continue",
                     "please login", "members only", "verify you are human")


class IngestBody(BaseModel):
    url: str


def _is_youtube(url: str) -> bool:
    return bool(re.search(r"(youtube\.com/watch|youtu\.be/)", url))


def _youtube_id(url: str) -> str | None:
    m = re.search(r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})", url)
    return m.group(1) if m else None


def _fetch_youtube(url: str) -> str:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        raise HTTPException(status_code=501, detail="youtube-transcript-api not installed")

    vid = _youtube_id(url)
    if not vid:
        raise HTTPException(status_code=400, detail="Could not extract YouTube video ID")

    try:
        transcript = YouTubeTranscriptApi.get_transcript(vid)
        text = " ".join(seg["text"] for seg in transcript)
        return text[:40000]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Transcript unavailable: {e}")


def _fetch_direct(url: str) -> str:
    """Fast path: direct HTML scrape + tag strip. Works for server-rendered pages."""
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=10,
                         headers={"User-Agent": "Mastermind/1.0 (educational content extraction)"})
        resp.raise_for_status()
    except httpx.HTTPError:
        return ""

    html = resp.text

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
    except ImportError:
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()

    return text[:40000]


def _fetch_jina(url: str) -> str:
    """Fallback: Jina Reader (r.jina.ai) runs a real browser, returns markdown."""
    jina_url = f"https://r.jina.ai/{url}"
    headers = {"User-Agent": "Mastermind/1.0", "Accept": "text/plain"}
    if JINA_API_KEY:
        headers["Authorization"] = f"Bearer {JINA_API_KEY}"

    try:
        resp = httpx.get(jina_url, follow_redirects=True, timeout=30, headers=headers)
        resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=422, detail=f"Could not fetch URL: {e}")

    return resp.text[:40000]


def _detect_auth_wall(text: str) -> bool:
    """Heuristic: does the content look like a login/paywall page?"""
    lowered = text[:2000].lower()
    hits = sum(marker in lowered for marker in AUTH_WALL_MARKERS)
    return hits >= 2


@router.post("/url")
def ingest_url(body: IngestBody, claims: dict = Depends(verify_token)):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    if _is_youtube(url):
        text = _fetch_youtube(url)
        source_type = "youtube_transcript"
        used_fallback = False
    else:
        text = _fetch_direct(url)
        word_count = len(text.split()) if text else 0
        used_fallback = False
        if word_count < THIN_CONTENT_WORD_THRESHOLD:
            # Likely JS-rendered or blocked — try Jina Reader
            text = _fetch_jina(url)
            used_fallback = True
        source_type = "webpage"

    word_count = len(text.split())
    if word_count < 100:
        raise HTTPException(
            status_code=422,
            detail="Could not extract enough content from this URL. The page may require login, be JavaScript-heavy, or block scrapers.",
        )

    return {
        "text": text,
        "source_type": source_type,
        "word_count": word_count,
        "used_fallback": used_fallback,
        "auth_wall_likely": _detect_auth_wall(text),
    }
