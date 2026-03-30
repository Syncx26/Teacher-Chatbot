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
};

export default function TutorPage() {
  const {
    userId, currentWeek, xp, completedWeeks, messages,
    topics, activeTab, setProgress, addMessage, setTopics, setActiveTab,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [postCheck, setPostCheck] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    getProgress(userId).then(setProgress).catch(console.error);
    getTopics(userId).then((ts) => setTopics(ts.map((t) => ({ ...t, label: t.name })))).catch(console.error);
  }, [userId, setProgress, setTopics]);

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
      addMessage({ role: "assistant", content: "Signal lost. Attempt reconnection...", timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
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
              onClick={handleSend} 
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
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-6">Neural Training Data</div>
        <div className="space-y-3">
          {weekResources.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 glass-panel-prism rounded-2xl hover:bg-white/5 transition-all group border-white/5"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                ▶
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-primary transition-colors leading-tight mb-0.5">
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
    <div className="h-screen flex flex-col cyber-bg text-white overflow-hidden">
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
