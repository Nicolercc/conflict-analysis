import { ExternalLink } from "lucide-react";
import type { LiveEvent } from "@workspace/api-client-react";

export function LiveEventsPanel({ events, active }: { events: LiveEvent[]; active: boolean }) {
  if (!events || events.length === 0) return null;

  return (
    <div
      className="card"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border-light)" }}>
        <span className="section-label" style={{ margin: 0, padding: 0, border: "none" }}>Recent Coverage</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "8px", color: "var(--text-faint)", letterSpacing: "0.1em" }}>
          via GDELT
        </span>
      </div>

      <div>
        {events.map((ev, i) => (
          <div
            key={i}
            style={{
              paddingTop: "12px",
              paddingBottom: "12px",
              borderBottom: i < events.length - 1 ? "1px solid var(--border-light)" : "none",
              opacity: active ? 1 : 0,
              transition: "opacity 0.4s ease",
              transitionDelay: (i * 60) + "ms",
            }}
          >
            <a
              href={ev.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: "14px",
                color: "var(--text-primary)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                lineHeight: "1.5",
                display: "flex",
                gap: "6px",
                alignItems: "flex-start",
              }}
            >
              <span style={{ flex: 1 }}>{ev.title}</span>
              <ExternalLink style={{ width: "12px", height: "12px", flexShrink: 0, marginTop: "4px", color: "var(--text-muted)" }} />
            </a>
            <div style={{ marginTop: "4px", display: "flex", gap: "10px" }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--accent-navy)" }}>{ev.source}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-faint)" }}>{ev.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
