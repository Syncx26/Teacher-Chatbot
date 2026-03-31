"""
Fetches physics research papers from INSPIRE HEP.
Completely free, no API key required.
"""
import httpx

INSPIRE_API = "https://inspirehep.net/api/literature"

INSPIRE_QUERIES = [
    "neutrino oscillation mass",
    "dark matter direct detection",
    "quantum gravity string theory",
    "black hole information paradox",
    "condensed matter topological",
    "quantum computing error correction",
    "gravitational waves detection",
]


async def fetch_inspire_hep(
    queries: list[str] = INSPIRE_QUERIES,
    max_per_query: int = 5,
) -> list[dict]:
    """Fetch physics papers from INSPIRE HEP."""
    papers = []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            for q in queries:
                try:
                    resp = await client.get(INSPIRE_API, params={
                        "q": q,
                        "sort": "mostrecent",
                        "size": max_per_query,
                        "fields": "titles,authors,abstracts,arxiv_eprints,dois,publication_info",
                    })
                    if resp.status_code != 200:
                        continue
                    for hit in resp.json().get("hits", {}).get("hits", []):
                        meta = hit.get("metadata", {})
                        arxiv_id = ""
                        for ep in meta.get("arxiv_eprints", []):
                            arxiv_id = ep.get("value", "")
                            break
                        doi = ""
                        for d in meta.get("dois", []):
                            doi = d.get("value", "")
                            break
                        title_list = meta.get("titles") or [{}]
                        title = title_list[0].get("title", "") if title_list else ""
                        abstract_list = meta.get("abstracts") or [{}]
                        abstract = (abstract_list[0].get("value", "") if abstract_list else "")[:500]
                        authors = ", ".join(
                            a.get("full_name", "")
                            for a in (meta.get("authors") or [])[:3]
                        )
                        pub_info = meta.get("publication_info") or [{}]
                        year = str(pub_info[0].get("year", "")) if pub_info else ""
                        url = (
                            f"https://arxiv.org/abs/{arxiv_id}"
                            if arxiv_id
                            else f"https://inspirehep.net/literature/{hit.get('id','')}"
                        )
                        if not title:
                            continue
                        papers.append({
                            "arxiv_id": arxiv_id or f"inspire_{hit.get('id','')}",
                            "title": title,
                            "authors": authors,
                            "abstract": abstract,
                            "url": url,
                            "published_date": year,
                            "source": "inspire_hep",
                            "topic": "physics",
                            "doi": doi,
                            "topics": q,
                        })
                except Exception as e:
                    print(f"INSPIRE HEP error for '{q}': {e}")
    except Exception as e:
        print(f"INSPIRE client error: {e}")
    return papers
