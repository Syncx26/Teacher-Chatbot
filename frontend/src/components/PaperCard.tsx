"use client";

import React from "react";
import { Paper } from "@/lib/store";

interface PaperCardProps {
  paper: Paper;
  onSummary: (id: number) => void;
}

function getSourceBadgeStyle(source: string) {
  const s = source.toLowerCase();
  if (s.includes("arxiv")) return "bg-accent/20 text-accent border-accent/30";
  if (s.includes("huggingface") || s.includes("hf")) return "bg-warning/20 text-warning border-warning/30";
  if (s.includes("paperswithcode") || s.includes("pwc")) return "bg-success/20 text-success border-success/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
}

function getSourceLabel(source: string) {
  const s = source.toLowerCase();
  if (s.includes("arxiv")) return "ArXiv";
  if (s.includes("huggingface") || s.includes("hf")) return "HF Daily";
  if (s.includes("paperswithcode") || s.includes("pwc")) return "PwC";
  return source;
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function PaperCard({ paper, onSummary }: PaperCardProps) {
  const badgeStyle = getSourceBadgeStyle(paper.source);
  const sourceLabel = getSourceLabel(paper.source);

  return (
    <div className="glass-card rounded-xl p-4 hover:border-white/20 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
            {paper.title}
          </h3>
        </div>
        <span
          className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeStyle}`}
        >
          {sourceLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
        <span className="truncate">{paper.authors}</span>
        <span className="flex-shrink-0">·</span>
        <span className="flex-shrink-0">{formatDate(paper.published_date)}</span>
      </div>

      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-3">
        {paper.abstract}
      </p>

      {paper.tags && paper.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {paper.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-slate-700/40 text-slate-500 text-xs rounded border border-slate-700/30"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onSummary(paper.id)}
          className="flex-1 py-1.5 px-3 text-xs font-medium bg-accent/15 text-accent border border-accent/25 rounded-lg hover:bg-accent/25 transition-colors"
        >
          Read Summary
        </button>
        {paper.url && (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3 text-xs font-medium bg-slate-700/40 text-slate-400 border border-slate-600/30 rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            Source ↗
          </a>
        )}
      </div>
    </div>
  );
}
