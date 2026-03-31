"""
OpenAlex fetcher — 250M+ works, fully free REST API.
Uses concept IDs to pull high-quality papers per topic.
Polite-pool mode (mailto param) gives unlimited rate limit.
"""
import httpx
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

OPENALEX_API = "https://api.openalex.org/works"

# OpenAlex concept IDs per topic — picked to match each research tab
TOPIC_CONCEPTS: dict[str, list[str]] = {
    "ai": [
        "C154945302",  # Artificial intelligence
        "C119857082",  # Machine learning
        "C204321447",  # Deep learning
        "C153294291",  # Natural language processing
        "C2522767166", # Data science
    ],
    "physics": [
        "C121332964",  # Physics
        "C62649501",   # Quantum mechanics
        "C21547014",   # Particle physics
        "C185592680",  # Condensed matter physics
        "C523546767",  # Astrophysics
    ],
    "medical": [
        "C71924100",   # Medicine
        "C86803240",   # Biology
        "C2909583891", # Neuroscience
        "C203014093",  # Cancer research
        "C126322002",  # Immunology
    ],
    "tech": [
        "C41008148",   # Computer science
        "C197762314",  # Software engineering
        "C38652104",   # Computer security
        "C105795698",  # Computer network
        "C11413529",   # Database
    ],
}


def _reconstruct_abstract(inverted_index: dict | None) -> str:
    """Rebuild abstract from OpenAlex inverted index format."""
    if not inverted_index:
        return ""
    positions: list[tuple[int, str]] = []
    for word, pos_list in inverted_index.items():
        for pos in pos_list:
            positions.append((pos, word))
    positions.sort()
    return " ".join(w for _, w in positions)[:600]


async def fetch_openalex(
    topic: str,
    email: str = "",
    max_results: int = 20,
) -> list[dict]:
    """
    Fetch recent high-quality papers for a topic from OpenAlex.
    Returns papers in the standard dict format used by save_papers_to_db.
    """
    concept_ids = TOPIC_CONCEPTS.get(topic, [])
    if not concept_ids:
        return []

    # Use the first 3 concept IDs joined with | (OR filter)
    concept_filter = "|".join(concept_ids[:3])

    params: dict = {
        "filter": f"concepts.id:{concept_filter},type:article",
        "sort": "publication_date:desc",
        "per-page": max_results,
        "select": "id,title,abstract_inverted_index,authorships,doi,primary_location,publication_date,cited_by_count",
    }
    if email:
        params["mailto"] = email

    papers: list[dict] = []
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            resp = await client.get(OPENALEX_API, params=params)
            resp.raise_for_status()
        data = resp.json()

        for work in data.get("results", []):
            title = (work.get("title") or "").strip()
            if not title:
                continue

            abstract = _reconstruct_abstract(work.get("abstract_inverted_index"))

            # Authors — up to 3
            authors = ", ".join(
                a.get("author", {}).get("display_name", "")
                for a in (work.get("authorships") or [])[:3]
                if a.get("author", {}).get("display_name")
            )

            # DOI — stored as full URL, we want the bare DOI
            raw_doi = work.get("doi") or ""
            doi = raw_doi.replace("https://doi.org/", "").replace("http://doi.org/", "")

            # Landing URL — prefer DOI, fall back to OpenAlex page, then primary location
            location = work.get("primary_location") or {}
            pdf_url = location.get("pdf_url") or ""
            landing_url = location.get("landing_page_url") or ""
            url = (
                f"https://doi.org/{doi}" if doi
                else landing_url
                or pdf_url
                or work.get("id", "")
            )

            if not url:
                continue

            pub_date = (work.get("publication_date") or "")[:10]
            citation_count = work.get("cited_by_count") or 0

            # arxiv_id — OpenAlex work ID used as dedup key
            openalex_id = (work.get("id") or "").replace("https://openalex.org/", "")

            papers.append({
                "arxiv_id": openalex_id,
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "url": url,
                "published_date": pub_date,
                "source": "openalex",
                "topic": topic,
                "topics": topic,
                "doi": doi,
                "citation_count": citation_count,
            })

    except Exception as e:
        print(f"[openalex] Fetch error for topic '{topic}': {e}")

    return papers
