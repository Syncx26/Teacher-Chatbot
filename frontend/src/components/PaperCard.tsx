"use client";

import React from "react";
import { Paper } from "@/lib/store";

interface PaperCardProps {
  paper: Paper;
  onSummary: (id: number) => void;
}

function getSourceStyle(source: string) {
  const s = source.toLowerCase();
  if (s.includes("arxiv")) return "text-primary border-primary/20 bg-primary/5";
  if (s.includes("huggingface") || s.includes("hf")) return "text-secondary border-secondary/20 bg-secondary/5";
  if (s.includes("paperswithcode") || s.includes("pwc")) return "text-white border-white/10 bg-white/5";
  return "text-gray-500 border-white/5 bg-white/5";
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
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export default function PaperCard({ paper, onSummary }: PaperCardProps) {
  const sourceStyle = getSourceStyle(paper.source);
  const sourceLabel = getSourceLabel(paper.source);

  return (
    <div className="glass-panel-prism rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 group relative overflow-hidden flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors uppercase tracking-tight">
            {paper.title}
          </h3>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono border uppercase tracking-widest ${sourceStyle}`}>
          {sourceLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest relative z-10">
        <span className="truncate max-w-[150px]">{paper.authors?.split(",")[0]} et al.</span>
        <span className="w-1 h-1 rounded-full bg-white/10" />
        <span>{formatDate(paper.published_date)}</span>
      </div>

      <p className="text-xs text-gray-400 font-light line-clamp-3 leading-relaxed mb-6 flex-1 relative z-10">
        {paper.abstract}
      </p>

      <div className="flex items-center gap-3 relative z-10 mt-auto">
        <button
          onClick={() => onSummary(paper.id)}
          className="flex-1 py-3 px-4 bg-primary text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/10 active:scale-95"
        >
          Decode Report
        </button>
        {paper.url && (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center glass-panel-prism border-white/5 rounded-xl hover:bg-white/5 transition-all text-xs"
          >
            ↗
          </a>
        )}
      </div>
      
      {/* Background visual element */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
    </div>
  );
}
