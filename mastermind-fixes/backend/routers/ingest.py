"""
URL/YouTube ingestion — extracts text from a URL for curriculum grounding.
YouTube: fetches transcript via youtube-transcript-api (no API key needed).
Other URLs: fetches HTML and strips tags.
"""
import re
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import verify_token

router = APIRouter()


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


def _fetch_url(url: str) -> str:
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=10,
                         headers={"User-Agent": "Mastermind/1.0 (educational content extraction)"})
        resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=422, detail=f"Could not fetch URL: {e}")

    html = resp.text

    # Try BeautifulSoup first, fall back to regex strip
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


@router.post("/url")
def ingest_url(body: IngestBody, claims: dict = Depends(verify_token)):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    if _is_youtube(url):
        text = _fetch_youtube(url)
        source_type = "youtube_transcript"
    else:
        text = _fetch_url(url)
        source_type = "webpage"

    word_count = len(text.split())
    return {
        "text": text,
        "source_type": source_type,
        "word_count": word_count,
    }
