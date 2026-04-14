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
    <div className="flex flex-col gap-4 p-6 h-full">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: "var(--accent)", color: "#fff" }}>
          Concept
        </span>
      </div>

      <h2 className="text-2xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
        {content.title}
      </h2>

      {content.visual && (
        <div
          className="rounded-xl overflow-hidden"
          dangerouslySetInnerHTML={{ __html: content.visual }}
        />
      )}

      <p className="text-base leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {content.body}
      </p>

      {content.analogy && (
        <div className="rounded-xl p-4" style={{ background: "var(--surface-alt)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
            Think of it like…
          </p>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>{content.analogy}</p>
        </div>
      )}

      {content.key_term && (
        <div className="mt-auto rounded-xl p-4" style={{ background: "var(--surface-alt)", borderLeft: "3px solid var(--accent)" }}>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{content.key_term}</span>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{content.key_term_definition}</p>
        </div>
      )}

      <p className="text-center text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
        Swipe up to continue
      </p>
    </div>
  );
}
