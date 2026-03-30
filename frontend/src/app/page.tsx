"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/tutor");
  }

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col items-center justify-center px-4 grid-bg">
      {/* Animated background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs tracking-[0.4em] uppercase text-blue-400 mb-4">AI Curriculum Tutor</p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-widest uppercase mb-2">
            <span className="text-white">SYNAPSE</span>
          </h1>
          <h2 className="text-2xl sm:text-4xl font-light tracking-[0.3em] uppercase text-blue-400 mb-8">
            WAR ROOM
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mb-10 max-w-md mx-auto leading-relaxed">
            Your personal AI tutor for the 12-week journey to building a multi-agent geopolitical intelligence system.
          </p>
        </motion.div>

        {/* Prompt input */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative mb-12"
        >
          <div className="relative">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What shall we build today?"
              className="w-full bg-white/5 border border-blue-500/30 rounded-2xl px-6 py-4 text-white placeholder-gray-500 text-sm sm:text-base focus:outline-none focus:border-blue-500 transition-all duration-300"
              style={{ boxShadow: "0 0 30px rgba(59, 130, 246, 0.1)" }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-colors"
            >
              Enter →
            </button>
          </div>
        </motion.form>

        {/* 12-week roadmap */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-xs tracking-widest uppercase text-gray-500 mb-4">12-Week AI Architect Journey</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {WEEK_TOPICS.map(({ week, name }, i) => (
              <motion.button
                key={week}
                onClick={() => router.push("/tutor")}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                whileHover={{ scale: 1.05 }}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all cursor-pointer text-center group"
              >
                <div className="text-xs text-gray-500 group-hover:text-blue-400 transition-colors">W{week}</div>
                <div className="text-xs text-gray-300 group-hover:text-white transition-colors mt-0.5 leading-tight">{name}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <button onClick={() => router.push("/tutor")}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors">
            Start Learning →
          </button>
          <button onClick={() => router.push("/research")}
            className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl font-medium transition-colors">
            Research Hub 📄
          </button>
        </motion.div>
      </div>
    </main>
  );
}
