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
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span
          className="font-label px-2 py-0.5 rounded-full"
          style={{ background: "var(--bg-elev)", color: "var(--ink-mute)" }}
        >
          Review
        </span>
        <span className="font-label" style={{ color: "var(--ink-mute)" }}>Due today</span>
      </div>

      <p
        className="font-display text-xl font-bold leading-snug flex-1"
        style={{ color: "var(--ink)" }}
      >
        {question}
      </p>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-full py-3 font-semibold text-sm"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
          }}
        >
          Show Answer
        </button>
      ) : (
        <>
          <div
            className="rounded-2xl p-4 mark-rule"
            style={{ background: "var(--bg-elev)" }}
          >
            <p className="text-sm" style={{ color: "var(--ink)" }}>{answer}</p>
          </div>

          <p className="font-label text-center" style={{ color: "var(--ink-mute)" }}>
            How well did you remember?
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onGrade(1)}
              className="rounded-full py-3 text-sm font-semibold"
              style={{
                background: "rgba(224,123,123,0.12)",
                color: "var(--danger)",
                border: "1px solid var(--danger)",
              }}
            >
              Forgot
            </button>
            <button
              onClick={() => onGrade(3)}
              className="rounded-full py-3 text-sm font-semibold"
              style={{
                background: "rgba(217,150,112,0.12)",
                color: "var(--mark)",
                border: "1px solid var(--mark)",
              }}
            >
              Hard
            </button>
            <button
              onClick={() => onGrade(5)}
              className="rounded-full py-3 text-sm font-semibold"
              style={{
                background: "rgba(123,181,150,0.12)",
                color: "var(--good)",
                border: "1px solid var(--good)",
              }}
            >
              Easy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
