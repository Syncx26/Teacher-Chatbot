"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";
import { useAppStore, Curriculum } from "@/lib/store";
import { getActiveCurriculum } from "@/lib/api";

const DEFAULT_WEEKS = [
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
  const router = useRouter();
  const { theme } = useTheme();
  const { userId, activeCurriculum, setCurriculum } = useAppStore();

  // Load active curriculum on mount
  useEffect(() => {
    if (!userId) return;
    getActiveCurriculum(userId).then((c) => {
      setCurriculum(c as Curriculum);
    }).catch(() => {});
  }, [userId, setCurriculum]);

  const weeks = activeCurriculum?.weeks?.map((w) => ({ week: w.week, name: w.name })) ?? DEFAULT_WEEKS;
  const curriculumName = activeCurriculum?.name ?? "AI Engineering";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim()) sessionStorage.setItem("synapse_pending_msg", prompt.trim());
    router.push("/tutor");
  }

  return (
    <main className="min-h-screen cyber-bg relative overflow-hidden flex flex-col items-center justify-center px-6 py-12">
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-40" />
      <div className="prism-orb top-[-10%] right-[-10%]" />
      <div className="prism-orb bottom-[-10%] left-[-10%] opacity-20" />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Branding */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
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
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl mb-12">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative glass-panel-prism rounded-2xl p-1 flex items-center gap-1">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Nova anything about the curriculum..."
                className="flex-1 bg-transparent border-none px-6 py-4 text-white placeholder-gray-600 focus:outline-none text-base sm:text-lg font-light"
              />
              <button type="submit" className="bg-primary text-black px-8 py-4 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-white transition-all duration-300 active:scale-95">
                Ask →
              </button>
            </div>
          </form>
        </motion.div>

        {/* Roadmap Grid */}
        <div className="w-full mb-10">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">12-Week Curriculum</p>
              {activeCurriculum?.id && (
                <span className="text-[9px] font-mono text-primary/70 border border-primary/20 px-2 py-0.5 rounded-full">
                  {curriculumName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/curriculum")}
                className="text-[9px] font-mono text-gray-500 hover:text-primary transition-colors uppercase tracking-widest"
              >
                Manage →
              </button>
              <div className="h-[1px] w-16 bg-white/5" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {weeks.map(({ week, name }) => (
              <motion.button
                key={week}
                onClick={() => router.push("/tutor")}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative glass-panel-prism rounded-xl p-4 text-left overflow-hidden border-white/5 hover:border-primary/40 transition-all duration-300"
              >
                <div className="text-[9px] font-mono text-primary/50 uppercase tracking-tighter mb-1">
                  Week {String(week).padStart(2, "0")}
                </div>
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
          <button onClick={() => router.push("/tutor")} className="px-12 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-primary transition-all duration-300 shadow-xl">
            Start Chat
          </button>
          <button onClick={() => router.push("/research")} className="px-12 py-4 glass-panel-prism text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/5 transition-all duration-300 border-white/10">
            Research
          </button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/curriculum/new")}
            className="relative px-12 py-4 rounded-xl font-black uppercase tracking-widest text-xs overflow-hidden group"
            style={{ background: "linear-gradient(135deg, #9d00ff 0%, #ff00ff 60%, #00f5ff 100%)" }}
          >
            <span className="relative z-10 text-white">+ Create New Curriculum</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(135deg, #00f5ff 0%, #ff00ff 60%, #9d00ff 100%)" }} />
          </motion.button>
        </div>
      </div>
    </main>
  );
}
