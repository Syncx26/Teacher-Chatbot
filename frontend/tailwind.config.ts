import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0e1a",
        card: "#111827",
        accent: "#3b82f6",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        // Cyber-Prism theme colors — registered so bg-primary/20, text-primary, border-primary/40 etc. all work
        primary: "var(--primary)",   // #00f5ff cyan
        secondary: "var(--secondary)", // #ff00ff magenta
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px #3b82f6, 0 0 10px #3b82f6" },
          "100%": { boxShadow: "0 0 10px #3b82f6, 0 0 20px #3b82f6, 0 0 30px #3b82f6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
