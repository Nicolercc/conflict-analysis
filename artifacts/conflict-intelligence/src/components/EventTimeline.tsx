import type { RelatedEvent } from "@workspace/api-client-react";

const TYPE_COLORS: Record<string, string> = {
  strike:       "var(--type-strike)",
  escalation:   "var(--type-escalation)",
  negotiation:  "var(--type-negotiation)",
  humanitarian: "var(--type-humanitarian)",
  political:    "var(--type-political)",
};

const TYPE_LABELS: Record<string, string> = {
  strike:       "Strike",
  escalation:   "Escalation",
  negotiation:  "Negotiation",
  humanitarian: "Humanitarian",
  political:    "Political",
};

const TYPE_BG: Record<string, string> = {
  strike:       "#F5EAEA",
  escalation:   "#FBF3E6",
  negotiation:  "#EBF5F0",
  humanitarian: "#EBF0F8",
  political:    "#F0EBF8",
};

export function EventTimeline({ events, active }: { events: RelatedEvent[]; active: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 0 }}>
      {events.map((evt, i) => {
        const color = TYPE_COLORS[evt.type] ?? "var(--text-muted)";
        const label = TYPE_LABELS[evt.type] ?? evt.type;
        const bg = TYPE_BG[evt.type] ?? "var(--bg-subtle)";
        const searchUrl = evt.searchQuery
          ? "https://news.google.com/search?q=" + encodeURIComponent(evt.searchQuery)
          : undefined;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "16px",
              paddingTop: "16px",
              paddingBottom: "16px",
              borderBottom: i < events.length - 1 ? "1px solid var(--border-light)" : "none",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
              transitionDelay: (400 + i * 200) + "ms",
            }}
          >
            {/* Left: date + line + dot */}
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", width: "60px", flexShrink: 0 }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  marginBottom: "4px",
                }}
              />
              <div
                style={{
                  width: "1px",
                  flex: 1,
                  background: "var(--border-light)",
                  minHeight: "20px",
                }}
              />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-muted)", marginTop: "4px", textAlign: "center" as const }}>
                {evt.date}
              </span>
            </div>

            {/* Right: content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "8px",
                    color,
                    background: bg,
                    padding: "2px 7px",
                    borderRadius: "3px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                  }}
                >
                  {label}
                </span>
              </div>
              <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px", lineHeight: "1.3" }}>
                {evt.title}
              </h4>
              <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.55", marginBottom: "6px" }}>
                {evt.description}
              </p>
              {searchUrl && (
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px",
                    color: "var(--accent-navy)",
                    textDecoration: "none",
                    letterSpacing: "0.05em",
                  }}
                >
                  Verify on Google News ↗
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
