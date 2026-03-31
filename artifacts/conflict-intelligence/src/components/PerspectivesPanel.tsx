import type { Perspective } from "@workspace/api-client-react";

const ALIGNMENT_COLORS: Record<string, string> = {
  "Western":             "var(--region-western)",
  "Regional":            "var(--region-mideast)",
  "State Media":         "var(--region-state)",
  "Civil Society":       "var(--risk-low)",
  "Affected Population": "var(--risk-medium)",
};

const ALIGNMENT_BG: Record<string, string> = {
  "Western":             "#EBF0F8",
  "Regional":            "#FBF5E6",
  "State Media":         "#F5F3F1",
  "Civil Society":       "#EBF5F0",
  "Affected Population": "#FBF5E6",
};

export function PerspectivesPanel({ perspectives, active }: { perspectives: Perspective[]; active: boolean }) {
  return (
    <div>
      <span className="section-label">Geopolitical Perspectives</span>
      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", marginTop: "-10px" }}>
        How different actors frame this event
      </p>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 0 }}>
        {perspectives.map((p, i) => {
          const color = ALIGNMENT_COLORS[p.alignment] ?? "var(--accent-navy)";
          const bg = ALIGNMENT_BG[p.alignment] ?? "var(--accent-navy-light)";
          return (
            <div
              key={i}
              style={{
                borderLeft: "3px solid " + color,
                paddingLeft: "16px",
                paddingTop: "16px",
                paddingBottom: "16px",
                borderBottom: i < perspectives.length - 1 ? "1px solid var(--border-light)" : "none",
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.4s ease, transform 0.4s ease",
                transitionDelay: (i * 120) + "ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" as const }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 500,
                    color,
                    background: bg,
                    padding: "2px 7px",
                    borderRadius: "3px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                  }}
                >
                  {p.alignment}
                </span>
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {p.actor}
                </span>
              </div>
              <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "8px" }}>
                {p.framing}
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-muted)" }}>
                <strong>Underlying interest:</strong> {p.interests}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
