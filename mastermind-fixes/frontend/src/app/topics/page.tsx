"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  getUserCurricula,
  completeCurriculum,
  deleteCurriculum,
  downloadCurriculum,
  type CurriculumSummary,
} from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

const MAX_ACTIVE = 5;

type Tab = "active" | "completed";

export default function TopicsPage() {
  const router = useRouter();
  const userId = useStore((s) => s.userId);
  const setActiveCurriculumId = useStore((s) => s.setActiveCurriculumId);

  const [tab, setTab] = useState<Tab>("active");
  const [items, setItems] = useState<CurriculumSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!userId) return;
    const data = await getUserCurricula(userId);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { refresh().catch(console.error); }, [userId]);

  const active = items.filter((c) => c.status === "active");
  const completed = items.filter((c) => c.status === "completed");
  const visible = tab === "active" ? active : completed;

  async function handleDelete(id: string) {
    if (!confirm("Delete this topic? You'll lose all progress.")) return;
    await deleteCurriculum(id);
    await refresh();
  }

  async function handleComplete(id: string) {
    if (!confirm("Mark this topic as completed? You can still download the content.")) return;
    await completeCurriculum(id);
    await refresh();
  }

  async function handleOpen(id: string) {
    setActiveCurriculumId(id);
    router.push("/today");
  }

  async function handleDownload(id: string, format: "markdown" | "json") {
    await downloadCurriculum(id, format);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex-1 p-6 pb-24 space-y-5">
        <p className="font-label" style={{ color: "var(--mark)" }}>Your curricula</p>
        <h1 className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>
          Topics
        </h1>

        {/* Tabs */}
        <div
          className="flex p-1 rounded-full"
          style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
        >
          {([
            { key: "active", label: `Active (${active.length}/${MAX_ACTIVE})` },
            { key: "completed", label: `Completed (${completed.length})` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 rounded-full py-2 text-sm font-medium transition-colors"
              style={{
                background: tab === key ? "var(--accent)" : "transparent",
                color: tab === key ? "var(--bg)" : "var(--ink-mute)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* New topic button */}
        {tab === "active" && (
          <button
            onClick={() => router.push("/onboarding")}
            disabled={active.length >= MAX_ACTIVE}
            className="w-full rounded-2xl py-4 font-semibold text-sm transition-opacity"
            style={{
              background: "var(--bg-card)",
              border: "1.5px dashed var(--mark)",
              color: "var(--mark)",
              opacity: active.length >= MAX_ACTIVE ? 0.4 : 1,
            }}
          >
            {active.length >= MAX_ACTIVE
              ? "Max 5 active topics — complete or delete one first"
              : "+ Start a new topic"}
          </button>
        )}

        {/* List */}
        {visible.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
          >
            <p style={{ color: "var(--ink-mute)" }}>
              {tab === "active"
                ? "No active topics yet. Start your first curriculum above."
                : "No completed topics yet — they'll appear here when you finish one."}
            </p>
          </div>
        ) : (
          visible.map((c) => {
            const pct = c.sessions_total
              ? Math.round((c.sessions_done / c.sessions_total) * 100)
              : 0;
            return (
              <div
                key={c.id}
                className="rounded-2xl p-5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{c.emoji ?? "📘"}</span>
                      <h3
                        className="font-display text-xl font-bold truncate"
                        style={{ color: "var(--ink)" }}
                      >
                        {c.topic}
                      </h3>
                    </div>
                    {c.mastery_goal && (
                      <p className="text-sm mt-2 mark-rule py-0.5" style={{ color: "var(--ink-mute)" }}>
                        {c.mastery_goal}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--bg-elev)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ background: c.status === "completed" ? "var(--good)" : "var(--mark)", width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-label" style={{ color: "var(--ink-mute)" }}>
                    {c.sessions_done}/{c.sessions_total}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  {c.status === "active" ? (
                    <>
                      <button
                        onClick={() => handleOpen(c.id)}
                        className="flex-1 min-w-[120px] rounded-full py-2 text-sm font-semibold"
                        style={{ background: "var(--accent)", color: "var(--bg)" }}
                      >
                        Open →
                      </button>
                      <button
                        onClick={() => handleComplete(c.id)}
                        className="rounded-full px-3 py-2 text-sm font-medium"
                        style={{ background: "var(--bg-elev)", color: "var(--good)", border: "1px solid var(--good)" }}
                      >
                        ✓ Done
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded-full px-3 py-2 text-sm font-medium"
                        style={{ background: "var(--bg-elev)", color: "var(--danger)", border: "1px solid var(--danger)" }}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDownload(c.id, "markdown")}
                        className="flex-1 min-w-[120px] rounded-full py-2 text-sm font-semibold"
                        style={{ background: "var(--accent)", color: "var(--bg)" }}
                      >
                        ↓ Download .md
                      </button>
                      <button
                        onClick={() => handleDownload(c.id, "json")}
                        className="rounded-full px-3 py-2 text-sm font-medium"
                        style={{
                          background: "var(--bg-elev)",
                          color: "var(--ink)",
                          border: "1px solid var(--hairline)",
                        }}
                      >
                        .json
                      </button>
                    </>
                  )}
                </div>

                {c.completed_at && (
                  <p className="font-label mt-3" style={{ color: "var(--ink-mute)" }}>
                    Completed {new Date(c.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
