"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import {
  getPushSchedule,
  setPushSchedule,
  getVapidKey,
  subscribePush,
  getDigestPreferences,
  setDigestPreferences,
} from "@/lib/api";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex-shrink-0">
      <div
        className="w-12 h-6 rounded-full relative transition-colors duration-200"
        style={{ background: on ? "var(--accent)" : "var(--bg-elev)" }}
      >
        <div
          className="absolute w-5 h-5 rounded-full top-0.5 transition-all duration-200 bg-white shadow"
          style={{ left: on ? "calc(100% - 22px)" : "2px" }}
        />
      </div>
    </button>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme, language, setLanguage, englishLevel, setEnglishLevel } = useStore();
  const { signOut } = useClerk();
  const router = useRouter();

  // Push state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushHour, setPushHour] = useState(9);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Digest state
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestDay, setDigestDay] = useState(0);
  const [digestHour, setDigestHour] = useState(8);

  useEffect(() => {
    getPushSchedule()
      .then((s) => {
        setPushEnabled(s.enabled);
        if (s.hour != null) setPushHour(s.hour);
      })
      .catch(console.error);

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushSubscribed(!!sub))
        .catch(console.error);
    }

    getDigestPreferences()
      .then((p) => {
        setDigestEnabled(p.enabled);
        setDigestDay(p.day);
        setDigestHour(p.hour);
      })
      .catch(console.error);
  }, []);

  async function enableOnThisDevice() {
    if (!("serviceWorker" in navigator)) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const vapid = await getVapidKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.public_key),
      });
      await subscribePush(sub.toJSON() as PushSubscriptionJSON);
      setPushSubscribed(true);
    } catch (e) {
      console.error("Push subscribe failed:", e);
    } finally {
      setPushLoading(false);
    }
  }

  async function toggleSchedule() {
    await setPushSchedule(!pushEnabled, pushHour);
    setPushEnabled(!pushEnabled);
  }

  async function changeHour(h: number) {
    setPushHour(h);
    if (pushEnabled) await setPushSchedule(true, h);
  }

  async function toggleDigest() {
    await setDigestPreferences(!digestEnabled, digestDay, digestHour);
    setDigestEnabled(!digestEnabled);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex-1 p-6 pb-24 space-y-5">
        <p className="font-label" style={{ color: "var(--mark)" }}>Preferences</p>
        <h1 className="font-display text-3xl font-bold" style={{ color: "var(--ink)" }}>Settings</h1>

        {/* Theme */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
        >
          <p className="font-label mb-3" style={{ color: "var(--ink-mute)" }}>Appearance</p>
          <button onClick={toggleTheme} className="flex items-center justify-between w-full">
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {theme === "dark" ? "Nordic Slate — dark" : "Editorial Ink — light"}
            </span>
            <Toggle on={theme === "dark"} onToggle={toggleTheme} />
          </button>
        </div>

        {/* Language */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
        >
          <p className="font-label mb-3" style={{ color: "var(--ink-mute)" }}>Card Language</p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className="rounded-xl px-3 py-2 text-sm text-left font-medium transition-colors"
                style={{
                  background: language === l.code ? "var(--accent)" : "var(--bg-elev)",
                  color: language === l.code ? "var(--bg)" : "var(--ink)",
                  border: language === l.code ? "1px solid transparent" : "1px solid var(--hairline)",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* English level */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
        >
          <p className="font-label mb-1" style={{ color: "var(--ink-mute)" }}>English Complexity</p>
          <p className="text-xs mb-3" style={{ color: "var(--ink-mute)" }}>
            How Nova explains concepts in English
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["simple", "fluent"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setEnglishLevel(level)}
                className="rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  background: englishLevel === level ? "var(--accent)" : "var(--bg-elev)",
                  color: englishLevel === level ? "var(--bg)" : "var(--ink)",
                  border: englishLevel === level ? "1px solid transparent" : "1px solid var(--hairline)",
                }}
              >
                {level === "simple" ? "Simple" : "Fluent"}
              </button>
            ))}
          </div>
        </div>

        {/* Push notifications */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
        >
          <div className="flex items-center justify-between">
            <p className="font-label" style={{ color: "var(--ink-mute)" }}>Daily Reminder</p>
            <Toggle on={pushEnabled} onToggle={toggleSchedule} />
          </div>

          {!pushSubscribed && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--mark)" }}>
                ⚠ Push not enabled on this device
              </p>
              <button
                onClick={enableOnThisDevice}
                disabled={pushLoading}
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  background: "var(--mark)",
                  color: "var(--bg)",
                  opacity: pushLoading ? 0.6 : 1,
                }}
              >
                {pushLoading ? "Enabling…" : "Enable on this device"}
              </button>
            </div>
          )}

          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--ink-mute)" }}>
              Reminder time (UTC)
            </label>
            <select
              value={pushHour}
              onChange={(e) => changeHour(Number(e.target.value))}
              disabled={!pushEnabled}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={{
                background: "var(--bg-elev)",
                color: "var(--ink)",
                border: "1px solid var(--hairline)",
                opacity: pushEnabled ? 1 : 0.5,
              }}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{h}:00 UTC</option>
              ))}
            </select>
          </div>

          <p className="text-xs" style={{ color: "var(--ink-mute)" }}>
            You'll get a notification to study at this time each day.
          </p>
        </div>

        {/* Weekly digest */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--hairline)" }}
        >
          <div className="flex items-center justify-between">
            <p className="font-label" style={{ color: "var(--ink-mute)" }}>Weekly Digest</p>
            <Toggle on={digestEnabled} onToggle={toggleDigest} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--ink-mute)" }}>Day</label>
              <select
                value={digestDay}
                onChange={async (e) => {
                  const d = Number(e.target.value);
                  setDigestDay(d);
                  if (digestEnabled) await setDigestPreferences(true, d, digestHour);
                }}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={{
                  background: "var(--bg-elev)",
                  color: "var(--ink)",
                  border: "1px solid var(--hairline)",
                }}
              >
                {DAY_LABELS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--ink-mute)" }}>Hour (UTC)</label>
              <select
                value={digestHour}
                onChange={async (e) => {
                  const h = Number(e.target.value);
                  setDigestHour(h);
                  if (digestEnabled) await setDigestPreferences(true, digestDay, h);
                }}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={{
                  background: "var(--bg-elev)",
                  color: "var(--ink)",
                  border: "1px solid var(--hairline)",
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h}:00 UTC</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--ink-mute)" }}>
            A recap of your week delivered to your inbox.
          </p>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut(() => router.push("/sign-in"))}
          className="w-full rounded-full py-3 text-sm font-semibold"
          style={{
            background: "transparent",
            color: "var(--danger)",
            border: "1px solid var(--danger)",
          }}
        >
          Sign Out
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
