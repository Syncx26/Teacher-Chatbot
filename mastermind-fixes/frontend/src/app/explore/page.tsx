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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ background: "var(--bg)" }}
      >
        <p className="font-display text-2xl font-bold mb-2" style={{ color: "var(--ink)" }}>
          Unlock Explore
        </p>
        <p className="text-sm" style={{ color: "var(--ink-mute)" }}>
          Complete today's session to reveal your reward cards.
        </p>
        <BottomNav />
      </div>
    );
  }

  const card = cards[index] as { subtype: string; title: string; body: string; source?: string };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex-1 p-4 pb-20 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold" style={{ color: "var(--ink)" }}>Explore</h2>
          <span className="font-label" style={{ color: "var(--ink-mute)" }}>
            {index + 1} / {cards.length}
          </span>
        </div>

        <div
          className="flex-1 rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
        >
          <ExploreCard content={card} />
        </div>

        <div className="flex gap-3 mt-4">
          {index > 0 && (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="flex-1 rounded-full py-3 text-sm font-semibold"
              style={{ background: "var(--bg-elev)", color: "var(--ink)" }}
            >
              ← Prev
            </button>
          )}
          {index + 1 < cards.length && (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="flex-1 rounded-full py-3 text-sm font-semibold"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
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
