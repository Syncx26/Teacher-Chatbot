"use client";

import { useStore } from "@/lib/store";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";

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

export default function SettingsPage() {
  const { theme, toggleTheme, language, setLanguage, englishLevel, setEnglishLevel } = useStore();
  const { signOut } = useClerk();
  const router = useRouter();

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
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full"
          >
            <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {theme === "dark" ? "Nordic Slate — dark" : "Editorial Ink — light"}
            </span>
            <div
              className="w-12 h-6 rounded-full relative transition-colors duration-200"
              style={{ background: theme === "dark" ? "var(--accent)" : "var(--bg-elev)" }}
            >
              <div
                className="absolute w-5 h-5 rounded-full top-0.5 transition-all duration-200 bg-white shadow"
                style={{ left: theme === "dark" ? "calc(100% - 22px)" : "2px" }}
              />
            </div>
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
