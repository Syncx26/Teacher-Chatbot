"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore, Message } from "@/lib/store";
import { sendMessage, getProgress, getTopics, advanceWeek, getMoreResources, proposeTopic, confirmTopic, MoreResource, TopicProposal } from "@/lib/api";
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

const WEEK_RESOURCES: Record<number, { label: string; url: string; type?: string }[]> = {
  1: [
    { label: "Corey Schafer — Python Dicts (19m)", url: "https://www.youtube.com/watch?v=daefaLgNkw0", type: "video" },
    { label: "Corey Schafer — JSON Files (20m)", url: "https://www.youtube.com/watch?v=9N6a-VLBa2I", type: "video" },
    { label: "Python Docs — Dictionaries", url: "https://docs.python.org/3/tutorial/datastructures.html#dictionaries", type: "docs" },
    { label: "RealPython — Working with JSON", url: "https://realpython.com/python-json/", type: "article" },
  ],
  2: [
    { label: "freeCodeCamp — APIs for Beginners (2h)", url: "https://www.youtube.com/watch?v=GZvSYJDk-us", type: "video" },
    { label: "Tech With Tim — Python Requests (22m)", url: "https://www.youtube.com/watch?v=tb8gHvYlCFs", type: "video" },
    { label: "Requests Library Docs", url: "https://requests.readthedocs.io/en/latest/", type: "docs" },
    { label: "RealPython — HTTP Requests", url: "https://realpython.com/python-requests/", type: "article" },
  ],
  3: [
    { label: "Corey Schafer — SQLite (30m)", url: "https://www.youtube.com/watch?v=pd-0G0MigUA", type: "video" },
    { label: "freeCodeCamp — SQL Full Course", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY", type: "video" },
    { label: "Python sqlite3 Official Docs", url: "https://docs.python.org/3/library/sqlite3.html", type: "docs" },
    { label: "SQLite Tutorial (sqlitetutorial.net)", url: "https://www.sqlitetutorial.net/", type: "article" },
  ],
  4: [
    { label: "Anthropic — Quickstart Guide", url: "https://docs.anthropic.com/en/docs/quickstart", type: "docs" },
    { label: "Anthropic — Messages API Ref", url: "https://docs.anthropic.com/en/api/messages", type: "docs" },
    { label: "Claude API Python Tutorial (YouTube)", url: "https://www.youtube.com/watch?v=QdP9PEHxY3c", type: "video" },
    { label: "Anthropic — System Prompts Guide", url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts", type: "docs" },
  ],
  5: [
    { label: "KodeKloud — RAG Crash Course (59m)", url: "https://www.youtube.com/watch?v=T-D1OfcDW1M", type: "video" },
    { label: "RAG From Scratch (LangChain YT)", url: "https://www.youtube.com/watch?v=sVcwVQRHIc8", type: "video" },
    { label: "LangChain RAG Tutorial (Docs)", url: "https://python.langchain.com/docs/tutorials/rag/", type: "docs" },
    { label: "ChromaDB Official Docs", url: "https://docs.trychroma.com/", type: "docs" },
  ],
  6: [
    { label: "LangGraph — Introduction Tutorial", url: "https://langchain-ai.github.io/langgraph/tutorials/introduction/", type: "docs" },
    { label: "LangGraph — Core Concepts", url: "https://langchain-ai.github.io/langgraph/concepts/", type: "docs" },
    { label: "LangGraph Crash Course (YouTube)", url: "https://www.youtube.com/watch?v=R8KB-Zcynxc", type: "video" },
    { label: "LangGraph — SQLiteSaver Checkpointing", url: "https://langchain-ai.github.io/langgraph/how-tos/persistence/", type: "docs" },
  ],
  7: [
    { label: "LangSmith Official Docs", url: "https://docs.smith.langchain.com/", type: "docs" },
    { label: "LangSmith — Tracing Guide", url: "https://docs.smith.langchain.com/how_to_guides/tracing", type: "docs" },
    { label: "LangSmith Tutorial (YouTube)", url: "https://www.youtube.com/watch?v=tFXm5ijih98", type: "video" },
  ],
  8: [
    { label: "MCP Official Docs (modelcontextprotocol.io)", url: "https://modelcontextprotocol.io/introduction", type: "docs" },
    { label: "FastMCP GitHub & README", url: "https://github.com/jlowin/fastmcp", type: "docs" },
    { label: "MCP Explained (YouTube)", url: "https://www.youtube.com/watch?v=kQmXtrmQ5Zg", type: "video" },
    { label: "Anthropic — MCP Overview", url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp", type: "docs" },
  ],
  9: [
    { label: "LangGraph — Multi-Agent Concepts", url: "https://langchain-ai.github.io/langgraph/concepts/multi_agent/", type: "docs" },
    { label: "LangGraph — Subgraphs How-To", url: "https://langchain-ai.github.io/langgraph/how-tos/subgraph/", type: "docs" },
    { label: "Multi-Agent Systems Tutorial (YouTube)", url: "https://www.youtube.com/watch?v=hvAPnpSfSGo", type: "video" },
  ],
  10: [
    { label: "LangGraph — Human-in-the-Loop", url: "https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/", type: "docs" },
    { label: "LangGraph — Breakpoints & Approval", url: "https://langchain-ai.github.io/langgraph/how-tos/breakpoints/", type: "docs" },
    { label: "Autonomous Agents Tutorial (YouTube)", url: "https://www.youtube.com/watch?v=bZzyPscbtI8", type: "video" },
  ],
  11: [
    { label: "Streamlit Official Docs", url: "https://docs.streamlit.io/", type: "docs" },
    { label: "Streamlit in 45 Minutes (YouTube)", url: "https://www.youtube.com/watch?v=JwSS70SZdyM", type: "video" },
    { label: "LangSmith — Evaluation Docs", url: "https://docs.smith.langchain.com/evaluation", type: "docs" },
  ],
  12: [
    { label: "draw.io — Architecture Diagrams", url: "https://www.drawio.com/", type: "docs" },
    { label: "How to Write a Great README (YouTube)", url: "https://www.youtube.com/watch?v=E6NO0rgFub4", type: "video" },
    { label: "GitHub Pages — Deploy Your Project", url: "https://pages.github.com/", type: "docs" },
    { label: "Railway — Deploy Full Stack Apps", url: "https://railway.app/", type: "docs" },
  ],
};

export default function TutorPage() {
  const {
    userId, currentWeek, xp, completedWeeks, messages,
    topics, activeTab, pendingMessage, setProgress, addMessage, setTopics, setActiveTab, setPendingMessage,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [postCheck, setPostCheck] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find More Resources
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [moreResources, setMoreResources] = useState<MoreResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Add Custom Topic
  type AddStep = "input" | "proposal" | "questions" | "done";
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<AddStep>("input");
  const [addTopicName, setAddTopicName] = useState("");
  const [addProposal, setAddProposal] = useState<TopicProposal | null>(null);
  const [addAnswers, setAddAnswers] = useState<Record<string, string>>({});
  const [addLoading, setAddLoading] = useState(false);
  const [addedTopic, setAddedTopic] = useState("");

  useEffect(() => {
    if (!userId) return;
    getProgress(userId).then(setProgress).catch(console.error);
    getTopics(userId).then((ts) => setTopics(ts.map((t) => ({ ...t, label: t.label ?? t.name })))).catch(console.error);
  }, [userId, setProgress, setTopics]);

  // Auto-send any message queued from the home page
  useEffect(() => {
    if (!pendingMessage || !userId) return;
    const msg = pendingMessage;
    setPendingMessage("");
    handleSend(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(overrideMsg?: string) {
    const userMsg = overrideMsg ?? input.trim();
    if (!userMsg || loading) return;
    if (!overrideMsg) setInput("");
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
      addMessage({ role: "assistant", content: "Signal lost. Attempt reconnection...", timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }

  async function handleFindMoreResources() {
    setResourcesOpen(true);
    if (moreResources.length > 0) return;
    setResourcesLoading(true);
    try {
      const res = await getMoreResources(userId, WEEK_NAMES[currentWeek] ?? "AI Engineering", currentWeek);
      setMoreResources(res);
    } catch (e) {
      console.error(e);
    } finally {
      setResourcesLoading(false);
    }
  }

  function openAddModal() {
    setAddOpen(true);
    setAddStep("input");
    setAddTopicName("");
    setAddProposal(null);
    setAddAnswers({});
    setAddedTopic("");
  }

  async function handlePropose() {
    if (!addTopicName.trim()) return;
    setAddLoading(true);
    try {
      const proposal = await proposeTopic(userId, addTopicName.trim());
      setAddProposal(proposal);
      setAddStep("proposal");
    } catch (e) {
      console.error(e);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleConfirmTopic() {
    if (!addProposal) return;
    setAddLoading(true);
    try {
      const result = await confirmTopic(userId, addTopicName, addAnswers);
      setAddedTopic(result.label);
      setAddStep("done");
    } catch (e) {
      console.error(e);
    } finally {
      setAddLoading(false);
    }
  }

  const currentTopics = topics.filter((t) => t.week === currentWeek);
  const weekResources = WEEK_RESOURCES[currentWeek] || [];
  const xpPercent = Math.min((xp / 1200) * 100, 100);

  // ── Curriculum Panel ────────────────────────────────────────────────────────
  const CurriculumPanel = (
    <div className="h-full flex flex-col gap-6 p-6">
      <div className="glass-panel-prism p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
          <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z" />
          </svg>
        </div>
        <div className="text-[10px] font-mono text-primary/60 uppercase tracking-[0.2em] mb-2">Subject Mastery</div>
        <div className="text-4xl font-black text-white mb-1 leading-none">{currentWeek}</div>
        <div className="text-sm font-light text-gray-400 mb-6 uppercase tracking-widest">{WEEK_NAMES[currentWeek]}</div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase font-mono">
            <span className="text-gray-500">Progress</span>
            <span className="text-primary">{xp} XP</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              className="h-full bg-gradient-to-r from-primary to-secondary"
            />
          </div>
          <div className="text-[9px] text-gray-600 font-mono italic">
            Synchronizing with neural engine... {Math.round(xpPercent)}%
          </div>
        </div>
      </div>

      <PomodoroTimer />

      <div>
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary/40" />
          Available Modules
        </div>
        <div className="flex flex-wrap gap-2">
          {currentTopics.map((t) => (
            <TopicChip
              key={t.topic_id}
              topic={t}
              currentWeek={currentWeek}
              completedWeeks={completedWeeks}
              onClick={(topic) => {
                setInput(`Status report on: ${topic.label}`);
                setActiveTab("chat");
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">Roadmap Timeline</div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
            const done = completedWeeks.includes(w);
            const isCurrent = w === currentWeek;
            return (
              <div
                key={w}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-mono transition-all duration-300 ${
                  isCurrent ? "glass-panel-prism border-primary/40 text-primary shadow-lg shadow-primary/5" :
                  done ? "text-primary/40" : "text-gray-600 opacity-60"
                }`}
              >
                <span className="w-4 flex justify-center">
                  {done ? "✓" : isCurrent ? "▶" : w}
                </span>
                <span className="uppercase tracking-widest">{WEEK_NAMES[w]}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={openAddModal}
          className="mt-4 w-full py-3 rounded-xl text-[10px] font-mono uppercase tracking-widest text-primary/70 hover:text-primary transition-all border border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5"
        >
          + Add Custom Topic
        </button>
      </div>
    </div>
  );

  // ── Chat Panel ──────────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-12 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full glass-panel-prism flex items-center justify-center text-2xl mb-6 pulse-primary border-primary/20">
              💎
            </div>
            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">SYNAPSE ACTIVE</h3>
            <p className="text-gray-500 text-sm italic font-light italic">
              Module {currentWeek} neural interface is online. Master the content.
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl glass-panel-prism flex items-center justify-center text-[10px] font-bold text-primary border-primary/30">
              AI
            </div>
            <div className="glass-panel-prism rounded-2xl p-4 flex gap-2 border-primary/10">
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse delay-75" />
              <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse delay-150" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {postCheck.suggest_advance && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-28 left-4 right-4 sm:left-12 sm:right-12 glass-panel-prism p-4 rounded-2xl flex items-center justify-between border-primary/50 shadow-2xl shadow-primary/10 transition-all z-20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">🏆</div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-widest">Milestone Detected</div>
                <div className="text-[10px] text-gray-500 font-mono">Week {currentWeek} requirements met.</div>
              </div>
            </div>
            <button 
              onClick={async () => {
                await advanceWeek(userId, currentWeek);
                const p = await getProgress(userId);
                setProgress(p);
                setPostCheck({});
              }}
              className="px-6 py-2 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white transition-all shadow-lg shadow-primary/20"
            >
              Secure Progress
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 sm:p-8 pt-0">
        <div className="relative group max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative glass-panel-prism rounded-2xl p-1.5 flex items-center gap-2 border-white/5 group-hover:border-primary/20">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={`Communicate with Week ${currentWeek} logic...`}
              className="flex-1 bg-transparent border-none px-6 py-4 text-white placeholder-gray-600 focus:outline-none text-sm font-light"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="w-12 h-12 bg-primary text-black rounded-xl flex items-center justify-center hover:bg-white disabled:opacity-20 transition-all active:scale-90"
            >
              <svg className="w-5 h-5 fill-current rotate-90" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Resources Panel ─────────────────────────────────────────────────────────
  const ResourcesPanel = (
    <div className="h-full overflow-y-auto p-6 space-y-8 custom-scrollbar">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Neural Training Data</div>
          <button
            onClick={handleFindMoreResources}
            className="px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest text-primary/70 hover:text-primary border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            Find More
          </button>
        </div>
        <div className="space-y-3">
          {weekResources.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 glass-panel-prism rounded-2xl hover:bg-white/5 transition-all group border-white/5"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform text-sm ${r.type === "video" ? "bg-secondary/10 text-secondary" : r.type === "docs" ? "bg-primary/10 text-primary" : "bg-white/5 text-gray-400"}`}>
                {r.type === "video" ? "▶" : r.type === "docs" ? "◆" : "◈"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-primary transition-colors leading-tight mb-0.5 truncate">
                  {r.label.split(" — ")[1] || r.label}
                </div>
                <div className="text-[9px] font-mono text-gray-600 uppercase">
                  {r.label.split(" — ")[0]}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-white/5">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">Quick Protocols</div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: "Anthropic API", url: "https://docs.anthropic.com" },
            { label: "LangGraph Core", url: "https://langchain-ai.github.io/langgraph/" },
            { label: "ChromaDB Hub", url: "https://docs.trychroma.com" },
          ].map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              className="px-4 py-3 glass-panel-prism rounded-xl text-[10px] font-mono text-primary/60 hover:text-primary hover:bg-primary/5 transition-all uppercase tracking-widest text-center"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main Responsive Layout ──────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] flex flex-col cyber-bg text-white overflow-hidden">
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-20" />
      
      {/* Header (Laptop + Mobile) */}
      <header className="flex items-center justify-between px-6 py-4 glass-panel-prism border-b-none z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => window.location.href="/"} className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white italic">
            SYNAPSE <span className="text-primary not-italic">CHAT</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8 hidden sm:flex">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Latency</span>
            <span className="text-[10px] font-mono text-primary">24ms</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Identity Verified</div>
              <div className="text-[10px] font-bold text-white uppercase tracking-widest tracking-tighter">Alex R.</div>
            </div>
            <div className="w-10 h-10 rounded-full glass-panel-prism p-0.5 border-primary/20">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/40 to-secondary/40" />
            </div>
          </div>
        </div>
      </header>

      {/* Responsive Content Strategy */}
      <div className="flex-1 flex overflow-hidden relative z-10 app-container w-full">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:block w-80 flex-shrink-0 border-r border-white/5 overflow-y-auto custom-scrollbar">
          {CurriculumPanel}
        </aside>

        {/* Central Hub (Chat) */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Mobile Tab Switcher content */}
          <div className="flex-1 overflow-hidden lg:hidden">
            {activeTab === "curriculum" && <div className="h-full overflow-y-auto custom-scrollbar">{CurriculumPanel}</div>}
            {activeTab === "chat" && <div className="h-full">{ChatPanel}</div>}
            {activeTab === "resources" && <div className="h-full">{ResourcesPanel}</div>}
          </div>
          
          {/* Desktop permanent chat */}
          <div className="hidden lg:flex flex-col flex-1 overflow-hidden">{ChatPanel}</div>
        </main>

        {/* Desktop Right Sidebar (Resources) */}
        <aside className="hidden xl:block w-80 flex-shrink-0 border-l border-white/5 overflow-y-auto custom-scrollbar">
          {ResourcesPanel}
        </aside>
      </div>

      {/* Find More Resources Drawer */}
      <AnimatePresence>
        {resourcesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setResourcesOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-prism rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mb-1">Extended Resources</div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">{WEEK_NAMES[currentWeek]}</h3>
                </div>
                <button onClick={() => setResourcesOpen(false)} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
              </div>

              {resourcesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse pulse-primary" />
                  ))}
                </div>
              ) : moreResources.length === 0 ? (
                <p className="text-gray-500 text-sm font-mono text-center py-8">No resources found for this topic.</p>
              ) : (
                <div className="space-y-3">
                  {moreResources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-4 p-4 glass-panel-prism rounded-xl hover:bg-white/5 transition-all group border-white/5"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${r.type === "video" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>
                        {r.type === "video" ? "▶" : "◆"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-primary transition-colors leading-tight mb-1 truncate">{r.title}</div>
                        <div className="text-[9px] font-mono text-gray-600 uppercase mb-1">{r.type}</div>
                        {r.description && <div className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{r.description}</div>}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Custom Topic Modal */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setAddOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-prism rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mb-1">Curriculum Expansion</div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">Add Custom Topic</h3>
                </div>
                <button onClick={() => setAddOpen(false)} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
              </div>

              {addStep === "input" && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 font-light leading-relaxed">Name a topic you want to add to your curriculum. The AI will generate a plan and ask a few questions before adding it.</p>
                  <input
                    autoFocus
                    value={addTopicName}
                    onChange={(e) => setAddTopicName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePropose()}
                    placeholder="e.g. Async Python, Pydantic, Docker..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 font-light"
                  />
                  <button
                    onClick={handlePropose}
                    disabled={!addTopicName.trim() || addLoading}
                    className="w-full py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white disabled:opacity-30 transition-all"
                  >
                    {addLoading ? "Generating plan..." : "Generate Plan →"}
                  </button>
                </div>
              )}

              {addStep === "proposal" && addProposal && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="text-[9px] font-mono text-primary/60 uppercase tracking-widest mb-2">Proposed Plan</div>
                    <p className="text-xs text-gray-300 leading-relaxed">{addProposal.plan}</p>
                    {addProposal.subtopics?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {addProposal.subtopics.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] font-mono text-gray-400">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {addProposal.questions.map((q) => (
                      <div key={q.id}>
                        <div className="text-[10px] font-mono text-gray-400 mb-2">{q.question}</div>
                        {q.type === "choice" && q.options ? (
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setAddAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wide transition-all border ${
                                  addAnswers[q.id] === opt
                                    ? "bg-primary text-black border-primary"
                                    : "border-white/10 text-gray-400 hover:border-primary/40 hover:text-primary"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            value={addAnswers[q.id] ?? ""}
                            onChange={(e) => setAddAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Your answer..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary/40"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleConfirmTopic}
                    disabled={addLoading || addProposal.questions.some((q) => !addAnswers[q.id]?.trim())}
                    className="w-full py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white disabled:opacity-30 transition-all"
                  >
                    {addLoading ? "Adding topic..." : "Confirm & Add →"}
                  </button>
                </div>
              )}

              {addStep === "done" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-3xl mx-auto">✓</div>
                  <div>
                    <div className="text-white font-black uppercase tracking-widest">{addedTopic}</div>
                    <div className="text-gray-500 text-xs font-mono mt-1">has been added to your curriculum</div>
                  </div>
                  <button
                    onClick={() => setAddOpen(false)}
                    className="px-8 py-2.5 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white transition-all"
                  >
                    Continue
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden flex glass-panel-prism border-t-none pb-safe">
        {(["curriculum", "chat", "resources"] as Tab[]).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 transition-all ${
              activeTab === tab ? "text-primary border-t border-primary/50" : "text-gray-500"
            }`}
          >
            <span className="text-lg">
              {tab === "curriculum" ? "◈" : tab === "chat" ? "▣" : "▧"}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest italic font-bold">
              {tab === "curriculum" ? "Code" : tab === "chat" ? "Chat" : "Intel"}
            </span>
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
      initial={{ opacity: 0, x: isUser ? 20 : -20 }} 
      animate={{ opacity: 1, x: 0 }}
      className={`flex gap-4 sm:gap-6 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black border transition-colors ${
        isUser ? "bg-white text-black border-white" : "glass-panel-prism text-primary border-primary/30"
      }`}>
        {isUser ? "USR" : "AI"}
      </div>
      <div className={`max-w-[90%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div className={`rounded-3xl p-5 sm:p-7 text-sm font-light leading-relaxed tracking-wide shadow-2xl transition-all ${
          isUser ? "bg-white text-black rounded-tr-none font-medium" : "glass-panel-prism text-gray-200 rounded-tl-none border-white/5"
        }`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  return (
                    <code className="bg-black/40 px-2 py-0.5 rounded text-primary font-mono text-[13px] border border-primary/10" {...props}>
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  return (
                    <div className="relative my-6 group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl blur opacity-20" />
                      <pre className="relative bg-[#050505] rounded-xl p-6 overflow-x-auto text-[13px] font-mono border border-white/5 custom-scrollbar">
                        {children}
                      </pre>
                    </div>
                  );
                },
                p({ children }) { return <p className="mb-4 last:mb-0">{children}</p>; },
                ul({ children }) { return <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>; },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        {!isUser && (
          <div className="flex flex-wrap items-center gap-3 px-1 mt-1">
            {message.model_tier && <ModelBadge tier={message.model_tier} />}
            {message.confidence_score != null && <ConfidenceBadge score={message.confidence_score} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}
