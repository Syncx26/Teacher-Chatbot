"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { startOnboarding, answerOnboarding, buildCurriculum, ingestUrl } from "@/lib/api";
import { readStream } from "@/lib/stream";

type Step = "setup" | "questions" | "building";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const userId = useStore((s) => s.userId);

  const [step, setStep] = useState<Step>("setup");
  const [topic, setTopic] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [weekdayMinutes, setWeekdayMinutes] = useState(20);
  const [weekendMinutes, setWeekendMinutes] = useState(0);

  const [question, setQuestion] = useState("");
  const [questionStep, setQuestionStep] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [answer, setAnswer] = useState("");
  const [buildingText, setBuildingText] = useState("");

  // URL/YouTube context ingestion
  const [contextUrl, setContextUrl] = useState("");
  const [contextText, setContextText] = useState("");
  const [contextStatus, setContextStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [showUrlInput, setShowUrlInput] = useState(false);

  async function fetchUrlContext() {
    if (!contextUrl.trim()) return;
    setContextStatus("loading");
    try {
      const data = await ingestUrl(contextUrl.trim());
      setContextText(data.text);
      setContextStatus("done");
    } catch (e: unknown) {
      setContextStatus("error");
      const message = e instanceof Error ? e.message : String(e);
      console.error("Ingest error:", message);
    }
  }

  async function startSetup() {
    if (!topic.trim() || !userId) return;
    const data = await startOnboarding(topic, durationWeeks, weekdayMinutes, weekendMinutes, contextText || undefined);
    setQuestion(data.question);
    setQuestionStep(data.step);
    setTotalQuestions(data.total);
    setStep("questions");
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    const data = await answerOnboarding(answer);
    setAnswer("");

    if (data.done) {
      setStep("building");
      const response = await buildCurriculum(userId!);
      await readStream(response, (chunk) => {
        if (chunk.startsWith("[DONE:")) {
          const curriculumId = chunk.slice(6, -1);
          localStorage.setItem("curriculum_id", curriculumId);
          router.push("/today");
        } else if (!chunk.startsWith("[ERROR")) {
          setBuildingText((t) => t + chunk);
        }
      });
    } else {
      setQuestion(data.question);
      setQuestionStep(data.step);
    }
  }

  if (step === "setup") {
    return (
      <main className="min-h-screen flex flex-col p-6 pt-16 max-w-md mx-auto" style={{ background: "var(--bg)" }}>
        <p className="font-label mb-3" style={{ color: "var(--mark)" }}>
          New curriculum
        </p>
        <h1
          className="font-display text-4xl font-bold leading-tight mb-3"
          style={{ color: "var(--ink)" }}
        >
          What do you want to master?
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--ink-mute)" }}>
          Any topic — your AI tutor builds a personalised learning path.
        </p>

        <input
          className="w-full rounded-2xl px-4 py-3 text-base outline-none mb-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--hairline)",
            color: "var(--ink)",
          }}
          placeholder="e.g. Machine Learning, Stoicism, Public Speaking…"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") startSetup(); }}
          autoFocus
        />

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Duration", value: durationWeeks, options: [1,2,4,6,8,12], fmt: (v: number) => `${v}w`, set: setDurationWeeks },
            { label: "Weekday", value: weekdayMinutes, options: [10,15,20,30,45,60], fmt: (v: number) => `${v}m`, set: setWeekdayMinutes },
            { label: "Weekend", value: weekendMinutes, options: [0,10,20,30], fmt: (v: number) => v === 0 ? "Off" : `${v}m`, set: setWeekendMinutes },
          ].map(({ label, value, options, fmt, set }) => (
            <label key={label} className="flex flex-col gap-1">
              <span className="font-label" style={{ color: "var(--ink-mute)" }}>{label}</span>
              <select
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--hairline)",
                  color: "var(--ink)",
                }}
                value={value}
                onChange={(e) => set(Number(e.target.value))}
              >
                {options.map((v) => (
                  <option key={v} value={v}>{fmt(v)}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {/* Optional URL context */}
        <div className="mb-4">
          <button
            onClick={() => setShowUrlInput((v) => !v)}
            className="text-sm underline"
            style={{ color: "var(--accent)" }}
          >
            {showUrlInput ? "▼" : "▶"} Add URL or YouTube for context (optional)
          </button>

          {showUrlInput && (
            <div className="mt-3 flex flex-col gap-2">
              <input
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--hairline)",
                  color: "var(--ink)",
                }}
                placeholder="https://youtube.com/watch?v=... or any URL"
                value={contextUrl}
                onChange={(e) => setContextUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") fetchUrlContext(); }}
              />
              <button
                onClick={fetchUrlContext}
                disabled={!contextUrl.trim() || contextStatus === "loading"}
                className="rounded-full py-2 text-sm font-semibold transition-opacity"
                style={{
                  background: "var(--bg-elev)",
                  color: "var(--ink)",
                  border: "1px solid var(--hairline)",
                  opacity: !contextUrl.trim() ? 0.4 : 1,
                }}
              >
                {contextStatus === "loading" ? "Fetching…" : "Extract Content"}
              </button>
              {contextStatus === "done" && (
                <p className="text-xs" style={{ color: "var(--good)" }}>
                  ✓ Context extracted — Opus will ground your curriculum in this material
                </p>
              )}
              {contextStatus === "error" && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>
                  Could not fetch URL. Curriculum will still be built without it.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={startSetup}
          disabled={!topic.trim()}
          className="w-full rounded-full py-4 font-semibold text-base transition-opacity"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: !topic.trim() ? 0.4 : 1,
          }}
        >
          Build My Curriculum →
        </button>
      </main>
    );
  }

  if (step === "questions") {
    return (
      <main className="min-h-screen flex flex-col p-6 pt-16 max-w-md mx-auto" style={{ background: "var(--bg)" }}>
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i < questionStep ? "var(--mark)" : "var(--hairline)" }}
            />
          ))}
        </div>

        <p className="font-label mb-4" style={{ color: "var(--mark)" }}>
          Question {questionStep + 1} of {totalQuestions}
        </p>

        <h2
          className="font-display text-3xl font-bold leading-tight mb-6"
          style={{ color: "var(--ink)" }}
        >
          {question}
        </h2>

        <textarea
          className="w-full rounded-2xl p-4 text-base resize-none outline-none mb-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--hairline)",
            color: "var(--ink)",
            minHeight: 140,
          }}
          placeholder="Your answer…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          autoFocus
        />

        <button
          onClick={submitAnswer}
          disabled={!answer.trim()}
          className="w-full rounded-full py-4 font-semibold text-base transition-opacity"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: !answer.trim() ? 0.4 : 1,
          }}
        >
          Next →
        </button>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "var(--mark)" }}
      >
        <span className="text-2xl font-display font-bold" style={{ color: "var(--bg)" }}>⚡</span>
      </div>
      <h2
        className="font-display text-3xl font-bold mb-2"
        style={{ color: "var(--ink)" }}
      >
        Building your curriculum…
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--ink-mute)" }}>
        Opus is designing your personalised learning path
      </p>
      <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elev)" }}>
        <div
          className="h-full rounded-full animate-pulse"
          style={{ background: "var(--mark)", width: "60%" }}
        />
      </div>
      {buildingText && (
        <p className="text-xs mt-6 text-left w-full" style={{ color: "var(--ink-mute)" }}>
          {buildingText.slice(-200)}
        </p>
      )}
    </main>
  );
}
