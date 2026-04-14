"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getUserCurricula } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProgressPage() {
  const userId = useStore((s) => s.userId);
  const [stats, setStats] = useState<{
    total_cards: number;
    completed_cards: number;
    streak_days: number;
    due_reviews: number;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${BASE}/users/${userId}/stats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("clerk_token") ?? ""}` },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, [userId]);

  const pct = stats ? Math.round((stats.completed_cards / Math.max(stats.total_cards, 1)) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <div className="flex-1 p-6 pb-24">
        <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Progress</h1>

        {/* Circular progress */}
        <div className="flex justify-center mb-8">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" stroke="var(--surface-alt)" />
              <circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                stroke="var(--accent)"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{pct}%</span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>complete</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: "Cards Done", value: stats?.completed_cards ?? "—" },
            { label: "Day Streak", value: stats ? `${stats.streak_days} 🔥` : "—" },
            { label: "Total Cards", value: stats?.total_cards ?? "—" },
            { label: "Due Reviews", value: stats?.due_reviews ?? "—" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4" style={{ background: "var(--surface)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Knowledge decay SVG */}
        <div className="rounded-2xl p-4" style={{ background: "var(--surface)" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Knowledge Retention</p>
          <svg viewBox="0 0 300 80" className="w-full">
            <defs>
              <linearGradient id="decay" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--success)" />
              </linearGradient>
            </defs>
            {/* Ebbinghaus forgetting curve */}
            <path
              d="M0 10 C40 10 60 30 80 45 C100 58 120 65 140 68 C160 70 180 71 300 72"
              fill="none"
              stroke="var(--surface-alt)"
              strokeWidth="2"
            />
            {/* With spaced repetition */}
            <path
              d="M0 10 C20 10 30 15 40 20 C50 10 60 12 70 14 C80 6 90 8 100 10 C110 4 120 6 130 8 C140 2 160 4 300 5"
              fill="none"
              stroke="url(#decay)"
              strokeWidth="2.5"
            />
            <text x="160" y="15" className="text-xs" fill="var(--accent)" fontSize="8">With Mastermind</text>
            <text x="160" y="58" className="text-xs" fill="var(--text-secondary)" fontSize="8">Without review</text>
          </svg>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
