"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getUserStats } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

export default function ProgressPage() {
  const userId = useStore((s) => s.userId);
  const [stats, setStats] = useState<{
    total_cards: number;
    completed_cards: number;
    streak_days: number;
    due_reviews: number;
    active_topics: number;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    getUserStats(userId).then(setStats).catch(console.error);
  }, [userId]);

  const pct = stats ? Math.round((stats.completed_cards / Math.max(stats.total_cards, 1)) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex-1 p-6 pb-24">
        <p className="font-label mb-2" style={{ color: "var(--mark)" }}>Your journey</p>
        <h1 className="font-display text-3xl font-bold mb-6" style={{ color: "var(--ink)" }}>
          Progress
        </h1>

        {/* Circular progress */}
        <div className="flex justify-center mb-8">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                stroke="var(--bg-elev)"
              />
              <circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                stroke="var(--mark)"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>
                {pct}%
              </span>
              <span className="font-label mt-1" style={{ color: "var(--ink-mute)" }}>done</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Cards Done",    value: stats?.completed_cards ?? "—" },
            { label: "Day Streak",    value: stats ? `${stats.streak_days} 🔥` : "—" },
            { label: "Total Cards",   value: stats?.total_cards ?? "—" },
            { label: "Due Reviews",   value: stats?.due_reviews ?? "—" },
            ...(stats?.active_topics != null
              ? [{ label: "Active Topics", value: stats.active_topics }]
              : []),
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
            >
              <p className="font-display text-2xl font-bold" style={{ color: "var(--ink)" }}>
                {s.value}
              </p>
              <p className="font-label mt-1" style={{ color: "var(--ink-mute)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Knowledge retention chart */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
        >
          <p className="font-label mb-4" style={{ color: "var(--ink-mute)" }}>
            Knowledge Retention
          </p>
          <svg viewBox="0 0 300 80" className="w-full">
            <defs>
              <linearGradient id="retainGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--good)" />
              </linearGradient>
            </defs>
            {/* Forgetting curve — no Mastermind */}
            <path
              d="M0 10 C40 10 60 30 80 45 C100 58 120 65 140 68 C160 70 180 71 300 72"
              fill="none"
              stroke="var(--bg-elev)"
              strokeWidth="2"
            />
            {/* With spaced repetition */}
            <path
              d="M0 10 C20 10 30 15 40 20 C50 10 60 12 70 14 C80 6 90 8 100 10 C110 4 120 6 130 8 C140 2 160 4 300 5"
              fill="none"
              stroke="url(#retainGrad)"
              strokeWidth="2.5"
            />
            <text x="155" y="14" fill="var(--accent)" fontSize="7" fontFamily="var(--font-mono)">
              With Mastermind
            </text>
            <text x="155" y="60" fill="var(--ink-mute)" fontSize="7" fontFamily="var(--font-mono)">
              Without review
            </text>
          </svg>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
