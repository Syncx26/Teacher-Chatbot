"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore, Message } from "@/lib/store";
import { sendMessage, getProgress, getTopics, advanceWeek } from "@/lib/api";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import ModelBadge from "@/components/ModelBadge";
import PomodoroTimer from "@/components/PomodoroTimer";
import TopicChip from "@/components/TopicChip";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "curriculum" | "chat" | "resources";

// ─── Week topic labels ────────────────────────────────────────────────────────
const WEEK_NAMES: Record<number, string> = {
  1: "Python & JSON", 2: "REST APIs", 3: "SQLite", 4: "LLM API",
  5: "RAG", 6: "LangGraph", 7: "LangSmith", 8: "MCP",
  9: "Multi-Agent", 10: "Autonomous", 11: "Dashboard", 12: "Ship It",
};

// ─── Resource links per week ──────────────────────────────────────────────────
const WEEK_RESOURCES: Record<number, { label: string; url: string }[]> = {
  1: [
    { label: "Corey Schafer — Python Dicts (19m)", url: "https://www.youtube.com/watch?v=daefaLgNkw0" },
    { label: "Corey Schafer — JSON Files (20m)", url: "https://www.youtube.com/watch?v=9N6a-VLBa2I" },
  ],
  2: [
    { label: "freeCodeCamp — APIs for Beginners", url: "https://www.youtube.com/watch?v=GZvSYJDk-us" },
    { label: "Tech With Tim — Python Requests (22m)", url: "https://www.youtube.com/watch?v=tb8gHvYlCFs" },
  ],
  3: [
    { label: "Corey Schafer — SQLite (30m)", url: "https://www.youtube.com/watch?v=pd-0G0MigUA" },
    { label: "freeCodeCamp — SQL Tutorial", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY" },
  ],
  4: [
    { label: "Anthropic Quickstart Docs", url: "https://docs.anthropic.com/en/docs/quickstart" },
    { label: "Claude API Python Tutorial", url: "https://www.youtube.com/watch?v=QdP9PEHxY3c" },
  ],
  5: [
    { label: "KodeKloud — RAG Crash Course (59m)", url: "https://www.youtube.com/watch?v=T-D1OfcDW1M" },
    { label: "RAG From Scratch", url: "https://www.youtube.com/watch?v=sVcwVQRHIc8" },
  ],
  6: [
    { label: "LangChain Academy — LangGraph", url: "https://academy.langchain.com/courses/intro-to-langgraph" },
    { label: "LangGraph Explained 2025", url: "https://www.youtube.com/watch?v=R8KB-Zcynxc" },
  ],
  7: [
    { label: "LangSmith Observability Tutorial", url: "https://www.youtube.com/watch?v=Hab2CV3B3C4" },
    { label: "Aurelio AI — LangSmith Intro", url: "https://www.youtube.com/watch?v=tFXm5ijih98" },
  ],
  8: [
    { label: "MCP Server Tutorial (official)", url: "https://modelcontextprotocol.io/quickstart/server" },
    { label: "FastMCP Python Guide", url: "https://www.youtube.com/watch?v=9tBKD9ZQFHY" },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function TutorPage() {
  const {
    userId, currentWeek, xp, completedWeeks, messages,
    topics, activeTab, isSidebarOpen,
    setProgress, addMessage, setTopics, setActiveTab,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [postCheck, setPostCheck] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load progress + topics on mount
  useEffect(() => {
    if (!userId) return;
    getProgress(userId).then(setProgress).catch(console.error);
    getTopics(userId).then((ts) => setTopics(ts.map((t) => ({ ...t, label: t.name })))).catch(console.error);
  }, [userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    addMessage({ role: "user", content: userMsg, timestamp: new Date().toISOString() });
    setLoading(true);
    try {
      const res = await sendMessage(userId, userMsg);
      addMessage({
        role: "assistant",
        content: res.content,
        model_tier: res.model_tier,
        confidence_score: res.confidence_score ?? undefined,
        timestamp: new Date().toISOString(),
      });
      setPostCheck(res.post_check || {});
    } catch (e) {
      addMessage({ role: "assistant", content: "Sorry, something went wrong. Please try again.", timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvanceWeek() {
    await advanceWeek(userId, currentWeek);
    const p = await getProgress(userId);
    setProgress(p);
    setPostCheck({});
  }

  const currentTopics = topics.filter((t) => t.week === currentWeek);
  const weekResources = WEEK_RESOURCES[currentWeek] || [];
  const xpPercent = Math.min((xp / 1200) * 100, 100);

  // ── Curriculum Panel ────────────────────────────────────────────────────────
  const CurriculumPanel = (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Week badge + XP */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-widest">Current Week</span>
          <span className="text-xs text-blue-400">{xp} XP</span>
        </div>
        <div className="text-4xl font-bold text-blue-400 mb-1">{currentWeek}</div>
        <div className="text-sm text-gray-300">{WEEK_NAMES[currentWeek]}</div>
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">{Math.round(xpPercent)}% of curriculum complete</div>
      </div>

      {/* Pomodoro */}
      <PomodoroTimer />

      {/* Current week topics */}
      {currentTopics.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">This Week&apos;s Topics</div>
          <div className="flex flex-wrap gap-2">
            {currentTopics.map((t) => (
              <TopicChip
                key={t.topic_id}
                topic={t}
                currentWeek={currentWeek}
                completedWeeks={completedWeeks}
                onClick={(topic) => {
                  setInput(`Tell me about ${topic.label}`);
                  setActiveTab("chat");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Week list */}
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">12-Week Journey</div>
        <div className="space-y-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
            const done = completedWeeks.includes(w);
            const isCurrent = w === currentWeek;
            return (
              <div
                key={w}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isCurrent ? "bg-blue-500/20 border border-blue-500/40 text-white" :
                  done ? "text-green-400" : "text-gray-500"
                }`}
              >
                <span className="w-4 text-center">
                  {done ? "✓" : isCurrent ? "▶" : w}
                </span>
                <span>{WEEK_NAMES[w]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Chat Panel ──────────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to build?</h3>
            <p className="text-gray-400 text-sm">Ask anything about Week {currentWeek}, or tell me what you're working on.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">AI</div>
            <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-2 h-2 bg-blue-400 rounded-full"
                    animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Post-check banner */}
      <AnimatePresence>
        {postCheck.suggest_advance && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="mx-4 mb-2 p-3 bg-green-500/20 border border-green-500/40 rounded-xl flex items-center justify-between"
          >
            <span className="text-sm text-green-300">🎉 Week {currentWeek} complete? Mark it done!</span>
            <button onClick={handleAdvanceWeek}
              className="text-xs px-3 py-1 bg-green-500 hover:bg-green-400 text-white rounded-full transition-colors">
              Mark Complete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Ask about Week ${currentWeek}...`}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium text-sm">
            ↑
          </button>
        </div>
      </div>
    </div>
  );

  // ── Resources Panel ─────────────────────────────────────────────────────────
  const ResourcesPanel = (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Week {currentWeek} Resources</div>
      {weekResources.length > 0 ? (
        <div className="space-y-2">
          {weekResources.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 glass-card rounded-xl hover:bg-white/10 transition-colors group">
              <span className="text-red-400 text-lg">▶</span>
              <span className="text-sm text-gray-200 group-hover:text-white transition-colors">{r.label}</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Resources for this week coming soon.</p>
      )}

      <div className="pt-4">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Quick Links</div>
        <div className="space-y-2">
          {[
            { label: "Anthropic Docs", url: "https://docs.anthropic.com" },
            { label: "LangGraph Docs", url: "https://langchain-ai.github.io/langgraph/" },
            { label: "ChromaDB Docs", url: "https://docs.trychroma.com" },
            { label: "FastAPI Docs", url: "https://fastapi.tiangolo.com" },
          ].map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 glass-card rounded-xl hover:bg-white/10 transition-colors text-sm text-blue-400 hover:text-blue-300">
              {link.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#0a0e1a] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">← Home</a>
          <span className="text-gray-600">|</span>
          <span className="text-sm font-semibold tracking-widest text-white uppercase">War Room</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Week</span>
          <span className="text-blue-400 font-bold">{currentWeek}</span>
          <span className="text-gray-600">·</span>
          <span className="text-yellow-400">{xp} XP</span>
        </div>
      </header>

      {/* Desktop: 3-panel / Mobile: tab content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop left sidebar */}
        <aside className="hidden md:block w-64 border-r border-white/10 overflow-y-auto flex-shrink-0">
          {CurriculumPanel}
        </aside>

        {/* Center/main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Mobile tab content */}
          <div className="flex-1 overflow-hidden md:hidden">
            {activeTab === "curriculum" && <div className="h-full overflow-y-auto">{CurriculumPanel}</div>}
            {activeTab === "chat" && <div className="h-full flex flex-col">{ChatPanel}</div>}
            {activeTab === "resources" && <div className="h-full">{ResourcesPanel}</div>}
          </div>
          {/* Desktop always-show chat */}
          <div className="hidden md:flex flex-col flex-1 overflow-hidden">{ChatPanel}</div>
        </main>

        {/* Desktop right resources panel */}
        <aside className="hidden lg:block w-72 border-l border-white/10 overflow-y-auto flex-shrink-0">
          {ResourcesPanel}
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex border-t border-white/10 flex-shrink-0">
        {(["curriculum", "chat", "resources"] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
              activeTab === tab ? "text-blue-400 border-t-2 border-blue-400 -mt-px" : "text-gray-500 hover:text-gray-300"
            }`}>
            {tab === "curriculum" ? "📋" : tab === "chat" ? "💬" : "📚"} {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
        isUser ? "bg-blue-600 text-white" : "bg-white/10 text-gray-300"
      }`}>
        {isUser ? "You" : "AI"}
      </div>
      <div className={`max-w-[85%] md:max-w-[70%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "bg-blue-600 text-white rounded-tr-sm" : "glass-card text-gray-100 rounded-tl-sm"
        }`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  return (
                    <code className="bg-black/30 px-1.5 py-0.5 rounded text-blue-300 text-xs font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  return <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto my-2 text-xs">{children}</pre>;
                },
              }}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            {message.model_tier && <ModelBadge tier={message.model_tier} />}
            {message.confidence_score != null && <ConfidenceBadge score={message.confidence_score} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}
