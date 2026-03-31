"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/lib/store";
import {
  getPapers, getPaper, refreshPapers,
  getRelatedPapers, bookmarkPaper, unbookmarkPaper, getBookmarks, getFullTextUrl,
  RelatedPaper,
} from "@/lib/api";
import PaperCard, { PaperData } from "@/components/PaperCard";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";
import { Suspense } from "react";

type Topic = "ai" | "physics" | "medical" | "tech";
type ViewMode = "topic" | "bookmarks";

const TOPICS: { id: Topic; label: string; icon: string; color: string }[] = [
  { id: "ai",      label: "AI",           icon: "⬡", color: "text-primary border-primary/40 bg-primary/10" },
  { id: "physics", label: "Physics",      icon: "⚛", color: "text-violet-400 border-violet-400/40 bg-violet-400/10" },
  { id: "medical", label: "Medical",      icon: "⊕", color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
  { id: "tech",    label: "Tech",         icon: "⬢", color: "text-amber-400 border-amber-400/40 bg-amber-400/10" },
];

function ResearchPageInner() {
  const { userId } = useAppStore();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTopic, setActiveTopic] = useState<Topic>("ai");
  const [viewMode, setViewMode] = useState<ViewMode>("topic");
  const [papers, setPapers] = useState<PaperData[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Paper detail drawer
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [relatedPapers, setRelatedPapers] = useState<RelatedPaper[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [fullTextUrl, setFullTextUrl] = useState<string | null>(null);
  const [fullTextLoading, setFullTextLoading] = useState(false);

  const PAGE_SIZE = 20;

  // Load bookmarks on mount
  useEffect(() => {
    if (!userId) return;
    getBookmarks(userId).then((bms) => {
      setBookmarkedIds(new Set(bms.map((p: any) => p.id)));
    }).catch(() => {});
  }, [userId]);

  // Handle ?paper= deep link
  useEffect(() => {
    const paperId = searchParams.get("paper");
    if (paperId) handleOpenPaper(parseInt(paperId, 10));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPapers(topic: Topic, pageIndex = 0, append = false) {
    setLoading(!append);
    try {
      const data = await getPapers(PAGE_SIZE, pageIndex * PAGE_SIZE, undefined, topic);
      const newPapers = data.papers || [];
      setPapers(prev => append ? [...prev, ...newPapers] : newPapers);
      setLastRefresh(data.last_refresh);
      setIsStale(data.is_stale);
      setHasMore(newPapers.length === PAGE_SIZE);
    } catch (e) {
      console.error("Failed to load papers:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadBookmarks() {
    if (!userId) return;
    setLoading(true);
    try {
      const bms = await getBookmarks(userId);
      setPapers(bms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    if (viewMode === "bookmarks") {
      loadBookmarks();
    } else {
      loadPapers(activeTopic, 0);
    }
  }, [activeTopic, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPapers(activeTopic, nextPage, true);
  }

  async function handleSync() {
    if (!userId || syncing) return;
    setSyncing(true);
    try {
      await refreshPapers(userId, activeTopic);
      await loadPapers(activeTopic, 0);
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  }

  async function handleOpenPaper(id: number) {
    setSummaryLoading(true);
    setRelatedPapers([]);
    setFullTextUrl(null);
    // Update URL with paper id for deep linking
    const url = new URL(window.location.href);
    url.searchParams.set("paper", String(id));
    router.replace(url.pathname + url.search, { scroll: false });

    try {
      const paper = await getPaper(id);
      setSelectedPaper(paper);
      // Load related papers + fulltext in background
      setRelatedLoading(true);
      setFullTextLoading(true);
      getRelatedPapers(id).then(r => { setRelatedPapers(r); setRelatedLoading(false); });
      getFullTextUrl(id).then(u => { setFullTextUrl(u); setFullTextLoading(false); });
    } catch (e) {
      console.error("Failed to load paper:", e);
    } finally {
      setSummaryLoading(false);
    }
  }

  function handleCloseDrawer() {
    setSelectedPaper(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("paper");
    router.replace(url.pathname + url.search, { scroll: false });
  }

  async function handleBookmark(paperId: number, add: boolean) {
    if (!userId) return;
    if (add) {
      setBookmarkedIds(prev => new Set(Array.from(prev).concat(paperId)));
      await bookmarkPaper(paperId, userId);
    } else {
      setBookmarkedIds(prev => { const s = new Set(prev); s.delete(paperId); return s; });
      await unbookmarkPaper(paperId, userId);
      if (viewMode === "bookmarks") {
        setPapers(prev => prev.filter(p => p.id !== paperId));
      }
    }
  }

  const isDark = theme === "dark";
  const activeTopic_ = TOPICS.find(t => t.id === activeTopic)!;

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${isDark ? "cyber-bg text-white" : "bg-gray-50 text-gray-900"}`}>
      {isDark && <div className="absolute inset-0 cyber-grid pointer-events-none opacity-10" />}

      {/* Header */}
      <header className={`sticky-safe z-30 border-b py-3 px-4 sm:px-6 transition-colors ${isDark ? "glass-panel-prism border-white/5" : "bg-white/90 border-gray-200 backdrop-blur-sm shadow-sm"}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = "/tutor"}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className={`text-[10px] font-black uppercase tracking-[0.4em] italic ${isDark ? "text-white" : "text-gray-900"}`}>
              SYNAPSE<span className="text-primary not-italic">X</span>
              <span className={`not-italic font-light ml-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Research</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className={`text-[9px] font-mono uppercase tracking-widest hidden sm:block ${isStale ? "text-secondary" : isDark ? "text-primary" : "text-green-600"}`}>
                {isStale ? "Sync needed" : "Up to date"}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${syncing ? "opacity-40 cursor-not-allowed" : "bg-primary text-black hover:bg-white active:scale-95"}`}
            >
              {syncing ? "Syncing..." : "Refresh"}
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Topic tabs + bookmarks */}
        <div className="max-w-6xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {TOPICS.map(t => (
            <button
              key={t.id}
              onClick={() => { setViewMode("topic"); setActiveTopic(t.id); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest border transition-all ${
                viewMode === "topic" && activeTopic === t.id
                  ? t.color
                  : isDark ? "border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
          <div className={`w-[1px] h-4 flex-shrink-0 mx-1 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
          <button
            onClick={() => setViewMode("bookmarks")}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest border transition-all ${
              viewMode === "bookmarks"
                ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
                : isDark ? "border-white/5 text-gray-500 hover:text-yellow-400" : "border-gray-200 text-gray-500 hover:text-yellow-600"
            }`}
          >
            ★ Saved ({bookmarkedIds.size})
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {loading ? "Loading..." : `${papers.length} papers`}
            {viewMode === "topic" && ` · ${activeTopic_.label}`}
            {viewMode === "bookmarks" && " · Saved"}
          </div>
          <div className={`h-[1px] flex-1 ${isDark ? "bg-white/5" : "bg-gray-200"}`} />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center pulse-primary">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <p className="text-[10px] font-mono text-primary uppercase tracking-[0.3em]">Loading Papers...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="text-4xl opacity-20">
              {viewMode === "bookmarks" ? "★" : activeTopic_.icon}
            </div>
            <p className={`text-sm font-light ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {viewMode === "bookmarks"
                ? "No saved papers yet. Bookmark papers to see them here."
                : "No papers yet. Hit Refresh to fetch the latest."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {papers.map(paper => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  isBookmarked={bookmarkedIds.has(paper.id)}
                  onSummary={handleOpenPaper}
                  onBookmark={handleBookmark}
                />
              ))}
            </div>
            {viewMode === "topic" && hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleLoadMore}
                  className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                    isDark ? "border-white/10 text-gray-400 hover:border-primary hover:text-primary" : "border-gray-300 text-gray-500 hover:border-primary hover:text-primary"
                  }`}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Paper detail drawer */}
      <AnimatePresence>
        {(selectedPaper || summaryLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end"
            onClick={() => !summaryLoading && handleCloseDrawer()}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className={`h-full w-full sm:w-[680px] overflow-y-auto custom-scrollbar relative shadow-[-20px_0_60px_rgba(0,0,0,0.5)] ${
                isDark ? "glass-panel-prism border-l border-white/10" : "bg-white border-l border-gray-200"
              }`}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseDrawer}
                className={`absolute top-6 right-6 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDark ? "glass-panel-prism hover:bg-white hover:text-black text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >✕</button>

              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-6 p-12 text-center">
                  <div className="w-14 h-14 rounded-full border border-primary/20 flex items-center justify-center pulse-primary">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                  <p className={`text-sm font-light ${isDark ? "text-gray-400" : "text-gray-500"}`}>Generating intelligence briefing...</p>
                </div>
              ) : selectedPaper && (
                <div className="p-6 sm:p-10 space-y-8 pt-16">
                  {/* Title block */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SourceBadge source={selectedPaper.source} isDark={isDark} />
                      {selectedPaper.topic && <TopicBadge topic={selectedPaper.topic} />}
                      {selectedPaper.citation_count != null && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono border text-primary border-primary/20 bg-primary/5">
                          {selectedPaper.citation_count} citations
                        </span>
                      )}
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black leading-tight tracking-tight uppercase ${isDark ? "text-white" : "text-gray-900"}`}>
                      {selectedPaper.title}
                    </h2>
                    <div className={`flex flex-wrap gap-4 text-[10px] font-mono uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {selectedPaper.authors && <span>By {selectedPaper.authors.split(",")[0]} et al.</span>}
                      {selectedPaper.published_date && <span>{selectedPaper.published_date}</span>}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`/tutor?paper_id=${selectedPaper.id}&paper_title=${encodeURIComponent(selectedPaper.title)}`}
                      className="flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 bg-primary text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white transition-all"
                    >
                      💬 Discuss with Nova
                    </a>
                    {selectedPaper.url && (
                      <a
                        href={selectedPaper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all border ${
                          isDark ? "glass-panel-prism border-white/10 text-white hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Source ↗
                      </a>
                    )}
                    {!fullTextLoading && fullTextUrl && (
                      <a
                        href={fullTextUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold uppercase tracking-widest text-[9px] rounded-xl hover:bg-emerald-500/30 transition-all"
                      >
                        📄 Full Text (Open Access)
                      </a>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? "text-primary" : "text-primary"}`}>Intelligence Briefing</span>
                    </div>
                    {selectedPaper.summary ? (
                      <div className={`prose prose-sm max-w-none font-light leading-relaxed ${isDark ? "prose-invert text-gray-300" : "text-gray-700"}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ children }) => <h3 className={`text-base font-bold mt-8 mb-3 uppercase tracking-widest ${isDark ? "text-white" : "text-gray-900"}`}>{children}</h3>,
                            ul: ({ children }) => <ul className="space-y-3 list-none p-0 mb-6">{children}</ul>,
                            li: ({ children }) => (
                              <li className={`flex gap-3 p-3 rounded-xl border text-sm ${isDark ? "glass-panel-prism border-white/5 italic" : "bg-gray-50 border-gray-200"}`}>
                                <span className="text-primary font-mono flex-shrink-0">▸</span>{children}
                              </li>
                            ),
                            strong: ({ children }) => <strong className={isDark ? "text-white font-bold" : "text-gray-900 font-bold"}>{children}</strong>,
                            code: ({ children }) => <code className={`px-1.5 py-0.5 rounded text-xs font-mono border ${isDark ? "bg-black/50 text-primary border-primary/20" : "bg-gray-100 text-primary border-gray-300"}`}>{children}</code>,
                          }}
                        >
                          {selectedPaper.summary}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className={`p-6 rounded-2xl border ${isDark ? "glass-panel-prism border-white/5 text-gray-400 italic" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                        {selectedPaper.abstract || "No abstract available."}
                      </div>
                    )}
                  </div>

                  {/* Related Papers */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <span className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? "text-violet-400" : "text-violet-600"}`}>Related Papers</span>
                    </div>
                    {relatedLoading ? (
                      <p className={`text-xs font-light ${isDark ? "text-gray-500" : "text-gray-400"}`}>Loading related papers...</p>
                    ) : relatedPapers.length === 0 ? (
                      <p className={`text-xs font-light ${isDark ? "text-gray-600" : "text-gray-400"}`}>No related papers found for this source.</p>
                    ) : (
                      <div className="space-y-2">
                        {relatedPapers.slice(0, 6).map((rp, i) => (
                          <div key={i} className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${isDark ? "glass-panel-prism border-white/5" : "bg-gray-50 border-gray-200"}`}>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold line-clamp-1 ${isDark ? "text-white" : "text-gray-900"}`}>{rp.title}</p>
                              <div className={`flex items-center gap-2 mt-0.5 text-[9px] font-mono uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                <span className={rp.relation === "citation" ? "text-emerald-400" : "text-violet-400"}>{rp.relation}</span>
                                {rp.year && <span>{rp.year}</span>}
                                {rp.citation_count != null && <span>{rp.citation_count} cites</span>}
                              </div>
                            </div>
                            {rp.url && (
                              <a href={rp.url} target="_blank" rel="noopener noreferrer"
                                className={`flex-shrink-0 text-xs opacity-50 hover:opacity-100 transition-opacity ${isDark ? "text-white" : "text-gray-700"}`}>↗</a>
                            )}
                          </div>
                        ))}
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

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen cyber-bg" />}>
      <ResearchPageInner />
    </Suspense>
  );
}

function SourceBadge({ source, isDark }: { source: string; isDark: boolean }) {
  const map: Record<string, { label: string; cls: string }> = {
    arxiv:            { label: "ArXiv",    cls: "text-primary border-primary/40 bg-primary/10" },
    huggingface_daily:{ label: "HF Daily", cls: "text-secondary border-secondary/40 bg-secondary/10" },
    papers_with_code: { label: "PwC",      cls: "text-white border-white/20 bg-white/5" },
    pubmed:           { label: "PubMed",   cls: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
    inspire_hep:      { label: "INSPIRE",  cls: "text-violet-400 border-violet-400/40 bg-violet-400/10" },
  };
  const c = map[source] || { label: source, cls: isDark ? "text-gray-400 border-white/10" : "text-gray-500 border-gray-300" };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function TopicBadge({ topic }: { topic: string }) {
  const map: Record<string, string> = {
    ai:      "text-primary border-primary/30 bg-primary/5",
    physics: "text-violet-400 border-violet-400/30 bg-violet-400/5",
    medical: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
    tech:    "text-amber-400 border-amber-400/30 bg-amber-400/5",
  };
  const cls = map[topic] || "text-gray-400 border-white/10";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest border ${cls}`}>
      {topic}
    </span>
  );
}
