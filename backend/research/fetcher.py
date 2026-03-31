"""
Fetches AI research papers from ArXiv, Semantic Scholar, Hugging Face Daily, and Papers With Code.
Papers are filtered to topics relevant to the student's current curriculum week.
"""
import json
import asyncio
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Optional
import httpx

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import HF_TOKEN
from db.schema import get_conn
from research.pubmed_fetcher import fetch_pubmed
from research.inspire_fetcher import fetch_inspire_hep
from research.openalex_fetcher import fetch_openalex

ARXIV_API = "https://export.arxiv.org/api/query"
ARXIV_NS = "{http://www.w3.org/2005/Atom}"

# Topics mapped to curriculum weeks — fetcher adds relevant papers per week
WEEK_TOPIC_QUERIES: dict[int, list[str]] = {
    1: ["python data structures json", "python file handling"],
    2: ["REST API design python", "HTTP requests python"],
    3: ["SQLite python database", "SQL query optimization"],
    4: ["large language models API", "Anthropic Claude API", "prompt engineering"],
    5: ["retrieval augmented generation RAG", "vector embeddings", "ChromaDB"],
    6: ["LangGraph state machine", "LangChain agents graph"],
    7: ["LangSmith observability tracing", "LLM debugging"],
    8: ["Model Context Protocol MCP", "AI tool calling"],
    9: ["multi-agent systems LLM", "LangGraph subgraphs"],
    10: ["autonomous AI agents", "human-in-the-loop AI"],
    11: ["Streamlit AI dashboard", "LLM evaluation"],
    12: ["AI systems engineering", "LLM deployment"],
}

# Always-on queries regardless of week
ALWAYS_ON_QUERIES = [
    "large language models 2025",
    "AI agents autonomous systems",
    "transformer architecture advances",
]

TOPIC_ARXIV_CATEGORIES: dict[str, list[str]] = {
    "ai":      ["cs.AI", "cs.LG", "cs.CL", "stat.ML", "cs.CV", "cs.NE"],
    "physics": ["hep-th", "hep-ph", "cond-mat", "quant-ph", "gr-qc", "astro-ph.HE"],
    "tech":    ["cs.SE", "cs.DC", "cs.CR", "cs.NI", "cs.AR", "cs.PL"],
}


def _week_to_queries(current_week: int) -> list[str]:
    queries = ALWAYS_ON_QUERIES.copy()
    queries.extend(WEEK_TOPIC_QUERIES.get(current_week, []))
    # Also include next week's topics as preview
    queries.extend(WEEK_TOPIC_QUERIES.get(current_week + 1, [])[:1])
    return queries


async def fetch_arxiv_papers(query: str, max_results: int = 5) -> list[dict]:
    """Fetch papers from ArXiv using their Atom API (no external library needed)."""
    params = {
        "search_query": f"all:{query}",
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    }
    papers = []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(ARXIV_API, params=params)
            resp.raise_for_status()
        root = ET.fromstring(resp.text)
        for entry in root.findall(f"{ARXIV_NS}entry"):
            arxiv_id = (entry.findtext(f"{ARXIV_NS}id") or "").split("/")[-1]
            title = (entry.findtext(f"{ARXIV_NS}title") or "").strip().replace("\n", " ")
            abstract = (entry.findtext(f"{ARXIV_NS}summary") or "").strip()[:500]
            published = (entry.findtext(f"{ARXIV_NS}published") or "")[:10]
            url = entry.findtext(f"{ARXIV_NS}id") or ""
            authors = ", ".join(
                a.findtext(f"{ARXIV_NS}name") or ""
                for a in entry.findall(f"{ARXIV_NS}author")[:3]
            )
            papers.append({
                "arxiv_id": arxiv_id,
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "url": url,
                "published_date": published,
                "source": "arxiv",
                "topics": query,
            })
    except Exception as e:
        print(f"ArXiv fetch error for '{query}': {e}")
    return papers


async def fetch_hf_daily_papers() -> list[dict]:
    """Fetch Hugging Face daily papers."""
    papers = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                "https://huggingface.co/api/daily_papers",
                headers={"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {},
            )
            if response.status_code == 200:
                data = response.json()
                for item in data[:10]:
                    paper = item.get("paper", {})
                    papers.append({
                        "arxiv_id": paper.get("id", ""),
                        "title": paper.get("title", ""),
                        "authors": ", ".join(
                            a.get("name", "") for a in paper.get("authors", [])[:3]
                        ),
                        "abstract": paper.get("summary", "")[:500],
                        "url": f"https://arxiv.org/abs/{paper.get('id', '')}",
                        "published_date": paper.get("publishedAt", "")[:10],
                        "source": "huggingface_daily",
                        "topics": "daily_papers",
                    })
    except Exception as e:
        print(f"HF daily papers error: {e}")
    return papers


async def fetch_papers_with_code(query: str) -> list[dict]:
    """Fetch papers from Papers With Code."""
    papers = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                "https://paperswithcode.com/api/v1/papers/",
                params={"q": query, "ordering": "-published", "items_per_page": 5},
            )
            if response.status_code == 200:
                data = response.json()
                for item in data.get("results", []):
                    papers.append({
                        "arxiv_id": item.get("arxiv_id", ""),
                        "title": item.get("title", ""),
                        "authors": "",
                        "abstract": item.get("abstract", "")[:500],
                        "url": item.get("url_abs", "") or item.get("url_pdf", ""),
                        "published_date": item.get("published", "")[:10],
                        "source": "papers_with_code",
                        "topics": query,
                    })
    except Exception as e:
        print(f"Papers With Code error for '{query}': {e}")
    return papers


async def fetch_arxiv_by_category(
    categories: list[str],
    topic: str,
    max_results: int = 15,
) -> list[dict]:
    """Fetch ArXiv papers by section category codes (e.g. cs.AI, hep-th)."""
    cat_query = " OR ".join(f"cat:{c}" for c in categories)
    params = {
        "search_query": cat_query,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    }
    papers = []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(ARXIV_API, params=params)
            resp.raise_for_status()
        root = ET.fromstring(resp.text)
        for entry in root.findall(f"{ARXIV_NS}entry"):
            arxiv_id = (entry.findtext(f"{ARXIV_NS}id") or "").split("/")[-1]
            title = (entry.findtext(f"{ARXIV_NS}title") or "").strip().replace("\n", " ")
            abstract = (entry.findtext(f"{ARXIV_NS}summary") or "").strip()[:500]
            published = (entry.findtext(f"{ARXIV_NS}published") or "")[:10]
            url = entry.findtext(f"{ARXIV_NS}id") or ""
            authors = ", ".join(
                a.findtext(f"{ARXIV_NS}name") or ""
                for a in entry.findall(f"{ARXIV_NS}author")[:3]
            )
            papers.append({
                "arxiv_id": arxiv_id,
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "url": url,
                "published_date": published,
                "source": "arxiv",
                "topic": topic,
                "doi": "",
                "topics": ",".join(categories[:3]),
            })
    except Exception as e:
        print(f"ArXiv category fetch error for {categories}: {e}")
    return papers


async def fetch_all_for_topic(topic: str) -> int:
    """
    Fetch papers for a specific topic tab and save to DB.
    Used by the standalone research reader scheduler.
    """
    from config import NCBI_EMAIL, UNPAYWALL_EMAIL
    papers: list[dict] = []
    # OpenAlex runs for every topic — high quality, no key needed
    openalex_email = UNPAYWALL_EMAIL or NCBI_EMAIL or ""
    papers += await fetch_openalex(topic, email=openalex_email)

    if topic == "ai":
        papers += await fetch_arxiv_by_category(TOPIC_ARXIV_CATEGORIES["ai"], "ai")
        papers += await fetch_hf_daily_papers()
        pwc = await fetch_papers_with_code("large language models")
        for p in pwc:
            p["topic"] = "ai"
        papers += pwc

    elif topic == "physics":
        papers += await fetch_arxiv_by_category(TOPIC_ARXIV_CATEGORIES["physics"], "physics")
        papers += await fetch_inspire_hep()

    elif topic == "tech":
        papers += await fetch_arxiv_by_category(TOPIC_ARXIV_CATEGORIES["tech"], "tech")
        pwc = await fetch_papers_with_code("software engineering systems")
        for p in pwc:
            p["topic"] = "tech"
        papers += pwc

    elif topic == "medical":
        papers += await fetch_pubmed(email=NCBI_EMAIL)

    return save_papers_to_db(papers)


def save_papers_to_db(papers: list[dict]) -> int:
    """Insert papers into DB, skip duplicates. Returns count added."""
    added = 0
    with get_conn() as conn:
        for p in papers:
            if not p.get("title") or not p.get("url"):
                continue
            try:
                conn.execute(
                    """INSERT OR IGNORE INTO papers
                       (arxiv_id, title, authors, abstract, url, published_date, source, topics, topic, doi)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        p.get("arxiv_id", ""),
                        p["title"],
                        p.get("authors", ""),
                        p.get("abstract", ""),
                        p["url"],
                        p.get("published_date", ""),
                        p.get("source", ""),
                        p.get("topics", ""),
                        p.get("topic", "ai"),
                        p.get("doi", ""),
                    ),
                )
                if conn.execute("SELECT changes()").fetchone()[0]:
                    added += 1
            except Exception as e:
                print(f"DB insert error: {e}")
    return added


async def fetch_all_papers(current_week: int) -> int:
    """Main fetch function — pulls from all sources, saves to DB. Returns papers added."""
    queries = _week_to_queries(current_week)
    all_papers: list[dict] = []

    # ArXiv (async)
    for query in queries[:4]:  # limit to avoid rate limits
        papers = await fetch_arxiv_papers(query, 5)
        all_papers.extend(papers)

    # HF daily papers
    hf_papers = await fetch_hf_daily_papers()
    all_papers.extend(hf_papers)

    # Papers With Code for top queries
    for query in queries[:2]:
        pwc = await fetch_papers_with_code(query)
        all_papers.extend(pwc)

    added = save_papers_to_db(all_papers)

    # Log the refresh
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO paper_refresh_log (papers_added) VALUES (?)", (added,)
        )

    return added


def get_last_refresh_time() -> Optional[datetime]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT refreshed_at FROM paper_refresh_log ORDER BY id DESC LIMIT 1"
        ).fetchone()
    if row:
        return datetime.fromisoformat(row["refreshed_at"])
    return None


def is_stale(threshold_hours: int = 24) -> bool:
    last = get_last_refresh_time()
    if last is None:
        return True
    return datetime.utcnow() - last > timedelta(hours=threshold_hours)


def get_papers(
    limit: int = 50,
    offset: int = 0,
    source: Optional[str] = None,
    topic: Optional[str] = None,
) -> list[dict]:
    with get_conn() as conn:
        if source and topic:
            rows = conn.execute(
                """SELECT * FROM papers WHERE source = ? AND topic = ?
                   ORDER BY published_date DESC LIMIT ? OFFSET ?""",
                (source, topic, limit, offset),
            ).fetchall()
        elif source:
            rows = conn.execute(
                """SELECT * FROM papers WHERE source = ?
                   ORDER BY published_date DESC LIMIT ? OFFSET ?""",
                (source, limit, offset),
            ).fetchall()
        elif topic:
            rows = conn.execute(
                """SELECT * FROM papers WHERE topic = ?
                   ORDER BY published_date DESC LIMIT ? OFFSET ?""",
                (topic, limit, offset),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT * FROM papers ORDER BY published_date DESC LIMIT ? OFFSET ?""",
                (limit, offset),
            ).fetchall()
    return [dict(r) for r in rows]
