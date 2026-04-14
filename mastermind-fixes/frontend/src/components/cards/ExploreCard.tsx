interface Props {
  content: {
    subtype: string;
    title: string;
    body: string;
    source?: string;
  };
}

const SUBTYPE_STYLES: Record<string, { label: string; color: string }> = {
  real_story:        { label: "Real Story",       color: "#8B5CF6" },
  hot_take:          { label: "Hot Take",         color: "#EF4444" },
  connection:        { label: "Connection",       color: "#06B6D4" },
  did_you_know:      { label: "Did You Know",     color: "#F59E0B" },
  what_would_you_do: { label: "What Would You Do?", color: "#10B981" },
};

export function ExploreCard({ content }: Props) {
  const style = SUBTYPE_STYLES[content.subtype] ?? { label: "Explore", color: "var(--accent)" };

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      <span
        className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full w-fit"
        style={{ background: style.color, color: "#fff" }}
      >
        {style.label}
      </span>

      <h2 className="text-2xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
        {content.title}
      </h2>

      <p className="text-base leading-relaxed flex-1" style={{ color: "var(--text-primary)" }}>
        {content.body}
      </p>

      {content.source && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          — {content.source}
        </p>
      )}

      <p className="text-center text-xs" style={{ color: "var(--text-secondary)" }}>
        Swipe up for more
      </p>
    </div>
  );
}
