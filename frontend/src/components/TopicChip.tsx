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
      return "bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary/20 cursor-pointer";
    }
    if (isCurrent) {
      return "bg-primary/20 text-primary border-primary/40 hover:bg-primary/30 cursor-pointer shadow-[0_0_15px_rgba(0,245,255,0.2)] font-bold";
    }
    if (isLocked) {
      return "bg-white/5 text-gray-600 border-white/5 cursor-not-allowed opacity-40";
    }
    return "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 cursor-pointer";
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
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest border transition-all duration-300 ${getStyles()}`}
      title={isLocked ? "Neural Link Locked" : topic.label}
    >
      {isCompleted && (
        <span className="text-secondary">✓</span>
      )}
      {isLocked && (
        <span className="opacity-50">🔒</span>
      )}
      <span className="truncate max-w-[140px]">
         {topic.label}
      </span>
    </button>
  );
}
