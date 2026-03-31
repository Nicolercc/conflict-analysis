import { useState, useEffect } from "react";

const RISK_CFG = {
  Low:    { color: "var(--risk-low)",    bg: "var(--risk-low-bg)",    fill: "22%",  label: "Low Risk" },
  Medium: { color: "var(--risk-medium)", bg: "var(--risk-medium-bg)", fill: "55%",  label: "Medium Risk" },
  High:   { color: "var(--risk-high)",   bg: "var(--risk-high-bg)",   fill: "88%",  label: "High Risk" },
};

export function EscalationMeter({ level, reason, active }: { level: string; reason: string; active: boolean }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (active) setTimeout(() => setAnimate(true), 200);
    else setAnimate(false);
  }, [active]);

  const cfg = RISK_CFG[level as keyof typeof RISK_CFG] ?? RISK_CFG.Medium;

  return (
    <div className="card" style={{ background: "var(--bg-surface)" }}>
      <span className="section-label">Escalation Risk</span>

      <div
        style={{
          height: "6px",
          background: "var(--bg-overlay)",
          borderRadius: "3px",
          marginBottom: "14px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: animate ? cfg.fill : "0%",
            background: cfg.color,
            borderRadius: "3px",
            transition: "width 1.2s ease-out",
          }}
        />
      </div>

      <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "28px", fontWeight: 600, color: cfg.color, marginBottom: "8px" }}>
        {cfg.label}
      </p>

      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
        {reason}
      </p>
    </div>
  );
}
