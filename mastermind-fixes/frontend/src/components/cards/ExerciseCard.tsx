"use client";

import { useState } from "react";

interface Props {
  content: {
    prompt: string;
    hints: string[];
    answer: string;
    explanation: string;
  };
  onAnswer: (correct: boolean) => void;
}

export function ExerciseCard({ content, onAnswer }: Props) {
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      {/* Badge */}
      <span
        className="font-label w-fit px-2 py-0.5 rounded-full"
        style={{ background: "rgba(217,150,112,0.15)", color: "var(--mark)" }}
      >
        Exercise
      </span>

      <p
        className="font-display text-xl font-bold leading-snug"
        style={{ color: "var(--ink)" }}
      >
        {content.prompt}
      </p>

      {!revealed ? (
        <>
          <textarea
            className="w-full rounded-2xl p-3 text-sm resize-none outline-none"
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--hairline)",
              color: "var(--ink)",
              minHeight: 100,
            }}
            placeholder="Type your answer…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {hintIndex < content.hints.length && (
            <button
              onClick={() => setHintIndex((i) => Math.min(i + 1, content.hints.length))}
              className="text-sm underline text-left"
              style={{ color: "var(--accent)" }}
            >
              Need a hint?
            </button>
          )}

          {hintIndex > 0 && (
            <div
              className="rounded-2xl p-3 mark-rule"
              style={{ background: "var(--bg-elev)" }}
            >
              {content.hints.slice(0, hintIndex).map((h, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--ink-soft)" }}>
                  💡 {h}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={() => setRevealed(true)}
            disabled={!input.trim()}
            className="w-full rounded-full py-3 font-semibold text-sm mt-auto transition-opacity"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              opacity: !input.trim() ? 0.4 : 1,
            }}
          >
            Check Answer
          </button>
        </>
      ) : (
        <>
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg-elev)", borderLeft: "3px solid var(--good)" }}
          >
            <p className="font-label mb-1" style={{ color: "var(--good)" }}>Answer</p>
            <p className="text-sm" style={{ color: "var(--ink)" }}>{content.answer}</p>
          </div>

          <p className="text-sm" style={{ color: "var(--ink-mute)" }}>{content.explanation}</p>

          <div className="flex gap-3 mt-auto">
            <button
              onClick={() => onAnswer(false)}
              className="flex-1 rounded-full py-3 text-sm font-semibold"
              style={{ background: "var(--bg-elev)", color: "var(--danger)", border: "1px solid var(--danger)" }}
            >
              Got it wrong
            </button>
            <button
              onClick={() => onAnswer(true)}
              className="flex-1 rounded-full py-3 text-sm font-semibold"
              style={{ background: "var(--good)", color: "var(--bg)" }}
            >
              Got it right
            </button>
          </div>
        </>
      )}
    </div>
  );
}
