"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore, Message } from "@/lib/store";
import {
  sendMessage, getProgress, getTopics, advanceWeek,
  getMoreResources, proposeTopic, confirmTopic,
  MoreResource, TopicProposal,
} from "@/lib/api";
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

  // ── More Resources state ──────────────────────────────────────────────────
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [moreResources, setMoreResources] = useState<MoreResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  async function handleFindMoreResources() {
    const topicLabel = topics.find((t) => t.week === currentWeek)?.label
      ?? WEEK_NAMES[currentWeek] ?? `Week ${currentWeek}`;
    setResourcesOpen(true);
    setMoreResources([]);
    setResourcesLoading(true);
    try {
      const found = await getMoreResources(userId, topicLabel, currentWeek);
      setMoreResources(found);
    } catch { /* silently show empty */ }
    finally { setResourcesLoading(false); }
  }

  // ── Add Custom Topic state ────────────────────────────────────────────────
  type AddStep = "input" | "proposal" | "questions" | "done";
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<AddStep>("input");
  const [addTopicName, setAddTopicName] = useState("");
  const [addProposal, setAddProposal] = useState<TopicProposal | null>(null);
  const [addAnswers, setAddAnswers] = useState<Record<string, string>>({});
  const [addLoading, setAddLoading] = useState(false);
  const [addedTopic, setAddedTopic] = useState<string>("");

  function openAddModal() {
    setAddOpen(true); setAddStep("input");
    setAddTopicName(""); setAddProposal(null);
    setAddAnswers({}); setAddedTopic("");
  }

  async function handlePropose() {
    if (!addTopicName.trim()) return;
    setAddLoading(true);
    setAddStep("proposal");
    try {
      const proposal = await proposeTopic(userId, addTopicName.trim());
      setAddProposal(proposal);
      setAddStep("questions");
    } catch { setAddStep("input"); }
    finally { setAddLoading(false); }
  }

  async function handleConfirmTopic() {
    if (!addProposal) return;
    setAddLoading(true);
    try {
      const result = await confirmTopic(userId, addTopicName.trim(), addAnswers);
      setAddedTopic(result.label);
      setAddStep("done");
    } catch { /* show error? */ }
    finally { setAddLoading(false); }
  }

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

      {/* Add Custom Topic button */}
      <button
        onClick={openAddModal}
        className="w-full mt-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-gray-300 hover:text-purple-300 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
      >
        <span>＋</span> Add Custom Topic
      </button>
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-widest">Week {currentWeek} Resources</span>
        <button
          onClick={handleFindMoreResources}
          className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <span>🔍</span> Find More
        </button>
      </div>
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

      {/* ── More Resources Drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {resourcesOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 flex justify-end"
            onClick={() => setResourcesOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-[#0d1120] border-l border-white/10 h-full overflow-y-auto p-5 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white uppercase tracking-widest">More Resources</h2>
                <button onClick={() => setResourcesOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
              </div>
              <p className="text-xs text-gray-400">
                Live-searched resources for <span className="text-blue-300">{topics.find((t) => t.week === currentWeek)?.label ?? WEEK_NAMES[currentWeek]}</span>
              </p>
              {resourcesLoading ? (
                <div className="flex flex-col gap-3 mt-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : moreResources.length === 0 ? (
                <p className="text-gray-500 text-sm mt-4">No results found. Try again later.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {moreResources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors group">
                      <div className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">{r.type === "video" ? "▶" : "📄"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 group-hover:text-white font-medium line-clamp-2">{r.title}</p>
                          {r.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                          )}
                          <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${
                            r.type === "video" ? "bg-red-500/20 text-red-300" : "bg-blue-500/20 text-blue-300"
                          }`}>{r.type}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Custom Topic Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setAddOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0d1120] border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Step 1: Enter topic name */}
              {addStep === "input" && (
                <>
                  <h2 className="text-base font-semibold text-white">Add a Custom Topic</h2>
                  <p className="text-sm text-gray-400">Type a topic you want to learn. We'll generate a short plan and ask you a few quick questions before adding it.</p>
                  <input
                    autoFocus
                    value={addTopicName}
                    onChange={(e) => setAddTopicName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePropose()}
                    placeholder="e.g. Prompt Engineering, Async Python, Docker..."
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={handlePropose} disabled={!addTopicName.trim()}
                      className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl transition-colors">
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* Step 2 loading */}
              {addStep === "proposal" && addLoading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="flex gap-1">
                    {[0,1,2].map((i) => (
                      <motion.div key={i} className="w-2 h-2 bg-purple-400 rounded-full"
                        animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-400">Building your topic plan...</p>
                </div>
              )}

              {/* Step 3: Questions */}
              {addStep === "questions" && addProposal && (
                <>
                  <h2 className="text-base font-semibold text-white">{addProposal.topic_name}</h2>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <p className="text-sm text-gray-300">{addProposal.plan}</p>
                    {addProposal.subtopics.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {addProposal.subtopics.map((s, i) => (
                          <li key={i} className="text-xs text-purple-300">• {s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    {addProposal.questions.map((q) => (
                      <div key={q.id}>
                        <p className="text-sm text-gray-200 mb-2">{q.question}</p>
                        {q.type === "choice" && q.options ? (
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt) => (
                              <button key={opt} onClick={() => setAddAnswers((a) => ({ ...a, [q.id]: opt }))}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                  addAnswers[q.id] === opt
                                    ? "bg-purple-600 border-purple-500 text-white"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/40 hover:text-white"
                                }`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            value={addAnswers[q.id] ?? ""}
                            onChange={(e) => setAddAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                            placeholder="Type your answer..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button
                      onClick={handleConfirmTopic}
                      disabled={addLoading || addProposal.questions.some((q) => !addAnswers[q.id])}
                      className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl transition-colors"
                    >
                      {addLoading ? "Adding..." : "Add to Curriculum"}
                    </button>
                  </div>
                </>
              )}

              {/* Step 4: Done */}
              {addStep === "done" && (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="text-4xl">🎉</div>
                  <h2 className="text-base font-semibold text-white">Topic Added!</h2>
                  <p className="text-sm text-gray-400"><span className="text-purple-300 font-medium">{addedTopic}</span> has been added to your curriculum.</p>
                  <button onClick={() => setAddOpen(false)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm transition-colors">
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
