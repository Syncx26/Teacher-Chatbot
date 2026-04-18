interface Props {
  content: {
    subtype: string;
    title: string;
    body: string;
    source?: string;
  };
}

const SUBTYPE_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  real_story:        { label: "Real Story",         bg: "rgba(139,92,246,0.15)",  color: "#8B5CF6" },
  hot_take:          { label: "Hot Take",           bg: "rgba(224,123,123,0.15)", color: "var(--danger)" },
  connection:        { label: "Connection",         bg: "rgba(138,169,209,0.15)", color: "var(--accent)" },
  did_you_know:      { label: "Did You Know",       bg: "rgba(217,150,112,0.15)", color: "var(--mark)" },
  what_would_you_do: { label: "What Would You Do?", bg: "rgba(123,181,150,0.15)", color: "var(--good)" },
};

export function ExploreCard({ content }: Props) {
  const style = SUBTYPE_STYLES[content.subtype] ?? {
    label: "Explore",
    bg: "var(--accent-soft)",
    color: "var(--accent)",
  };

  return (
    <div className="flex flex-col gap-5 p-6 h-full">
      {/* Badge */}
      <span
        className="font-label w-fit px-2 py-0.5 rounded-full"
        style={{ background: style.bg, color: style.color }}
      >
        {style.label}
      </span>

      {/* Title */}
      <h2
        className="font-display text-2xl font-bold leading-tight"
        style={{ color: "var(--ink)" }}
      >
        {content.title}
      </h2>

      {/* Body */}
      <p className="text-base leading-relaxed flex-1" style={{ color: "var(--ink-soft)" }}>
        {content.body}
      </p>

      {/* Source */}
      {content.source && (
        <p
          className="text-xs mark-rule py-0.5"
          style={{ color: "var(--ink-mute)" }}
        >
          {content.source}
        </p>
      )}

      <p className="font-label text-center" style={{ color: "var(--ink-mute)" }}>
        Swipe up for more
      </p>
    </div>
  );
}
