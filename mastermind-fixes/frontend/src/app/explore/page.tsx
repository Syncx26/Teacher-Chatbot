"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getExploreCards } from "@/lib/api";
import { ExploreCard } from "@/components/cards/ExploreCard";
import { BottomNav } from "@/components/BottomNav";

export default function ExplorePage() {
  const userId = useStore((s) => s.userId);
  const [cards, setCards] = useState<unknown[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getExploreCards(userId)
      .then((data) => { setCards(data.cards ?? []); setLoading(false); })
      .catch(console.error);
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)" }} />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--background)" }}>
        <p style={{ color: "var(--text-secondary)" }}>Complete today's session to unlock Explore.</p>
        <BottomNav />
      </div>
    );
  }

  const card = cards[index] as { subtype: string; title: string; body: string; source?: string };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <div className="flex-1 p-4 pb-20 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Explore</h2>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {index + 1} / {cards.length}
          </span>
        </div>

        <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: "var(--surface)" }}>
          <ExploreCard content={card} />
        </div>

        <div className="flex gap-3 mt-4">
          {index > 0 && (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold"
              style={{ background: "var(--surface-alt)", color: "var(--text-primary)" }}
            >
              ← Previous
            </button>
          )}
          {index + 1 < cards.length && (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Next →
            </button>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
