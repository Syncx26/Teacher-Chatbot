"""
On-demand Semantic Scholar integration.
Used for: related papers, citation counts.
NOT used in bulk scheduled fetching.

Free tier: 100 req/s without key. Optional API key for higher limits.
"""
from __future__ import annotations
import httpx
from typing import Optional

S2_BASE = "https://api.semanticscholar.org/graph/v1"
PAPER_FIELDS = "title,authors,year,externalIds,citationCount,openAccessPdf"


def _s2_to_dict(paper: dict, relation: str) -> dict:
    ext = paper.get("externalIds") or {}
    arxiv_id = ext.get("ArXiv", "")
    doi = ext.get("DOI", "")
    url = (
        f"https://arxiv.org/abs/{arxiv_id}"
        if arxiv_id
        else paper.get("url", "")
    )
    authors = ", ".join(
        a.get("name", "") for a in (paper.get("authors") or [])[:3]
    )
    return {
        "title": paper.get("title", ""),
        "authors": authors,
        "url": url,
        "arxiv_id": arxiv_id,
        "doi": doi,
        "citation_count": paper.get("citationCount"),
        "year": paper.get("year"),
        "relation": relation,
    }


async def get_related_papers(
    arxiv_id: str,
    api_key: str = "",
    limit: int = 5,
) -> list[dict]:
    """Fetch related papers (references + citations) for an ArXiv paper."""
    if not arxiv_id or arxiv_id.startswith("pmid_") or arxiv_id.startswith("inspire_"):
        return []
    headers = {"x-api-key": api_key} if api_key else {}
    s2_id = f"ARXIV:{arxiv_id}"
    results = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # References (papers this paper cites)
            resp = await client.get(
                f"{S2_BASE}/paper/{s2_id}/references",
                params={"fields": PAPER_FIELDS, "limit": limit},
                headers=headers,
            )
            if resp.status_code == 200:
                for item in resp.json().get("data", []):
                    p = item.get("citedPaper", {})
                    if p.get("title"):
                        results.append(_s2_to_dict(p, "reference"))
            # Citations (papers that cite this paper)
            resp = await client.get(
                f"{S2_BASE}/paper/{s2_id}/citations",
                params={"fields": PAPER_FIELDS, "limit": limit},
                headers=headers,
            )
            if resp.status_code == 200:
                for item in resp.json().get("data", []):
                    p = item.get("citingPaper", {})
                    if p.get("title"):
                        results.append(_s2_to_dict(p, "citation"))
    except Exception as e:
        print(f"Semantic Scholar error for {arxiv_id}: {e}")
    return results


async def get_citation_count(arxiv_id: str, api_key: str = "") -> Optional[int]:
    """Fetch citation count for a single paper."""
    if not arxiv_id or arxiv_id.startswith("pmid_") or arxiv_id.startswith("inspire_"):
        return None
    headers = {"x-api-key": api_key} if api_key else {}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{S2_BASE}/paper/ARXIV:{arxiv_id}",
                params={"fields": "citationCount"},
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json().get("citationCount")
    except Exception:
        pass
    return None


async def get_fulltext_url(doi: str, email: str = "") -> Optional[str]:
    """Look up open-access PDF URL via Unpaywall API."""
    if not doi or not email:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.unpaywall.org/v2/{doi}",
                params={"email": email},
            )
            if resp.status_code == 200:
                data = resp.json()
                best = data.get("best_oa_location") or {}
                return best.get("url_for_pdf") or best.get("url")
    except Exception:
        pass
    return None
