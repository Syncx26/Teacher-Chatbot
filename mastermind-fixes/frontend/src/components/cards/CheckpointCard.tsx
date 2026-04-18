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
          setRemediation((r) => r + chunk);
        }
      } else {
        setRemediation((r) => r + chunk);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span
          className="font-label px-2 py-0.5 rounded-full"
          style={{ background: "rgba(224,123,123,0.15)", color: "var(--danger)" }}
        >
          Checkpoint
        </span>
        <span className="font-label" style={{ color: "var(--ink-mute)" }}>
          Must pass to continue
        </span>
      </div>

      <p
        className="font-display text-xl font-bold leading-snug"
        style={{ color: "var(--ink)" }}
      >
        {content.question}
      </p>

      {state === "input" && (
        <>
          <textarea
            className="flex-1 w-full rounded-2xl p-3 text-sm resize-none outline-none"
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--hairline)",
              color: "var(--ink)",
              minHeight: 120,
            }}
            placeholder="Write your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button
            onClick={submit}
            disabled={!answer.trim()}
            className="w-full rounded-full py-3 font-semibold text-sm transition-opacity"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              opacity: !answer.trim() ? 0.4 : 1,
            }}
          >
            Submit
          </button>
        </>
      )}

      {state === "grading" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent)" }}
            />
            <p className="font-label" style={{ color: "var(--ink-mute)" }}>Grading…</p>
          </div>
        </div>
      )}

      {state === "passed" && (
        <>
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(123,181,150,0.1)", borderLeft: "3px solid var(--good)" }}
          >
            <p className="font-label mb-1" style={{ color: "var(--good)" }}>✓ Passed</p>
            <p className="text-sm" style={{ color: "var(--ink)" }}>{feedback}</p>
          </div>
          <button
            onClick={onPass}
            className="w-full rounded-full py-3 font-semibold text-sm mt-auto"
            style={{ background: "var(--good)", color: "var(--bg)" }}
          >
            Continue →
          </button>
        </>
      )}

      {state === "failed" && (
        <>
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(224,123,123,0.1)", borderLeft: "3px solid var(--danger)" }}
          >
            <p className="font-label mb-1" style={{ color: "var(--danger)" }}>Not quite</p>
            <p className="text-sm" style={{ color: "var(--ink)" }}>{feedback}</p>
          </div>
          {remediation && (
            <div className="rounded-2xl p-4 mark-rule" style={{ background: "var(--bg-elev)" }}>
              <p className="font-label mb-2" style={{ color: "var(--mark)" }}>
                Let's try another angle
              </p>
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>{remediation}</p>
            </div>
          )}
          <button
            onClick={() => { setState("input"); setAnswer(""); }}
            className="w-full rounded-full py-3 font-semibold text-sm mt-auto"
            style={{ background: "var(--bg-elev)", color: "var(--ink)", border: "1px solid var(--hairline)" }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
