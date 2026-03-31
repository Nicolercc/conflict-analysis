import type { Verification } from "@workspace/api-client-react";

const REGION_COLORS: Record<string, string> = {
  "Western":      "var(--region-western)",
  "Middle East":  "var(--region-mideast)",
  "Asia":         "var(--region-asia)",
  "Africa":       "var(--region-africa)",
  "Latin America":"var(--region-latam)",
  "State Media":  "var(--region-state)",
};
const REGION_BG: Record<string, string> = {
  "Western":      "#EBF0F8",
  "Middle East":  "#FBF5E6",
  "Asia":         "#F0EBF8",
  "Africa":       "#EBF5F0",
  "Latin America":"#EBF3F8",
  "State Media":  "#F5F3F1",
};

export function VerificationPanel({ verification, active }: { verification: Verification | undefined; active: boolean }) {
  if (!verification) return null;

  const unavailable = !verification.sources || verification.sources.length === 0;

  return (
    <div
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <span className="section-label">International Source Verification</span>
      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", marginTop: "-10px" }}>
        Cross-referenced against global news coverage via Claude AI
      </p>

      {unavailable ? (
        <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "14px", color: "var(--text-muted)" }}>
          Verification temporarily unavailable.
        </p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            {verification.sources.map((src, i) => {
              const color = REGION_COLORS[src.region] ?? "var(--text-muted)";
              const bg = REGION_BG[src.region] ?? "var(--bg-subtle)";
              return (
                <div
                  key={i}
                  className="card"
                  style={{
                    padding: "16px",
                    opacity: active ? 1 : 0,
                    transition: "opacity 0.4s ease",
                    transitionDelay: (i * 80) + "ms",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", fontWeight: 500, color: "var(--text-primary)" }}>
                      {src.outlet}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "8px",
                        color,
                        background: bg,
                        padding: "2px 6px",
                        borderRadius: "3px",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {src.region}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "8px" }}>
                    {src.summary}
                  </p>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--accent-navy)", textDecoration: "none" }}
                    >
                      Read source ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="card" style={{ borderLeft: "3px solid var(--risk-low)" }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--risk-low)", letterSpacing: "0.12em", textTransform: "uppercase" as const, display: "block", marginBottom: "8px" }}>
                Where sources agree
              </span>
              <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                {verification.consensus}
              </p>
            </div>
            <div className="card" style={{ borderLeft: "3px solid var(--risk-medium)" }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--risk-medium)", letterSpacing: "0.12em", textTransform: "uppercase" as const, display: "block", marginBottom: "8px" }}>
                Where sources diverge
              </span>
              <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                {verification.divergence}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
