"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";

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
  const router = useRouter();
  const setPendingMessage = useAppStore((s) => s.setPendingMessage);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim()) {
      setPendingMessage(prompt.trim());
    }
    router.push("/tutor");
  }

  return (
    <main className="min-h-screen cyber-bg relative overflow-hidden flex flex-col items-center justify-center px-6">
      {/* High-Contrast Mesh Background */}
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-40" />
      <div className="prism-orb top-[-10%] right-[-10%]" />
      <div className="prism-orb bottom-[-10%] left-[-10%] opacity-20" />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Branding Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full glass-panel-prism text-[10px] sm:text-xs font-mono tracking-[0.3em] uppercase text-primary border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Neural Link: Active
          </div>
          
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter mb-4 leading-none text-white italic">
            SYNAPSE
          </h1>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <h2 className="text-xl sm:text-2xl font-light tracking-[0.5em] uppercase text-gray-400">
               Chat · Code · Research
            </h2>
          </div>

          <p className="max-w-xl mx-auto text-gray-500 text-sm sm:text-base leading-relaxed font-light italic">
            Deep dive into the neural curriculum. Master the 12-week roadmap.
          </p>
        </motion.div>

        {/* Global Command Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl mb-16"
        >
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative glass-panel-prism rounded-2xl p-1 flex items-center gap-1">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Initialize session..."
                className="flex-1 bg-transparent border-none px-6 py-4 text-white placeholder-gray-600 focus:outline-none text-base sm:text-lg font-light"
              />
              <button
                type="submit"
                className="bg-primary text-black px-8 py-4 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-white transition-all duration-300 active:scale-95"
              >
                Launch
              </button>
            </div>
          </form>
        </motion.div>

        {/* Roadmap Grid */}
        <div className="w-full mb-12">
          <div className="flex items-center justify-between mb-6 px-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">12-Week Roadmap</p>
            <div className="h-[1px] flex-1 mx-4 bg-white/5" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
            {WEEK_TOPICS.map(({ week, name }, i) => (
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

        {/* Core Actions */}
        <div className="flex gap-4">
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
        </div>
      </div>
    </main>
  );
}
