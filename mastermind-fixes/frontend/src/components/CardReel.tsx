"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { swipeCard } from "@/lib/api";
import { hapticLight, hapticMedium, hapticHeavy } from "@/lib/haptics";
import { ConceptCard } from "./cards/ConceptCard";
import { ExerciseCard } from "./cards/ExerciseCard";
import { CheckpointCard } from "./cards/CheckpointCard";
import { ExploreCard } from "./cards/ExploreCard";
import { ReviewCard } from "./cards/ReviewCard";
import { NovaDrawer } from "./NovaDrawer";

interface Card {
  id: string;
  card_type: string;
  content: Record<string, unknown>;
}

interface Props {
  cards: Card[];
  onComplete: () => void;
}

export function CardReel({ cards, onComplete }: Props) {
  const { setNovaOpen, setCurrentCardIndex } = useStore();
  const [index, setIndex] = useState(0);
  const [checkpointLocked, setCheckpointLocked] = useState(false);
  const y = useMotionValue(0);
  const x = useMotionValue(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const card = cards[index];
  const nextCard = cards[index + 1];

  const opacity = useTransform(y, [-100, 0], [0.3, 1]);
  const scale = useTransform(y, [0, 100], [1, 0.96]);

  const isCheckpoint = card?.card_type === "checkpoint";

  function advance(grade: number) {
    if (!card) return;
    swipeCard(card.id, grade).catch(console.error);

    if (index + 1 >= cards.length) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    setCurrentCardIndex(index + 1);
    setCheckpointLocked(false);
  }

  function handleDragEnd(_: unknown, info: { offset: { y: number; x: number } }) {
    const dy = info.offset.y;
    const dx = info.offset.x;

    if (isCheckpoint && !checkpointLocked) return;

    if (dy < -60) {
      hapticMedium();
      advance(4);
    } else if (dx > 80) {
      hapticLight();
      advance(5);
    } else if (dx < -80) {
      hapticHeavy();
      advance(1);
    }

    y.set(0);
    x.set(0);
  }

  function startLongPress() {
    pressTimer.current = setTimeout(() => {
      setNovaOpen(true);
    }, 550);
  }

  function cancelLongPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  if (!card) return null;

  return (
    <div className="card-reel relative w-full h-full flex items-center justify-center">
      {/* Ghost next card */}
      {nextCard && (
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--hairline)",
            transform: "scale(0.94) translateY(14px)",
            opacity: 0.4,
            zIndex: 0,
          }}
        />
      )}

      {/* Active card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          className="absolute inset-0 rounded-3xl overflow-y-auto"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--hairline)",
            y,
            x,
            opacity,
            scale,
            zIndex: 1,
            cursor: isCheckpoint && !checkpointLocked ? "default" : "grab",
          }}
          drag={isCheckpoint && !checkpointLocked ? false : true}
          dragConstraints={{ top: 0, left: -150, right: 150, bottom: 100 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {card.card_type === "concept" && (
            <ConceptCard content={card.content as never} />
          )}
          {card.card_type === "exercise" && (
            <ExerciseCard
              content={card.content as never}
              onAnswer={(correct) => advance(correct ? 4 : 1)}
            />
          )}
          {card.card_type === "checkpoint" && (
            <CheckpointCard
              cardId={card.id}
              content={card.content as never}
              onPass={() => { setCheckpointLocked(true); advance(4); }}
            />
          )}
          {card.card_type === "explore" && (
            <ExploreCard content={card.content as never} />
          )}
          {card.card_type === "review" && (
            <ReviewCard
              content={card.content as never}
              onGrade={(grade) => advance(grade)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <NovaDrawer cardId={card.id} />
    </div>
  );
}
