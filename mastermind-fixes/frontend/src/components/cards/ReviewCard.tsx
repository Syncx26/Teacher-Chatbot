"use client";

import { useState } from "react";

interface Props {
  content: {
    original_card_id: string;
    content: {
      title?: string;
      prompt?: string;
      question?: string;
      answer?: string;
      explanation?: string;
    };
    due_date: string;
  };
  onGrade: (grade: number) => void;
}

export function ReviewCard({ content, onGrade }: Props) {
  const [revealed, setRevealed] = useState(false);
  const original = content.content;
  const question = original.title ?? original.prompt ?? original.question ?? "Review";
  const answer = original.answer ?? original.explanation ?? "";

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}>
          Review
        </span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Due today
        </span>
      </div>

      <p className="text-lg font-medium leading-snug flex-1" style={{ color: "var(--text-primary)" }}>
        {question}
      </p>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-xl py-3 font-semibold text-sm"
          style={{ background: "var(--surface-alt)", color: "var(--text-primary)" }}
        >
          Show Answer
        </button>
      ) : (
        <>
          <div className="rounded-xl p-4" style={{ background: "var(--surface-alt)" }}>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{answer}</p>
          </div>
          <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
            How well did you remember?
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => onGrade(1)} className="rounded-xl py-3 text-sm font-semibold"
              style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)" }}>
              Forgot
            </button>
            <button onClick={() => onGrade(3)} className="rounded-xl py-3 text-sm font-semibold"
              style={{ background: "rgba(245,158,11,0.15)", color: "var(--warning)" }}>
              Hard
            </button>
            <button onClick={() => onGrade(5)} className="rounded-xl py-3 text-sm font-semibold"
              style={{ background: "rgba(16,185,129,0.15)", color: "var(--success)" }}>
              Easy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
