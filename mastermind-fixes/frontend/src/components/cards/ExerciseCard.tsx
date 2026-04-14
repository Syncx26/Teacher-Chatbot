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

  function reveal() {
    setRevealed(true);
  }

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full w-fit"
        style={{ background: "var(--warning)", color: "#000" }}>
        Exercise
      </span>

      <p className="text-lg font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
        {content.prompt}
      </p>

      {!revealed ? (
        <>
          <textarea
            className="w-full rounded-xl p-3 text-sm resize-none outline-none"
            style={{ background: "var(--surface-alt)", color: "var(--text-primary)", minHeight: 100 }}
            placeholder="Type your answer…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {hintIndex < content.hints.length && (
            <button
              onClick={() => setHintIndex((i) => Math.min(i + 1, content.hints.length))}
              className="text-sm underline text-left"
              style={{ color: "var(--text-secondary)" }}
            >
              Need a hint?
            </button>
          )}

          {hintIndex > 0 && (
            <div className="rounded-xl p-3" style={{ background: "var(--surface-alt)" }}>
              {content.hints.slice(0, hintIndex).map((h, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)" }}>💡 {h}</p>
              ))}
            </div>
          )}

          <button
            onClick={reveal}
            disabled={!input.trim()}
            className="w-full rounded-xl py-3 font-semibold text-sm mt-auto"
            style={{ background: "var(--accent)", color: "#fff", opacity: !input.trim() ? 0.5 : 1 }}
          >
            Check Answer
          </button>
        </>
      ) : (
        <>
          <div className="rounded-xl p-4" style={{ background: "var(--surface-alt)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--success)" }}>
              Answer
            </p>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{content.answer}</p>
          </div>

          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{content.explanation}</p>

          <div className="flex gap-3 mt-auto">
            <button
              onClick={() => onAnswer(false)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold"
              style={{ background: "var(--surface-alt)", color: "var(--danger)" }}
            >
              Got it wrong
            </button>
            <button
              onClick={() => onAnswer(true)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold"
              style={{ background: "var(--success)", color: "#fff" }}
            >
              Got it right
            </button>
          </div>
        </>
      )}
    </div>
  );
}
