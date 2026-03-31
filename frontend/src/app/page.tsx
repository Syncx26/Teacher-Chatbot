"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";
import { useAppStore } from "@/lib/store";
import { resetProgress } from "@/lib/api";

const WEEK_TOPICS = [
  { week: 1, name: "Python & JSON" },
  { week: 2, name: "REST APIs" },
  { week: 3, name: "SQLite" },
  { week: 4, name: "LLM APIs" },
  { week: 5, name: "RAG" },
  { week: 6, name: "LangGraph" },
  { week: 7, name: "LangSmith" },
  { week: 8, name: "MCP" },
  { week: 9, name: "Multi-Agent" },
  { week: 10, name: "Autonomous" },
  { week: 11, name: "Dashboard" },
  { week: 12, name: "Ship It" },
];

export default function GatewayPage() {
  const [prompt, setPrompt] = useState("");
  const [curriculumGoal, setCurriculumGoal] = useState("");
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { userId, setProgress } = useAppStore();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim()) {
      sessionStorage.setItem("synapse_pending_msg", prompt.trim());
    }
    router.push("/tutor");
  }

  async function handleCreateCurriculum(e: React.FormEvent) {
    e.preventDefault();
    if (!curriculumGoal.trim()) return;
    setResetting(true);
    try {
      const progress = await resetProgress(userId);
      setProgress({ current_week: progress.current_week, xp: progress.xp, completed_weeks: progress.completed_weeks });
      sessionStorage.setItem(
        "synapse_pending_msg",
        `I want to create a new 12-week learning curriculum focused on: ${curriculumGoal.trim()}. Please design the full week-by-week plan with topics, goals, and what I'll build each week. Tailor it based on what you know about me.`
      );
      setShowCurriculumModal(false);
      router.push("/tutor");
    } catch (err) {
      console.error("Reset failed:", err);
      setResetting(false);
    }
  }

  const isDark = theme === "dark";

  return (
    <main className="min-h-screen cyber-bg relative overflow-hidden flex flex-col items-center justify-center px-6 py-12">
      {/* Background */}
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-40" />
      <div className="prism-orb top-[-10%] right-[-10%]" />
      <div className="prism-orb bottom-[-10%] left-[-10%] opacity-20" />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full glass-panel-prism text-[10px] sm:text-xs font-mono tracking-[0.3em] uppercase text-primary border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Nova Online
          </div>

          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter mb-2 leading-none text-white italic">
            SYNAPSE<span className="text-primary">X</span>
          </h1>

          <div className="flex items-center justify-center gap-4 mb-8">
            <h2 className="text-xl sm:text-2xl font-light tracking-[0.5em] uppercase text-gray-400">
              Chat · Build · Research
            </h2>
          </div>

          <p className="max-w-xl mx-auto text-gray-400 text-sm sm:text-base leading-relaxed font-light">
            Your personal AI tutor for the 12-week AI engineering curriculum. Ask anything — Nova has you covered.
          </p>
        </motion.div>

        {/* Command Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl mb-12"
        >
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative glass-panel-prism rounded-2xl p-1 flex items-center gap-1">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Nova anything about the curriculum..."
                className="flex-1 bg-transparent border-none px-6 py-4 text-white placeholder-gray-600 focus:outline-none text-base sm:text-lg font-light"
              />
              <button
                type="submit"
                className="bg-primary text-black px-8 py-4 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-white transition-all duration-300 active:scale-95"
              >
                Ask →
              </button>
            </div>
          </form>
        </motion.div>

        {/* Roadmap Grid */}
        <div className="w-full mb-10">
          <div className="flex items-center justify-between mb-6 px-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">12-Week Curriculum</p>
            <div className="h-[1px] flex-1 mx-4 bg-white/5" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {WEEK_TOPICS.map(({ week, name }) => (
              <motion.button
                key={week}
                onClick={() => router.push("/tutor")}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative glass-panel-prism rounded-xl p-4 text-left overflow-hidden border-white/5 hover:border-primary/40 transition-all duration-300"
              >
                <div className="text-[9px] font-mono text-primary/50 uppercase tracking-tighter mb-1">Week 0{week}</div>
                <div className="text-xs font-bold text-white group-hover:text-primary transition-colors leading-tight uppercase">
                  {name}
                </div>
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-hover:w-full transition-all duration-500" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={() => router.push("/tutor")}
            className="px-12 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-primary transition-all duration-300 shadow-xl"
          >
            Start Chat
          </button>
          <button
            onClick={() => router.push("/research")}
            className="px-12 py-4 glass-panel-prism text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/5 transition-all duration-300 border-white/10"
          >
            Research
          </button>

          {/* Create New Curriculum — prominent CTA */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCurriculumModal(true)}
            className="relative px-12 py-4 rounded-xl font-black uppercase tracking-widest text-xs overflow-hidden group"
            style={{ background: "linear-gradient(135deg, #9d00ff 0%, #ff00ff 60%, #00f5ff 100%)" }}
          >
            <span className="relative z-10 text-white">+ Create New Curriculum</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(135deg, #00f5ff 0%, #ff00ff 60%, #9d00ff 100%)" }} />
          </motion.button>
        </div>
      </div>

      {/* Create Curriculum Modal */}
      <AnimatePresence>
        {showCurriculumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCurriculumModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl p-8 relative ${isDark ? "glass-panel-prism" : "bg-white shadow-2xl border border-gray-200"}`}
            >
              {/* Close */}
              <button
                onClick={() => setShowCurriculumModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl leading-none"
              >
                ✕
              </button>

              <div className="mb-6">
                <div className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] mb-2">New Curriculum</div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
                  What do you want to learn?
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Nova will design a custom 12-week curriculum around your goal — tailored to what you already know.
                </p>
              </div>

              {/* What happens info box */}
              <div className={`rounded-xl p-4 mb-6 text-xs leading-relaxed space-y-1 ${isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200"}`}>
                <div className="font-bold text-primary uppercase tracking-wider mb-2 text-[10px]">What happens</div>
                <div className="flex items-start gap-2 text-gray-400">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Nova remembers everything you&apos;ve learned and built — memories carry over</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <span className="text-primary mt-0.5">↺</span>
                  <span>Week progress and XP reset to 0 so you start fresh</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <span className="text-secondary mt-0.5">⬡</span>
                  <span>Nova builds your new plan using your past struggles and strengths</span>
                </div>
              </div>

              <form onSubmit={handleCreateCurriculum} className="space-y-4">
                <div className="relative">
                  <input
                    value={curriculumGoal}
                    onChange={(e) => setCurriculumGoal(e.target.value)}
                    placeholder="e.g. React + TypeScript, Backend with Django, Mobile development..."
                    className={`w-full rounded-xl px-5 py-4 text-sm font-light focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      isDark
                        ? "bg-white/5 border border-white/10 text-white placeholder-gray-600"
                        : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400"
                    }`}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!curriculumGoal.trim() || resetting}
                  className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #9d00ff, #ff00ff)" }}
                >
                  {resetting ? "Creating..." : "Create Curriculum →"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
