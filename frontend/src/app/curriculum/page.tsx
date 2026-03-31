"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore, Curriculum } from "@/lib/store";
import { listCurriculums, switchCurriculum, deleteCurriculum, getActiveCurriculum } from "@/lib/api";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";

export default function CurriculumManagerPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { userId, setCurriculum, setProgress } = useAppStore();
  const isDark = theme === "dark";

  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    listCurriculums(userId).then((list) => {
      setCurriculums(list as any[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  async function handleSwitch(id: number) {
    setActionId(id);
    try {
      const curriculum = await switchCurriculum(userId, id) as any;
      setCurriculum(curriculum as Curriculum);
      setProgress({ current_week: 1, xp: 0, completed_weeks: [] });
      router.push("/tutor");
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: number) {
    setActionId(id);
    try {
      await deleteCurriculum(userId, id);
      const updated = curriculums.filter((c) => c.id !== id);
      setCurriculums(updated);
      // If we deleted the active one, reload active from backend
      const wasActive = curriculums.find((c) => c.id === id)?.is_active;
      if (wasActive) {
        const active = await getActiveCurriculum(userId) as any;
        setCurriculum(active as Curriculum);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
      setConfirmDelete(null);
    }
  }

  const bg = isDark ? "bg-[#010101] text-white" : "bg-gray-50 text-gray-900";
  const card = isDark ? "glass-panel-prism" : "bg-white border border-gray-200 shadow-sm";
  const muted = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`min-h-screen ${bg} cyber-bg`}>
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-20" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className={`p-2 rounded-xl transition-colors ${isDark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] mb-0.5">Manage</div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Curriculums</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Slot count */}
        <div className={`rounded-xl p-4 mb-6 flex items-center justify-between ${card}`}>
          <div>
            <div className="text-sm font-bold">{curriculums.length} / 5 slots used</div>
            <div className={`text-xs ${muted}`}>Delete one to make room for a new curriculum</div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`w-6 h-6 rounded-md ${i < curriculums.length ? "bg-primary" : isDark ? "bg-white/10" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className={`h-24 rounded-2xl animate-pulse ${isDark ? "bg-white/5" : "bg-gray-200"}`} />)}
          </div>
        ) : curriculums.length === 0 ? (
          <div className={`rounded-2xl p-10 text-center ${card}`}>
            <div className={`text-4xl mb-3`}>📚</div>
            <div className="font-bold mb-1">No saved curriculums</div>
            <div className={`text-sm ${muted} mb-4`}>You&apos;re on the default AI Engineering track.</div>
            <button
              onClick={() => router.push("/curriculum/new")}
              className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white"
              style={{ background: "linear-gradient(135deg, #9d00ff, #ff00ff)" }}
            >
              Create First Curriculum
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {curriculums.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 ${card} ${c.is_active ? (isDark ? "border border-primary/40" : "border border-primary/30") : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-base truncate">{c.name}</h3>
                      {c.is_active && (
                        <span className="text-[9px] font-mono uppercase tracking-widest text-primary border border-primary/30 px-2 py-0.5 rounded-full flex-shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${muted} line-clamp-2`}>{c.goal}</p>
                    <div className={`text-[9px] font-mono mt-2 ${muted}`}>
                      Created {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!c.is_active && (
                      <button
                        onClick={() => handleSwitch(c.id)}
                        disabled={actionId === c.id}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary border border-primary/30 hover:bg-primary/10 transition-all disabled:opacity-40"
                      >
                        {actionId === c.id ? "..." : "Activate"}
                      </button>
                    )}
                    {confirmDelete === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={actionId === c.id}
                          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-40"
                        >
                          {actionId === c.id ? "..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(c.id)}
                        className={`p-2 rounded-xl transition-colors ${isDark ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-500"}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create new */}
        {curriculums.length < 5 && (
          <button
            onClick={() => router.push("/curriculum/new")}
            className={`mt-4 w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isDark ? "border border-dashed border-primary/30 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/5" : "border border-dashed border-primary/40 text-primary hover:bg-primary/5"}`}
          >
            + Create New Curriculum
          </button>
        )}
      </div>
    </div>
  );
}
