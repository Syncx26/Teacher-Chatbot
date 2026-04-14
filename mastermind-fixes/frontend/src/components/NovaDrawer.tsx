"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { askNova, transcribeAudio } from "@/lib/api";
import { readStream } from "@/lib/stream";

interface Props {
  cardId: string;
}

export function NovaDrawer({ cardId }: Props) {
  const { novaOpen, setNovaOpen, language, englishLevel } = useStore();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    const response = await askNova(cardId, text, messages, language, englishLevel);
    await readStream(response, (chunk) => {
      setMessages((m) => {
        const last = { ...m[m.length - 1], content: m[m.length - 1].content + chunk };
        return [...m.slice(0, -1), last];
      });
    });
    setStreaming(false);
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: "audio/webm" });
      const text = await transcribeAudio(blob);
      if (text) send(text);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <AnimatePresence>
      {novaOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNovaOpen(false)}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
            style={{
              background: "var(--surface)",
              maxHeight: "70vh",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Ask Nova</span>
              <button onClick={() => setNovaOpen(false)} style={{ color: "var(--text-secondary)" }}>✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
                  Long-press any card to ask Nova a question.
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="rounded-2xl px-3 py-2 text-sm max-w-[85%]"
                    style={{
                      background: m.role === "user" ? "var(--accent)" : "var(--surface-alt)",
                      color: m.role === "user" ? "#fff" : "var(--text-primary)",
                    }}
                  >
                    {m.content || <span className="opacity-50">…</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: recording ? "var(--danger)" : "var(--surface-alt)" }}
              >
                🎤
              </button>
              <input
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: "var(--surface-alt)", color: "var(--text-primary)" }}
                placeholder="Ask anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
              />
              <button
                onClick={() => send(input)}
                disabled={streaming || !input.trim()}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent)", color: "#fff", opacity: streaming || !input.trim() ? 0.5 : 1 }}
              >
                ↑
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
