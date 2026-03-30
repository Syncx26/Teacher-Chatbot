"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";

const TOTAL_SECONDS = 1500; // 25 minutes
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.25);
      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.25);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.25 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.5);
      oscillator.start(ctx.currentTime + i * 0.25);
      oscillator.stop(ctx.currentTime + i * 0.25 + 0.5);
    });
  } catch {
    // Audio not available
  }
}

export default function PomodoroTimer() {
  const { pomodoroActive, pomodoroSeconds, startPomodoro, stopPomodoro, tickPomodoro, resetPomodoro } =
    useAppStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didChimeRef = useRef(false);

  useEffect(() => {
    if (pomodoroActive) {
      intervalRef.current = setInterval(() => tickPomodoro(), 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pomodoroActive, tickPomodoro]);

  useEffect(() => {
    if (pomodoroSeconds === 0 && !didChimeRef.current) {
      didChimeRef.current = true;
      playChime();
    }
    if (pomodoroSeconds > 0) didChimeRef.current = false;
  }, [pomodoroSeconds]);

  const minutes = Math.floor(pomodoroSeconds / 60);
  const seconds = pomodoroSeconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progress = pomodoroSeconds / TOTAL_SECONDS;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const isComplete = pomodoroSeconds === 0;
  
  // Use CSS color var
  const ringColor = isComplete ? "var(--secondary)" : "var(--primary)";

  return (
    <div className="glass-panel-prism p-6 rounded-2xl flex flex-col items-center gap-6 border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-32 h-32 -rotate-90 absolute inset-0" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
          <motion.circle
            cx="44" cy="44" r={RADIUS} fill="none"
            stroke={ringColor} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: "linear" }}
            style={{ filter: pomodoroActive ? `drop-shadow(0 0 8px ${ringColor})` : "none" }}
          />
        </svg>
        
        <div className="flex flex-col items-center justify-center relative z-10">
          <span className="text-2xl font-black font-mono text-white tracking-tighter leading-none">{display}</span>
          <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-gray-500 mt-2">
            {isComplete ? "Asset Ready" : pomodoroActive ? "Syncing..." : "Standby"}
          </div>
        </div>
      </div>

      <div className="flex gap-2 w-full">
        {!pomodoroActive && !isComplete && (
          <button onClick={startPomodoro}
            className="flex-1 py-3 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/10"
          >
            Engage
          </button>
        )}
        {pomodoroActive && (
          <button onClick={stopPomodoro}
            className="flex-1 py-3 bg-white/5 text-white text-[9px] font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/10 transition-all"
          >
            Halt
          </button>
        )}
        <button onClick={resetPomodoro}
          className="px-4 py-3 bg-white/5 text-gray-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-all"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
