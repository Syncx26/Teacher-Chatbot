"use client";

import React, { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";

const TOTAL_SECONDS = 1500; // 25 minutes
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    // Web Audio API not available
  }
}

export default function PomodoroTimer() {
  const { pomodoroActive, pomodoroSeconds, startPomodoro, stopPomodoro, tickPomodoro, resetPomodoro } =
    useAppStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didChimeRef = useRef(false);

  useEffect(() => {
    if (pomodoroActive) {
      intervalRef.current = setInterval(() => {
        tickPomodoro();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pomodoroActive, tickPomodoro]);

  useEffect(() => {
    if (pomodoroSeconds === 0 && !didChimeRef.current) {
      didChimeRef.current = true;
      playChime();
    }
    if (pomodoroSeconds > 0) {
      didChimeRef.current = false;
    }
  }, [pomodoroSeconds]);

  const minutes = Math.floor(pomodoroSeconds / 60);
  const seconds = pomodoroSeconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progress = pomodoroSeconds / TOTAL_SECONDS;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const isComplete = pomodoroSeconds === 0;
  const ringColor = isComplete ? "#10b981" : pomodoroActive ? "#3b82f6" : "#334155";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          {/* Track */}
          <circle
            cx="44"
            cy="44"
            r={RADIUS}
            fill="none"
            stroke="#1e293b"
            strokeWidth="6"
          />
          {/* Progress */}
          <circle
            cx="44"
            cy="44"
            r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
          />
          {pomodoroActive && (
            <circle
              cx="44"
              cy="44"
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              opacity="0.3"
              style={{
                filter: `drop-shadow(0 0 6px ${ringColor})`,
              }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono text-slate-100 leading-none">{display}</span>
          <span className="text-xs text-slate-500 mt-0.5">
            {isComplete ? "Done!" : pomodoroActive ? "Focus" : "Ready"}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {!pomodoroActive && !isComplete && (
          <button
            onClick={startPomodoro}
            className="px-3 py-1.5 text-xs font-medium bg-accent/20 text-accent border border-accent/30 rounded-lg hover:bg-accent/30 transition-colors"
          >
            Start
          </button>
        )}
        {pomodoroActive && (
          <button
            onClick={stopPomodoro}
            className="px-3 py-1.5 text-xs font-medium bg-warning/20 text-warning border border-warning/30 rounded-lg hover:bg-warning/30 transition-colors"
          >
            Pause
          </button>
        )}
        {(pomodoroSeconds < TOTAL_SECONDS || isComplete) && (
          <button
            onClick={resetPomodoro}
            className="px-3 py-1.5 text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/30 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
