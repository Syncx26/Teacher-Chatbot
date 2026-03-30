"use client";

import React from "react";

interface ModelBadgeProps {
  tier: string;
}

const tierMap: Record<string, { label: string; color: string }> = {
  // Current tier names
  free_llama:        { label: "⚡ Llama",  color: "bg-green-500/20 text-green-300 border-green-500/30" },
  free_gemma:        { label: "⚡ Gemma",  color: "bg-green-500/20 text-green-300 border-green-500/30" },
  budget_flash_lite: { label: "◆ Flash",  color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  premium_sonnet:    { label: "● Sonnet", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  admin:             { label: "◆ Haiku",  color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  // Legacy names
  haiku:             { label: "◆ Haiku",  color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  gemini_flash:      { label: "⚡ Flash",  color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  sonnet:            { label: "● Sonnet", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  sonnet_thinking:   { label: "◈ Deep",   color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
};

export default function ModelBadge({ tier }: ModelBadgeProps) {
  const info = tierMap[tier] ?? {
    label: `● ${tier}`,
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${info.color}`}
    >
      {info.label}
    </span>
  );
}
