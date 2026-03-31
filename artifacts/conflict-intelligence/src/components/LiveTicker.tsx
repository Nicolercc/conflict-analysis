export function SiteHeader({ onReset, hasResult }: { onReset?: () => void; hasResult?: boolean }) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "56px",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-light)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        zIndex: 100,
      }}
    >
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "18px",
          fontWeight: 600,
          color: "var(--text-primary)",
          flex: 1,
          cursor: hasResult ? "pointer" : "default",
        }}
        onClick={onReset}
      >
        Conflict Intelligence
      </div>

      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
          flex: 1,
          textAlign: "center" as const,
        }}
      >
        For journalists &amp; researchers
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "8px",
            color: "var(--accent-navy)",
            border: "1px solid var(--accent-navy-border)",
            padding: "2px 8px",
            borderRadius: "3px",
            letterSpacing: "0.1em",
          }}
        >
          Beta
        </span>
      </div>
    </header>
  );
}
