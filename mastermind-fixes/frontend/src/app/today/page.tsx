"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { getUserCurricula, getTodaySession, completeSession } from "@/lib/api";
import { CardReel } from "@/components/CardReel";
import { BottomNav } from "@/components/BottomNav";

export default function TodayPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const userId = useStore((s) => s.userId);
  const { setCurrentSession } = useStore();

  const [sessionData, setSessionData] = useState<{ session_id: string; cards: unknown[] } | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    async function load() {
      const curricula = await getUserCurricula(userId!);
      if (!curricula.length) {
        router.push("/onboarding");
        return;
      }
      const curriculumId = curricula[0].id;
      const session = await getTodaySession(curriculumId);
      if (session.done) {
        setDone(true);
      } else {
        setSessionData(session);
        setCurrentSession(session.session_id);
      }
      setLoading(false);
    }

    load().catch(console.error);
  }, [isLoaded, userId]);

  async function handleComplete() {
    if (sessionData?.session_id) {
      await completeSession(sessionData.session_id);
    }
    setDone(true);
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)" }} />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--background)" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--surface)" }}>
          <span className="text-4xl">✦</span>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Session complete
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          See you tomorrow. The next concept is waiting.
        </p>
        <button
          onClick={() => router.push("/explore")}
          className="rounded-xl px-6 py-3 font-semibold text-sm"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Explore more →
        </button>
        <BottomNav />
      </div>
    );
  }

  if (!sessionData || !sessionData.cards.length) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p style={{ color: "var(--text-secondary)" }}>No session for today.</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: "var(--surface-alt)" }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            background: "var(--accent)",
            width: `${(sessionData.cards.length > 0 ? 1 / sessionData.cards.length : 0) * 100}%`,
          }}
        />
      </div>

      {/* Card area — fills screen minus nav */}
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
