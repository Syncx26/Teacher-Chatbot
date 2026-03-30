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

  // Load papers
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
    { label: "All", value: "all", color: "blue" },
    { label: "ArXiv", value: "arxiv", color: "blue" },
    { label: "HF Daily", value: "huggingface_daily", color: "yellow" },
    { label: "Papers With Code", value: "papers_with_code", color: "green" },
  ];

  const colorMap: Record<string, string> = {
    blue: "border-blue-500/40 bg-blue-500/20 text-blue-300",
    yellow: "border-yellow-500/40 bg-yellow-500/20 text-yellow-300",
    green: "border-green-500/40 bg-green-500/20 text-green-300",
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-white/10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/tutor" className="text-gray-400 hover:text-white text-sm transition-colors">← Tutor</a>
            <span className="text-gray-600">|</span>
            <h1 className="text-sm font-bold tracking-widest uppercase text-white">Research Hub</h1>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-500 hidden sm:block">
                {isStale ? "⚠️ Stale" : "✓ Fresh"} · {new Date(lastRefresh).toLocaleDateString()}
              </span>
            )}
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors font-medium">
              {syncing ? (
                <><span className="animate-spin">⟳</span> Syncing...</>
              ) : (
                <><span>⟳</span> Sync Now</>
              )}
            </button>
          </div>
        </div>

        {/* Source filter chips */}
        <div className="max-w-4xl mx-auto mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SOURCE_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setSourceFilter(f.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border transition-colors ${
                sourceFilter === f.value
                  ? colorMap[f.color]
                  : "border-white/10 text-gray-400 hover:text-gray-200"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* Paper list */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-blue-500/50 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading papers...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-4xl">📭</div>
            <p className="text-gray-400">No papers yet. Hit <strong>Sync Now</strong> to fetch the latest research.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-4">{papers.length} papers · sorted by date</p>
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => !summaryLoading && setSelectedPaper(null)}
          >
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 h-full w-full sm:w-[600px] bg-[#111827] border-l border-white/10 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-10 h-10 border-2 border-blue-500/50 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Generating summary with Claude...</p>
                </div>
              ) : selectedPaper && (
                <div className="p-6 space-y-6">
                  {/* Close */}
                  <button onClick={() => setSelectedPaper(null)}
                    className="text-gray-400 hover:text-white text-sm transition-colors">
                    ← Back to papers
                  </button>

                  {/* Paper meta */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h2 className="text-lg font-semibold text-white leading-tight">{selectedPaper.title}</h2>
                      <SourceBadge source={selectedPaper.source} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      {selectedPaper.authors && <span>By {selectedPaper.authors}</span>}
                      {selectedPaper.published_date && <span>Published {selectedPaper.published_date}</span>}
                    </div>
                    {selectedPaper.url && (
                      <a href={selectedPaper.url} target="_blank" rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        View original ↗
                      </a>
                    )}
                  </div>

                  {/* Summary */}
                  {selectedPaper.summary ? (
                    <div className="prose prose-invert prose-sm max-w-none text-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}
                        components={{
                          h2: ({ children }) => <h2 className="text-base font-semibold text-white mt-6 mb-2">{children}</h2>,
                          ul: ({ children }) => <ul className="space-y-1 list-disc list-inside text-gray-300">{children}</ul>,
                          strong: ({ children }) => <strong className="text-white">{children}</strong>,
                          code: ({ children }) => <code className="bg-black/30 px-1 rounded text-blue-300 text-xs">{children}</code>,
                        }}>
                        {selectedPaper.summary}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="glass-card rounded-xl p-4 text-sm text-gray-300 leading-relaxed">
                      {selectedPaper.abstract || "No abstract available."}
                    </div>
                  )}

                  {/* Chat about this paper */}
                  <a href={`/tutor?paper_id=${selectedPaper.id}&paper_title=${encodeURIComponent(selectedPaper.title)}`}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium">
                    💬 Chat about this paper
                  </a>
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
    arxiv: { label: "ArXiv", className: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
    huggingface_daily: { label: "HF Daily", className: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" },
    papers_with_code: { label: "PwC", className: "bg-green-500/20 border-green-500/40 text-green-300" },
  };
  const c = config[source] || { label: source, className: "bg-white/10 text-gray-400" };
  return (
    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs border ${c.className}`}>
      {c.label}
    </span>
  );
}
