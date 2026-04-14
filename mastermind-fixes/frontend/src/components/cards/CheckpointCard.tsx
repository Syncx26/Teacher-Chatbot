"use client";

import { useState } from "react";
import { gradeCheckpoint } from "@/lib/api";
import { readStream } from "@/lib/stream";
import { hapticSuccess, hapticError } from "@/lib/haptics";
import { useStore } from "@/lib/store";

interface Props {
  cardId: string;
  content: {
    question: string;
    rubric?: string;
    passing_threshold?: number;
  };
  onPass: () => void;
}

type State = "input" | "grading" | "passed" | "failed";

export function CheckpointCard({ cardId, content, onPass }: Props) {
  const { language, englishLevel } = useStore();
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<State>("input");
  const [feedback, setFeedback] = useState("");
  const [remediation, setRemediation] = useState("");

  async function submit() {
    if (!answer.trim()) return;
    setState("grading");
    setRemediation("");

    const response = await gradeCheckpoint(cardId, answer, language, englishLevel);

    let firstChunk = true;
    let resultData: { passed: boolean; score: number; feedback: string } | null = null;

    await readStream(response, (chunk) => {
      if (firstChunk) {
        try {
          resultData = JSON.parse(chunk);
          firstChunk = false;
          if (resultData!.passed) {
            hapticSuccess();
            setFeedback(resultData!.feedback);
            setState("passed");
          } else {
            hapticError();
            setFeedback(resultData!.feedback);
            setState("failed");
          }
        } catch {
          // Streaming remediation text
          setRemediation((r) => r + chunk);
        }
      } else {
        setRemediation((r) => r + chunk);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: "var(--danger)", color: "#fff" }}>
          Checkpoint
        </span>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Must pass to continue
        </span>
      </div>

      <p className="text-lg font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
        {content.question}
      </p>

      {state === "input" && (
        <>
          <textarea
            className="flex-1 w-full rounded-xl p-3 text-sm resize-none outline-none"
            style={{ background: "var(--surface-alt)", color: "var(--text-primary)", minHeight: 120 }}
            placeholder="Write your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button
            onClick={submit}
            disabled={!answer.trim()}
            className="w-full rounded-xl py-3 font-semibold text-sm"
            style={{ background: "var(--accent)", color: "#fff", opacity: !answer.trim() ? 0.5 : 1 }}
          >
            Submit
          </button>
        </>
      )}

      {state === "grading" && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Grading…</p>
        </div>
      )}

      {state === "passed" && (
        <>
          <div className="rounded-xl p-4" style={{ background: "var(--success)", opacity: 0.15, position: "absolute", inset: 0, borderRadius: 16 }} />
          <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.15)" }}>
            <p className="font-semibold" style={{ color: "var(--success)" }}>✓ Passed</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>{feedback}</p>
          </div>
          <button
            onClick={onPass}
            className="w-full rounded-xl py-3 font-semibold text-sm mt-auto"
            style={{ background: "var(--success)", color: "#fff" }}
          >
            Continue →
          </button>
        </>
      )}

      {state === "failed" && (
        <>
          <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.1)" }}>
            <p className="font-semibold" style={{ color: "var(--danger)" }}>Not quite</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>{feedback}</p>
          </div>
          {remediation && (
            <div className="rounded-xl p-4" style={{ background: "var(--surface-alt)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
                Let's try another angle
              </p>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>{remediation}</p>
            </div>
          )}
          <button
            onClick={() => { setState("input"); setAnswer(""); }}
            className="w-full rounded-xl py-3 font-semibold text-sm mt-auto"
            style={{ background: "var(--surface-alt)", color: "var(--text-primary)" }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
