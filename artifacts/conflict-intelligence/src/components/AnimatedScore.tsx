import { useState, useEffect } from "react";

export function AnimatedScore({ score, label, reason, active }: { score: number; label: string; reason: string; active: boolean }) {
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    if (!active) return;
    const duration = 1200;
    const start = performance.now();
    const animate = (time: number) => {
      const p = Math.min((time - start) / duration, 1);
      setCurrentScore(Math.round(p * score));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score, active]);

  const scoreColor =
    label === "High" ? "var(--accent-navy)" :
    label === "Medium" ? "var(--risk-medium)" :
    "var(--risk-high)";

  const scoreBg =
    label === "High" ? "var(--accent-navy-light)" :
    label === "Medium" ? "var(--risk-medium-bg)" :
    "var(--risk-high-bg)";

  return (
    <div className="card" style={{ background: "var(--bg-surface)" }}>
      <span className="section-label">Source Credibility</span>

      <div className="flex items-baseline gap-2 mb-3">
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "64px", fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
          {currentScore}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "16px", color: "var(--text-muted)" }}>/100</span>
      </div>

      <div style={{ height: "4px", background: "var(--bg-overlay)", borderRadius: "2px", marginBottom: "12px" }}>
        <div
          style={{
            height: "100%",
            width: currentScore + "%",
            background: scoreColor,
            borderRadius: "2px",
            transition: "width 0.05s linear",
          }}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "9px",
            fontWeight: 500,
            color: scoreColor,
            background: scoreBg,
            padding: "3px 8px",
            borderRadius: "3px",
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
          }}
        >
          {label}
        </span>
      </div>

      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
        {reason}
      </p>
    </div>
  );
}
