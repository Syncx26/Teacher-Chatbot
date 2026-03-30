"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/lib/store";
import { getPapers, getPaper, refreshPapers } from "@/lib/api";
import PaperCard from "@/components/PaperCard";

type Source = "all" | "arxiv" | "huggingface_daily" | "papers_with_code";

export default function ResearchPage() {
  const { userId } = useAppStore();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<Source>("all");
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function loadPapers(source?: string) {
    setLoading(true);
    try {
      const data = await getPapers(50, 0, source === "all" ? undefined : source);
      setPapers(data.papers || []);
      setLastRefresh(data.last_refresh);
      setIsStale(data.is_stale);
    } catch (e) {
      console.error("Failed to load papers:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPapers(sourceFilter);
  }, [sourceFilter]);

  async function handleSync() {
    if (!userId || syncing) return;
    setSyncing(true);
    try {
      await refreshPapers(userId);
      await loadPapers(sourceFilter);
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  }

  async function handleOpenPaper(id: number) {
    setSummaryLoading(true);
    try {
      const paper = await getPaper(id);
      setSelectedPaper(paper);
    } catch (e) {
      console.error("Failed to load paper:", e);
    } finally {
      setSummaryLoading(false);
    }
  }

  const SOURCE_FILTERS: { label: string; value: Source; color: string }[] = [
    { label: "All", value: "all", color: "primary" },
    { label: "ArXiv", value: "arxiv", color: "primary" },
    { label: "HF Daily", value: "huggingface_daily", color: "secondary" },
    { label: "Papers With Code", value: "papers_with_code", color: "primary" },
  ];

  return (
    <div className="min-h-screen cyber-bg text-white overflow-x-hidden">
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-20" />
      
      {/* Header */}
      <header className="sticky top-0 z-30 glass-panel-prism border-b-none py-4 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.href="/tutor"} className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="h-4 w-[1px] bg-white/10" />
            <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white italic">
              SYNAPSE<span className="text-primary not-italic">X</span> <span className="text-gray-400 not-italic font-light">Research</span>
            </h1>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-6">
            {lastRefresh && (
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest hidden xs:block">
                {isStale ? <span className="text-secondary">!] Sync Required</span> : <span className="text-primary">✓ Integrity Nominal</span>}
                <span className="ml-2 opacity-50">{new Date(lastRefresh).toLocaleDateString()}</span>
              </div>
            )}
            <button 
              onClick={handleSync} 
              disabled={syncing}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                syncing ? "bg-white/5 text-gray-500 cursor-not-allowed" : "bg-primary text-black hover:bg-white active:scale-95 shadow-lg shadow-primary/20"
              }`}
            >
              {syncing ? "Synchronizing..." : "Manual Refresh"}
            </button>
          </div>
        </div>

        {/* Source filter chips */}
        <div className="max-w-5xl mx-auto mt-6 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {SOURCE_FILTERS.map((f) => (
            <button 
              key={f.value} 
              onClick={() => setSourceFilter(f.value)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest border transition-all ${
                sourceFilter === f.value
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            {papers.length} Intelligence Reports Found
          </div>
          <div className="h-[1px] flex-1 mx-6 bg-white/5" />
          <div className="text-[10px] font-mono text-primary uppercase tracking-widest">Temporal Sort</div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center pulse-primary">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <p className="text-[10px] font-mono text-primary uppercase tracking-[0.3em]">Decoding Streams...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
            <div className="w-20 h-20 rounded-full glass-panel-prism flex items-center justify-center text-3xl opacity-20 transform rotate-12">
              📂
            </div>
            <p className="text-gray-500 text-sm font-light">Database empty. Initiate manual refresh to fetch neural assets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} onSummary={handleOpenPaper} />
            ))}
          </div>
        )}
      </main>

      {/* Summary modal / drawer */}
      <AnimatePresence>
        {(selectedPaper || summaryLoading) && (
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end"
            onClick={() => !summaryLoading && setSelectedPaper(null)}
          >
            <motion.div
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full w-full sm:w-[650px] glass-panel-prism border-l border-white/10 overflow-y-auto custom-scrollbar relative shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 p-8 flex gap-4 z-10">
                <button 
                  onClick={() => setSelectedPaper(null)}
                  className="w-10 h-10 rounded-full glass-panel-prism flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                >
                  ✕
                </button>
              </div>

              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-8 p-12 text-center">
                  <div className="w-16 h-16 rounded-full border border-primary/20 flex items-center justify-center pulse-primary">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-widest italic">Synapse Sync in Progress</h2>
                    <p className="text-gray-500 text-sm font-light max-w-xs">Distilling research into actionable intelligence...</p>
                  </div>
                </div>
              ) : selectedPaper && (
                <div className="p-8 sm:p-12 space-y-10">
                  {/* Paper Title & Metadata */}
                  <div className="space-y-4 pt-12 sm:pt-0">
                    <div className="flex items-center gap-3">
                      <SourceBadge source={selectedPaper.source} />
                      <div className="h-[1px] flex-1 bg-white/5" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight uppercase">
                      {selectedPaper.title}
                    </h2>
                    <div className="flex flex-wrap gap-6 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                      {selectedPaper.authors && <span>By {selectedPaper.authors.split(",")[0]} et al.</span>}
                      {selectedPaper.published_date && <span>Temporal: {selectedPaper.published_date}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-4">
                    <a 
                      href={`/tutor?paper_id=${selectedPaper.id}&paper_title=${encodeURIComponent(selectedPaper.title)}`}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-3 py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/20"
                    >
                      <span className="text-lg">💬</span> Architect Link
                    </a>
                    {selectedPaper.url && (
                      <a 
                        href={selectedPaper.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[200px] flex items-center justify-center gap-3 py-4 glass-panel-prism border-white/10 text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white/5 transition-all"
                      >
                        Original Feed ↗
                      </a>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    <div className="text-[10px] font-mono text-primary uppercase tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Intelligence Briefing
                    </div>
                    
                    {selectedPaper.summary ? (
                      <div className="prose prose-invert prose-sm max-w-none text-gray-300 font-light leading-relaxed">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ children }) => <h3 className="text-lg font-bold text-white mt-10 mb-4 uppercase tracking-widest">{children}</h3>,
                            ul: ({ children }) => <ul className="space-y-4 list-none p-0 mb-8">{children}</ul>,
                            li: ({ children }) => <li className="flex gap-4 p-4 glass-panel-prism rounded-xl border-white/5 italic"><span className="text-primary font-mono">▸</span>{children}</li>,
                            strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                            code: ({ children }) => <code className="bg-black/50 px-2 py-0.5 rounded text-primary font-mono text-xs border border-primary/20">{children}</code>,
                          }}
                        >
                          {selectedPaper.summary}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="p-8 glass-panel-prism rounded-2xl border-white/5 italic text-gray-400 font-light leading-relaxed">
                        {selectedPaper.abstract || "No abstract available for this feed."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const config: Record<string, { label: string; className: string }> = {
    arxiv: { label: "ArXiv", className: "text-primary border-primary/40 bg-primary/10 font-mono" },
    huggingface_daily: { label: "HF Daily", className: "text-secondary border-secondary/40 bg-secondary/10 font-bold" },
    papers_with_code: { label: "PwC", className: "text-white border-white/20 bg-white/5 font-light" },
  };
  const c = config[source] || { label: source, className: "text-gray-400 border-white/10" };
  return (
    <span className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest border ${c.className}`}>
      {c.label}
    </span>
  );
}
