"use client";

import React from "react";
import { Topic } from "@/lib/store";

interface TopicChipProps {
  topic: Topic;
  currentWeek: number;
  completedWeeks: number[];
  onClick: (topic: Topic) => void;
}

export default function TopicChip({ topic, currentWeek, completedWeeks, onClick }: TopicChipProps) {
  const isCompleted = completedWeeks.includes(topic.week);
  const isCurrent = topic.week === currentWeek;
  const isLocked = topic.week > currentWeek && !isCompleted;

  const getStyles = () => {
    if (isCompleted) {
      return "bg-success/15 text-success border-success/30 hover:bg-success/25 cursor-pointer";
    }
    if (isCurrent) {
      return "bg-accent/20 text-accent border-accent/40 hover:bg-accent/30 cursor-pointer shadow-[0_0_8px_rgba(59,130,246,0.3)]";
    }
    if (isLocked) {
      return "bg-slate-800/50 text-slate-500 border-slate-700/30 cursor-not-allowed opacity-60";
    }
    return "bg-slate-700/30 text-slate-300 border-slate-600/30 hover:bg-slate-700/50 cursor-pointer";
  };

  const handleClick = () => {
    if (!isLocked) {
      onClick(topic);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLocked}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${getStyles()}`}
      title={isLocked ? "Complete previous weeks first" : topic.label}
    >
      {isCompleted && (
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {isLocked && (
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="truncate max-w-[120px]">
        W{topic.week}: {topic.label}
      </span>
    </button>
  );
}
