"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import {
  getUserCurricula,
  getTodaySession,
  completeSession,
  getUserStats,
  setAuthToken,
  type CurriculumSummary,
} from "@/lib/api";
import { CardReel } from "@/components/CardReel";
import { BottomNav } from "@/components/BottomNav";

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function milestoneKey(streak: number) {
  return `celebrated_streak_${streak}`;
}

export default function TodayPage() {
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const userIdFromStore = useStore((s) => s.userId);
  const userId = userIdFromStore || user?.id || null;
  const activeCurriculumId = useStore((s) => s.activeCurriculumId);
  const setActiveCurriculumId = useStore((s) => s.setActiveCurriculumId);
  const { setCurrentSession } = useStore();

  const [curricula, setCurricula] = useState<CurriculumSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    session_id: string;
    cards: unknown[];
    week_number?: number;
    day_number?: number;
  } | null>(null);
  const [done, setDone] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (curriculumId: string) => {
    setLoading(true);
    setDone(false);
    const session = await getTodaySession(curriculumId);
    if (session.done) {
      setDone(true);
    } else {
      setSessionData(session);
      setCurrentSession(session.session_id);
    }
    setLoading(false);
  }, [setCurrentSession]);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    async function boot() {
      try {
        const token = await getToken();
        setAuthToken(token);
      } catch {
        /* UserSync will retry */
      }

      const [curriculaData, stats] = await Promise.all([
        getUserCurricula(userId!).catch(() => [] as CurriculumSummary[]),
        getUserStats(userId!).catch(() => null),
      ]);

      const active = curriculaData.filter((c) => c.status === "active");
      if (!active.length) {
        router.push("/onboarding");
        return;
      }
      setCurricula(active);

      // Resolve which curriculum to load
      let picked = active[0].id;
      if (activeCurriculumId && active.find((c) => c.id === activeCurriculumId)) {
        picked = activeCurriculumId;
      }
      setSelectedId(picked);
      setActiveCurriculumId(picked);

      // Streak milestone check
      if (stats) {
        setStreakDays(stats.streak_days);
        const hit = STREAK_MILESTONES.find(
          (m) => stats.streak_days === m && !localStorage.getItem(milestoneKey(m))
        );
        if (hit) setMilestone(hit);
      }

      await loadSession(picked);
    }

    boot().catch((e) => {
      console.error(e);
      setError(e instanceof Error ? e.message : "Couldn't load your session. Pull to refresh.");
      setLoading(false);
    });
  }, [isLoaded, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss milestone overlay after 2.5s
  useEffect(() => {
    if (!milestone) return;
    const t = setTimeout(() => {
      localStorage.setItem(milestoneKey(milestone), "1");
      setMilestone(null);
    }, 2500);
    return () => clearTimeout(t);
  }, [milestone]);

  async function switchCurriculum(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    setActiveCurriculumId(id);
    await loadSession(id);
  }

  async function handleComplete() {
    if (sessionData?.session_id) {
      await completeSession(sessionData.session_id);
    }
    setDone(true);
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--bg)" }}>
        <p className="font-display text-xl mb-3" style={{ color: "var(--ink)" }}>{error}</p>
        <button
          onClick={() => location.reload()}
          className="rounded-full px-6 py-2 text-sm font-semibold"
          style={{ background: "var(--mark)", color: "var(--bg)" }}
        >
          Retry
        </button>
        <BottomNav />
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)" }}
        />
      </div>
    );
  }

  // ── Session complete — cliffhanger end screen ─────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <p className="font-label" style={{ color: "var(--good)" }}>SESSION COMPLETE</p>

          <h1 className="font-display text-4xl font-bold" style={{ color: "var(--ink)" }}>
            Nice work.
          </h1>

          {streakDays > 0 && (
            <p className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
              🔥 {streakDays} day streak
            </p>
          )}

          {/* Cliffhanger teaser */}
          <div
            className="w-full max-w-sm rounded-2xl p-5 text-left"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--hairline)",
              borderLeft: "3px solid var(--mark)",
            }}
          >
            <p className="font-label mb-2" style={{ color: "var(--mark)" }}>Tomorrow's teaser</p>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "var(--ink-soft)",
                filter: "blur(4px)",
                opacity: 0.85,
                userSelect: "none",
              }}
            >
              The next concept waits for you…
            </p>
          </div>

          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={() => router.push("/explore")}
              className="flex-1 rounded-full py-3 text-sm font-semibold"
              style={{ background: "var(--mark)", color: "var(--bg)" }}
            >
              Explore more →
            </button>
            <button
              onClick={() => router.push("/topics")}
              className="flex-1 rounded-full py-3 text-sm font-semibold"
              style={{
                background: "var(--bg-elev)",
                color: "var(--ink)",
                border: "1px solid var(--hairline)",
              }}
            >
              Browse topics
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── No cards ─────────────────────────────────────────────────────────────
  if (!sessionData || !sessionData.cards.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--ink-mute)" }}>No session for today.</p>
        <BottomNav />
      </div>
    );
  }

  // ── Main session ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Streak milestone overlay */}
      {milestone && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center"
          style={{ background: "var(--bg)" }}
        >
          <span className="text-7xl animate-pulse mb-4">🔥</span>
          <h2 className="font-display text-5xl font-bold mb-2" style={{ color: "var(--ink)" }}>
            {milestone} day streak!
          </h2>
          <p className="font-label" style={{ color: "var(--mark)" }}>Keep the fire going</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: "var(--bg-elev)" }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            background: "var(--mark)",
            width: `${(1 / sessionData.cards.length) * 100}%`,
          }}
        />
      </div>

      {/* Topic switcher pills — shown when multiple active curricula */}
      {curricula.length > 1 && (
        <div className="flex gap-2 px-4 pt-4 overflow-x-auto no-scrollbar">
          {curricula.map((c) => (
            <button
              key={c.id}
              onClick={() => switchCurriculum(c.id)}
              className="flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: selectedId === c.id ? "var(--accent)" : "var(--bg-elev)",
                color: selectedId === c.id ? "var(--bg)" : "var(--ink-mute)",
              }}
            >
              {c.emoji ?? "📘"} {c.topic}
            </button>
          ))}
        </div>
      )}

      {/* Session header */}
      {(sessionData.week_number != null || sessionData.day_number != null) && (
        <p className="font-label px-4 pt-3" style={{ color: "var(--ink-mute)" }}>
          {sessionData.week_number != null && `Week ${sessionData.week_number}`}
          {sessionData.week_number != null && sessionData.day_number != null && " · "}
          {sessionData.day_number != null && `Day ${sessionData.day_number}`}
        </p>
      )}

      {/* Card area */}
      <div className="flex-1 p-4 pb-20" style={{ position: "relative" }}>
        <CardReel
          cards={sessionData.cards as never}
          onComplete={handleComplete}
        />
      </div>

      <BottomNav />
    </div>
  );
}
