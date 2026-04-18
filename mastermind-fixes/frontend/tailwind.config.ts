import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg:            "var(--bg)",
        "bg-card":     "var(--bg-card)",
        "bg-elev":     "var(--bg-elev)",
        ink:           "var(--ink)",
        "ink-soft":    "var(--ink-soft)",
        "ink-mute":    "var(--ink-mute)",
        hairline:      "var(--hairline)",
        accent:        "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        mark:          "var(--mark)",
        good:          "var(--good)",
        danger:        "var(--danger)",
      },
      fontFamily: {
        sans:    ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono:    ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
