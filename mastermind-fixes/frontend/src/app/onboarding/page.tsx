"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { startOnboarding, answerOnboarding, buildCurriculum } from "@/lib/api";
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

  async function startSetup() {
    if (!topic.trim() || !userId) return;
    const data = await startOnboarding(topic, durationWeeks, weekdayMinutes, weekendMinutes);
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
      <main className="min-h-screen flex flex-col p-6 pt-16 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          What do you want to master?
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Type any topic — your AI tutor will build a personalised curriculum.
        </p>

        <input
          className="w-full rounded-xl px-4 py-3 text-base outline-none mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          placeholder="e.g. Machine Learning, Stoicism, Public Speaking…"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") startSetup(); }}
        />

        <div className="grid grid-cols-3 gap-3 mb-8">
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Duration</span>
            <select
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
            >
              {[1, 2, 4, 6, 8, 12].map((w) => (
                <option key={w} value={w}>{w} weeks</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Weekday</span>
            <select
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              value={weekdayMinutes}
              onChange={(e) => setWeekdayMinutes(Number(e.target.value))}
            >
              {[10, 15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Weekend</span>
            <select
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              value={weekendMinutes}
              onChange={(e) => setWeekendMinutes(Number(e.target.value))}
            >
              {[0, 10, 20, 30].map((m) => (
                <option key={m} value={m}>{m === 0 ? "Off" : `${m} min`}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={startSetup}
          disabled={!topic.trim()}
          className="w-full rounded-xl py-4 font-semibold text-base"
          style={{ background: "var(--accent)", color: "#fff", opacity: !topic.trim() ? 0.5 : 1 }}
        >
          Build My Curriculum →
        </button>
      </main>
    );
  }

  if (step === "questions") {
    return (
      <main className="min-h-screen flex flex-col p-6 pt-16 max-w-md mx-auto">
        <div className="flex gap-1 mb-8">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i < questionStep ? "var(--accent)" : "var(--border)" }}
            />
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--accent)" }}>
          Quick question {questionStep + 1} of {totalQuestions}
        </p>

        <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
          {question}
        </h2>

        <textarea
          className="w-full rounded-xl p-4 text-base resize-none outline-none mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: 140 }}
          placeholder="Your answer…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          autoFocus
        />

        <button
          onClick={submitAnswer}
          disabled={!answer.trim()}
          className="w-full rounded-xl py-4 font-semibold text-base"
          style={{ background: "var(--accent)", color: "#fff", opacity: !answer.trim() ? 0.5 : 1 }}
        >
          Next →
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "var(--accent)" }}>
        <span className="text-2xl">⚡</span>
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Building your curriculum…
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
        Opus is designing your personalised learning path
      </p>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-alt)" }}>
        <div className="h-full rounded-full animate-pulse" style={{ background: "var(--accent)", width: "60%" }} />
      </div>
    </main>
  );
}
