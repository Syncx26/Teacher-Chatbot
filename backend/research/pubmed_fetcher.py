"""
Fetches medical research papers from PubMed via NCBI E-utilities.
Free API — only requires an email address for rate-limit identification.
"""
import xml.etree.ElementTree as ET
import httpx

PUBMED_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_FETCH  = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

MEDICAL_QUERIES = [
    "machine learning medical imaging diagnosis",
    "CRISPR gene editing therapy 2024",
    "cancer immunotherapy clinical trial",
    "drug resistance antibiotic mechanisms",
    "COVID-19 long term outcomes",
    "Alzheimer disease biomarkers treatment",
    "AI clinical decision support",
]


def _parse_pubmed_xml(xml_text: str) -> list[dict]:
    papers = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return papers
    for article in root.findall(".//PubmedArticle"):
        citation = article.find("MedlineCitation")
        if citation is None:
            continue
        art = citation.find("Article")
        if art is None:
            continue
        title_el = art.find("ArticleTitle")
        title = (title_el.text or "").strip() if title_el is not None else ""
        abstract_el = art.find(".//AbstractText")
        abstract = (abstract_el.text or "")[:500] if abstract_el is not None else ""
        # Authors
        authors = []
        for author in art.findall(".//Author")[:3]:
            ln = author.findtext("LastName", "")
            fn = author.findtext("ForeName", "")
            if ln:
                authors.append(f"{ln} {fn}".strip())
        # DOI and PMID
        doi = ""
        pmid = citation.findtext("PMID", "")
        for article_id in article.findall(".//ArticleId"):
            if article_id.get("IdType") == "doi":
                doi = article_id.text or ""
                break
        # Date
        pub_date = art.find(".//PubDate")
        year = pub_date.findtext("Year", "") if pub_date is not None else ""
        url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""
        if not title or not url:
            continue
        papers.append({
            "arxiv_id": f"pmid_{pmid}",
            "title": title,
            "authors": ", ".join(authors),
            "abstract": abstract,
            "url": url,
            "published_date": year,
            "source": "pubmed",
            "topic": "medical",
            "doi": doi,
            "topics": "medical",
        })
    return papers


async def fetch_pubmed(
    queries: list[str] = MEDICAL_QUERIES,
    max_per_query: int = 5,
    email: str = "",
) -> list[dict]:
    """Fetch medical papers from PubMed."""
    papers = []
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            for query in queries:
                try:
                    search_resp = await client.get(PUBMED_SEARCH, params={
                        "db": "pubmed", "term": query,
                        "retmax": max_per_query,
                        "sort": "pub+date",
                        "retmode": "json",
                        "email": email or "research@synapsex.app",
                    })
                    ids = search_resp.json().get("esearchresult", {}).get("idlist", [])
                    if not ids:
                        continue
                    fetch_resp = await client.get(PUBMED_FETCH, params={
                        "db": "pubmed", "id": ",".join(ids),
                        "rettype": "abstract", "retmode": "xml",
                        "email": email or "research@synapsex.app",
                    })
                    papers.extend(_parse_pubmed_xml(fetch_resp.text))
                except Exception as e:
                    print(f"PubMed fetch error for '{query}': {e}")
    except Exception as e:
        print(f"PubMed client error: {e}")
    return papers
