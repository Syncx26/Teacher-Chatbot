"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/today",    label: "Today",    icon: "⚡" },
  { href: "/topics",   label: "Topics",   icon: "📚" },
  { href: "/explore",  label: "Explore",  icon: "✦" },
  { href: "/progress", label: "Progress", icon: "◎" },
  { href: "/settings", label: "Settings", icon: "⊙" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "var(--bg-card)",
        borderTop: "1px solid var(--hairline)",
        paddingBottom: "env(safe-area-inset-bottom)",
        height: "calc(56px + env(safe-area-inset-bottom))",
      }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            style={{ color: active ? "var(--mark)" : "var(--ink-mute)" }}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span
              className="font-label"
              style={{ color: active ? "var(--mark)" : "var(--ink-mute)" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
