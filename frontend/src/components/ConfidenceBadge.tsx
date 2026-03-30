"use client";

import React, { useState } from "react";

interface ConfidenceBadgeProps {
  score: number | null;
}

export default function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (score === null || score === undefined) return null;

  const getColor = () => {
    if (score >= 8) return "bg-success/20 text-success border-success/30";
    if (score >= 5) return "bg-warning/20 text-warning border-warning/30";
    return "bg-danger/20 text-danger border-danger/30";
  };

  const getDot = () => {
    if (score >= 8) return "bg-success";
    if (score >= 5) return "bg-warning";
    return "bg-danger";
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${getColor()} cursor-help`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Source confidence: ${score}/10`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${getDot()}`} />
        {score}/10
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <div className="bg-card border border-white/10 rounded px-2 py-1 text-xs text-slate-300 whitespace-nowrap shadow-lg">
            Source confidence: {score}/10
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-card" />
        </div>
      )}
    </div>
  );
}
