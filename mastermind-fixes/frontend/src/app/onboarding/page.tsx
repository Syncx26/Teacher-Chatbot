"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { startOnboarding, answerOnboarding, buildCurriculum, setAuthToken } from "@/lib/api";
import { readStream } from "@/lib/stream";

type Step = "setup" | "questions" | "building";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const userId = useStore((s) => s.userId);
  const resolvedUserId = userId || user?.id || null;

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
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureToken(): Promise<boolean> {
    try {
      const token = await getToken();
      setAuthToken(token);
      return !!token;
    } catch {
      return false;
    }
  }

  async function startSetup() {
    if (!topic.trim() || !resolvedUserId || starting || !isLoaded) return;
    setStarting(true);
    setError(null);
    try {
      if (!(await ensureToken())) {
        setError("Sign-in hasn't finished. Give it a second and try again.");
        return;
      }
      const data = await startOnboarding(topic, durationWeeks, weekdayMinutes, weekendMinutes);
      if (!data?.question) {
        setError("Couldn't start onboarding. Please try again.");
        return;
      }
      setQuestion(data.question);
      setQuestionStep(data.step);
      setTotalQuestions(data.total);
      setStep("questions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await ensureToken();
      const data = await answerOnboarding(answer);
      setAnswer("");

      if (data.done) {
        setStep("building");
        const response = await buildCurriculum(resolvedUserId!);
        let buildError: string | null = null;
        let navigated = false;
        await readStream(response, (chunk) => {
          if (chunk.startsWith("[DONE:")) {
            const curriculumId = chunk.slice(6, -1);
            localStorage.setItem("curriculum_id", curriculumId);
            navigated = true;
            router.push("/today");
          } else if (chunk.startsWith("[ERROR")) {
            buildError = chunk.includes("invalid_json")
              ? "The curriculum came back malformed. Try again with a shorter topic."
              : chunk.includes("invalid_schema")
              ? "The curriculum was incomplete. Try again."
              : "Something went wrong saving the curriculum. Try again.";
          } else {
            setBuildingText((t) => t + chunk);
          }
        });
        if (!navigated) {
          setStep("setup");
          setError(buildError ?? "Build stopped unexpectedly. Please try again.");
        }
      } else if (data.question) {
        setQuestion(data.question);
        setQuestionStep(data.step);
      } else {
        setError("Unexpected response. Please try again.");
      }
    } catch (e) {
      setStep("setup");
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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

        {error && (
          <p className="text-sm mb-3 text-center" style={{ color: "var(--danger, #EF4444)" }}>
            {error}
          </p>
        )}

        <button
          onClick={startSetup}
          disabled={!topic.trim() || starting || !isLoaded}
          className="w-full rounded-full py-4 font-semibold text-base transition-opacity"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: !topic.trim() || starting || !isLoaded ? 0.4 : 1,
          }}
        >
          {starting ? "Setting up…" : "Build My Curriculum →"}
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

        {error && (
          <p className="text-sm mb-3 text-center" style={{ color: "var(--danger, #EF4444)" }}>
            {error}
          </p>
        )}

        <button
          onClick={submitAnswer}
          disabled={!answer.trim() || submitting}
          className="w-full rounded-full py-4 font-semibold text-base transition-opacity"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: !answer.trim() || submitting ? 0.4 : 1,
          }}
        >
          {submitting ? "Saving…" : "Next →"}
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
