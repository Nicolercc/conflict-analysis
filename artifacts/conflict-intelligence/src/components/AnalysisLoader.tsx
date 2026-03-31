import { useEffect, useState } from "react";

const STEPS = [
  "Parsing article text",
  "Extracting location & actors",
  "Correlating historical events",
  "Scoring source credibility",
  "Building multi-perspective brief",
  "Running Claude verification pass",
];

export function AnalysisLoader() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setStep(i + 1), (i + 1) * 750)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[400px] px-6">
      <div
        className="w-full max-w-sm bg-white border border-[var(--border-light)] rounded-md p-8"
        style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
        {/* Progress bar */}
        <div className="relative h-[3px] bg-[var(--bg-overlay)] rounded-full overflow-hidden mb-6">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--accent-navy)] rounded-full"
            style={{
              width: `${Math.min((step / STEPS.length) * 100, 100)}%`,
              transition: "width 0.7s ease",
            }}
          />
        </div>

        <h2
          className="font-display text-2xl mb-1"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "var(--text-primary)" }}
        >
          Analyzing Article
        </h2>
        <p
          className="text-sm italic mb-6"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: "var(--text-muted)" }}
        >
          Extracting context, verifying sources, building brief
        </p>

        <div className="space-y-2">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 transition-all duration-400"
              style={{
                opacity: step > i ? 1 : step === i ? 0.5 : 0.2,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                color: step > i ? "var(--accent-navy)" : "var(--text-muted)",
              }}
            >
              <span style={{ width: 14, display: "inline-block" }}>
                {step > i ? "✓" : "◦"}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
