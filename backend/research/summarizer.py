"""
Generates easy-to-read paper summaries using Claude Sonnet.
"""
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import anthropic
from config import ANTHROPIC_API_KEY, MODEL_SONNET
from db.schema import get_conn

_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SUMMARY_SYSTEM_PROMPT = """You are an expert at making dense AI research papers accessible to beginners.
The student you're explaining to knows Python basics and is learning to build AI systems.
They have ADHD — so your summaries must be scannable, punchy, and broken into clear sections.
No walls of text. Use bullet points liberally. Explain jargon in plain English immediately."""

SUMMARY_TEMPLATE = """Summarize this research paper for a beginner learning AI systems engineering.

Paper title: {title}
Authors: {authors}
Abstract: {abstract}

Write a summary with these exact sections:

## What is this paper about?
(2-3 sentences, plain English. Pretend you're explaining to a curious 16-year-old.)

## Why does it matter?
(bullet points — what problem does it solve? what changes if this works?)

## The key idea
(the core technical contribution, explained with an analogy)

## How they did it
(methodology in 4-6 bullets, no jargon without explanation)

## Key results
(the numbers that matter — what did they achieve?)

## What you can use from this
(practical takeaways for someone building AI agents — directly relevant to {title})

## Complexity rating
(Easy / Medium / Hard — with one sentence explaining why)"""


def generate_summary(paper: dict) -> str:
    """Generate an easy-to-read summary for a paper. Uses Claude Sonnet."""
    prompt = SUMMARY_TEMPLATE.format(
        title=paper.get("title", ""),
        authors=paper.get("authors", "Unknown"),
        abstract=paper.get("abstract", "No abstract available"),
    )

    response = _client.messages.create(
        model=MODEL_SONNET,
        max_tokens=1500,
        system=SUMMARY_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def get_or_create_summary(paper_id: int, paper: dict) -> str:
    """Return cached summary if exists, otherwise generate and cache."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT summary_md FROM paper_summaries WHERE paper_id = ?", (paper_id,)
        ).fetchone()

    if row:
        return row["summary_md"]

    summary = generate_summary(paper)

    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO paper_summaries (paper_id, summary_md) VALUES (?, ?)",
            (paper_id, summary),
        )

    return summary


def get_paper_with_summary(paper_id: int) -> dict:
    with get_conn() as conn:
        paper = conn.execute(
            "SELECT * FROM papers WHERE id = ?", (paper_id,)
        ).fetchone()

    if not paper:
        return {"error": "Paper not found"}

    paper_dict = dict(paper)
    paper_dict["summary"] = get_or_create_summary(paper_id, paper_dict)
    return paper_dict
