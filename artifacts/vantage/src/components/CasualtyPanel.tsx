import type { CasualtyData } from "@workspace/api-client-react";

export function CasualtyPanel({ data, active }: { data: CasualtyData; active: boolean }) {
  return (
    <div
      style={{
        background: "var(--risk-high-bg)",
        border: "1px solid var(--border-light)",
        borderLeft: "3px solid var(--risk-high)",
        borderRadius: "6px",
        padding: "20px",
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <span className="section-label" style={{ color: "var(--risk-high)" }}>Affected Population</span>

      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "15px", fontWeight: 400, color: "var(--text-primary)", lineHeight: "1.6", marginBottom: "12px" }}>
        {data.description}
      </p>

      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "12px" }}>
        {data.civilianImpact}
      </p>

      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "10px" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-muted)", display: "block", marginBottom: "4px", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
          All-Sides Context
        </span>
        <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          {data.allSides}
        </p>
      </div>
    </div>
  );
}
