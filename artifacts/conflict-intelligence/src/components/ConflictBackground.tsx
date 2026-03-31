export function ConflictBackground({ text, active }: { text: string; active: boolean }) {
  return (
    <div
      style={{
        borderLeft: "3px solid var(--accent-navy-border)",
        paddingLeft: "16px",
        opacity: active ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.7" }}>
        {text}
      </p>
    </div>
  );
}
