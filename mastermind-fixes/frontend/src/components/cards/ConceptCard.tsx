interface Props {
  content: {
    title: string;
    body: string;
    analogy?: string;
    key_term?: string;
    key_term_definition?: string;
    visual?: string;
  };
}

export function ConceptCard({ content }: Props) {
  return (
    <div className="flex flex-col gap-5 p-6 h-full">
      {/* Badge */}
      <span
        className="font-label w-fit px-2 py-0.5 rounded-full"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        Concept
      </span>

      {/* Title */}
      <h2
        className="font-display text-2xl font-bold leading-tight"
        style={{ color: "var(--ink)" }}
      >
        {content.title}
      </h2>

      {/* SVG visual if present */}
      {content.visual && (
        <div
          className="rounded-xl overflow-hidden"
          dangerouslySetInnerHTML={{ __html: content.visual }}
        />
      )}

      {/* Body */}
      <p className="text-base leading-relaxed flex-1" style={{ color: "var(--ink-soft)" }}>
        {content.body}
      </p>

      {/* Analogy — mark-rule pull quote */}
      {content.analogy && (
        <div className="mark-rule py-1">
          <p className="font-label mb-1" style={{ color: "var(--mark)" }}>
            Think of it like…
          </p>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>{content.analogy}</p>
        </div>
      )}

      {/* Key term */}
      {content.key_term && (
        <div
          className="mt-auto rounded-2xl p-4"
          style={{ background: "var(--bg-elev)", borderLeft: "3px solid var(--mark)" }}
        >
          <span className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
            {content.key_term}
          </span>
          <p className="text-sm mt-1" style={{ color: "var(--ink-mute)" }}>
            {content.key_term_definition}
          </p>
        </div>
      )}

      <p className="font-label text-center" style={{ color: "var(--ink-mute)" }}>
        Swipe up to continue
      </p>
    </div>
  );
}
