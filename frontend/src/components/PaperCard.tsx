"use client";

import React, { useState } from "react";

export interface PaperData {
  id: number;
  title: string;
  authors?: string;
  abstract?: string;
  published_date?: string;
  source?: string;
  url?: string;
  topic?: string;
  citation_count?: number | null;
}

interface PaperCardProps {
  paper: PaperData;
  isBookmarked?: boolean;
  onSummary: (id: number) => void;
  onBookmark?: (id: number, bookmarked: boolean) => void;
}

function getSourceStyle(source: string) {
  const s = (source || "").toLowerCase();
  if (s.includes("arxiv"))        return "text-primary border-primary/20 bg-primary/5";
  if (s.includes("huggingface") || s.includes("hf")) return "text-secondary border-secondary/20 bg-secondary/5";
  if (s.includes("papers_with") || s.includes("pwc")) return "text-white border-white/10 bg-white/5";
  if (s.includes("pubmed"))       return "text-emerald-400 border-emerald-400/20 bg-emerald-400/5";
  if (s.includes("inspire"))      return "text-violet-400 border-violet-400/20 bg-violet-400/5";
  return "text-gray-500 border-white/5 bg-white/5";
}

function getSourceLabel(source: string) {
  const s = (source || "").toLowerCase();
  if (s.includes("arxiv"))        return "ArXiv";
  if (s.includes("huggingface") || s.includes("hf")) return "HF Daily";
  if (s.includes("papers_with") || s.includes("pwc")) return "PwC";
  if (s.includes("pubmed"))       return "PubMed";
  if (s.includes("inspire"))      return "INSPIRE";
  return source;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export default function PaperCard({ paper, isBookmarked = false, onSummary, onBookmark }: PaperCardProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [copied, setCopied] = useState(false);

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !bookmarked;
    setBookmarked(next);
    onBookmark?.(paper.id, next);
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/research?paper=${paper.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sourceStyle = getSourceStyle(paper.source || "");
  const sourceLabel = getSourceLabel(paper.source || "");

  return (
    <div className="glass-panel-prism rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 group relative overflow-hidden flex flex-col h-full dark:bg-transparent light:bg-white/80 light:border-black/10">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono border uppercase tracking-widest ${sourceStyle}`}>
          {sourceLabel}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            title={bookmarked ? "Remove bookmark" : "Bookmark paper"}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
              bookmarked
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-gray-600 hover:text-yellow-400 hover:bg-yellow-400/10"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          {/* Share */}
          <button
            onClick={handleShare}
            title="Copy share link"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-primary hover:bg-primary/10 transition-all relative"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors uppercase tracking-tight mb-2 relative z-10 dark:text-white light:text-gray-900">
        {paper.title}
      </h3>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest relative z-10">
        {paper.authors && (
          <span className="truncate max-w-[140px]">{paper.authors.split(",")[0]} et al.</span>
        )}
        {paper.authors && paper.published_date && <span className="w-1 h-1 rounded-full bg-white/10" />}
        {paper.published_date && <span>{formatDate(paper.published_date)}</span>}
        {paper.citation_count != null && (
          <>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-primary">{paper.citation_count} cites</span>
          </>
        )}
      </div>

      {/* Abstract */}
      <p className="text-xs text-gray-400 font-light line-clamp-3 leading-relaxed mb-5 flex-1 relative z-10 dark:text-gray-400 light:text-gray-600">
        {paper.abstract}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 relative z-10 mt-auto">
        <button
          onClick={() => onSummary(paper.id)}
          className="flex-1 py-2.5 px-4 bg-primary text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/10 active:scale-95"
        >
          Decode Report
        </button>
        {paper.url && (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center glass-panel-prism border-white/5 rounded-xl hover:bg-white/5 transition-all text-xs"
          >
            ↗
          </a>
        )}
      </div>

      {/* Copied toast */}
      {copied && (
        <div className="absolute bottom-16 right-4 px-3 py-1.5 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
          Link copied!
        </div>
      )}

      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
    </div>
  );
}
