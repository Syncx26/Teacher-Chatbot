"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, Curriculum, CurriculumWeek } from "@/lib/store";
import { generateCurriculum, saveCurriculum, listCurriculums } from "@/lib/api";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";

type Step = "form" | "generating" | "preview" | "saving";

export default function NewCurriculumPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { userId, activeCurriculum, setCurriculum, setProgress } = useAppStore();
  const isDark = theme === "dark";

  const [step, setStep] = useState<Step>("form");
  const [goal, setGoal] = useState("");
  const [keepCurrent, setKeepCurrent] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState("");

  const hasExisting = activeCurriculum?.id != null;

  const bg = isDark ? "bg-[#010101] text-white" : "bg-gray-50 text-gray-900";
  const card = isDark ? "glass-panel-prism" : "bg-white border border-gray-200 shadow-sm";
  const muted = isDark ? "text-gray-400" : "text-gray-500";
  const inputCls = isDark
    ? "bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-primary/50"
    : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-primary/50";

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setError("");
    setStep("generating");
    try {
      const generated = await generateCurriculum(userId, goal.trim());
      setPlan(generated);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Generation failed. Try again.");
      setStep("form");
    }
  }

  async function handleConfirm() {
    setStep("saving");
    try {
      const saved = await saveCurriculum(userId, plan.name, goal, plan.weeks, keepCurrent) as any;
      setCurriculum(saved as Curriculum);
      setProgress({ current_week: 1, xp: 0, completed_weeks: [] });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Save failed.");
      setStep("preview");
    }
  }

  return (
    <div className={`min-h-screen ${bg} cyber-bg`}>
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-20" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => step === "preview" ? setStep("form") : router.push("/curriculum")}
              className={`p-2 rounded-xl transition-colors ${isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] mb-0.5">
                {step === "form" ? "Step 1 — Goal" : step === "generating" ? "Step 2 — Generating" : "Step 2 — Preview"}
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                {step === "preview" ? plan?.name : "New Curriculum"}
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* ── STEP: Form ── */}
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <form onSubmit={handleGenerate} className="space-y-5">
                <div className={`rounded-2xl p-6 ${card}`}>
                  <label className={`block text-xs font-mono uppercase tracking-widest ${muted} mb-3`}>
                    What do you want to learn?
                  </label>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. React + TypeScript for building web apps, Backend with FastAPI and PostgreSQL, iOS development with Swift..."
                    rows={3}
                    autoFocus
                    className={`w-full rounded-xl px-5 py-4 text-sm font-light focus:outline-none resize-none ${inputCls}`}
                  />
                </div>

                {hasExisting && (
                  <div className={`rounded-2xl p-5 ${card}`}>
                    <div className={`text-xs font-mono uppercase tracking-widest ${muted} mb-3`}>Current curriculum</div>
                    <div className="font-bold mb-1">{activeCurriculum?.name}</div>
                    <p className={`text-xs ${muted} mb-4`}>{activeCurriculum?.goal}</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          checked={keepCurrent}
                          onChange={() => setKeepCurrent(true)}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <div className="text-sm font-semibold">Keep it saved</div>
                          <div className={`text-xs ${muted}`}>Archive the current curriculum — you can switch back any time</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          checked={!keepCurrent}
                          onChange={() => setKeepCurrent(false)}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <div className="text-sm font-semibold text-red-400">Delete it</div>
                          <div className={`text-xs ${muted}`}>Permanently remove the current curriculum</div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={!goal.trim()}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #9d00ff, #ff00ff)" }}
                >
                  Generate Curriculum →
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP: Generating ── */}
          {step === "generating" && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`rounded-2xl p-10 text-center ${card}`}
            >
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #9d00ff30, #ff00ff30)" }}>
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#ff00ff", borderTopColor: "transparent" }} />
              </div>
              <div className="font-black text-lg mb-2">Designing your curriculum...</div>
              <div className={`text-sm ${muted}`}>Nova is building a personalised 12-week plan</div>
              <div className={`text-xs font-mono mt-3 ${muted}`}>&ldquo;{goal}&rdquo;</div>
            </motion.div>
          )}

          {/* ── STEP: Preview ── */}
          {step === "preview" && plan && (
            <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className={`rounded-2xl p-5 mb-4 ${card}`}>
                <div className={`text-xs ${muted} mb-1`}>{plan.goal}</div>
                <div className="text-sm">Review the plan below. Confirm to save and activate it.</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {(plan.weeks as CurriculumWeek[]).map((w) => (
                  <motion.div
                    key={w.week}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: w.week * 0.04 }}
                    className={`rounded-xl p-4 ${card}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center flex-shrink-0">
                        {w.week}
                      </div>
                      <div className="font-bold text-sm truncate">{w.name}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {w.topics.map((t, i) => (
                        <span key={i} className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className={`text-[10px] ${muted} flex items-start gap-1`}>
                      <span className="text-primary flex-shrink-0">▶</span>
                      <span className="line-clamp-1">{w.build}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isDark ? "glass-panel-prism text-gray-400 hover:text-white" : "border border-gray-200 text-gray-500 hover:text-gray-900"}`}
                >
                  ← Regenerate
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white"
                  style={{ background: "linear-gradient(135deg, #9d00ff, #ff00ff)" }}
                >
                  Confirm & Activate →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP: Saving ── */}
          {step === "saving" && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`rounded-2xl p-10 text-center ${card}`}
            >
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-primary/10">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin border-primary" style={{ borderTopColor: "transparent" }} />
              </div>
              <div className="font-black text-lg mb-2">Saving curriculum...</div>
              <div className={`text-sm ${muted}`}>Setting up your new learning journey</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
