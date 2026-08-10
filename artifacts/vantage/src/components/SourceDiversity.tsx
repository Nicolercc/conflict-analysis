import type { VerificationSource } from "@workspace/api-client-react";

const REGION_COLORS: Record<string, string> = {
  "Western":      "var(--region-western)",
  "Middle East":  "var(--region-mideast)",
  "Asia":         "var(--region-asia)",
  "Africa":       "var(--region-africa)",
  "Latin America":"var(--region-latam)",
  "State Media":  "var(--region-state)",
};

export function SourceDiversity({ sources }: { sources: VerificationSource[] | undefined }) {
  if (!sources || sources.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const s of sources) counts[s.region] = (counts[s.region] ?? 0) + 1;
  const total = sources.length;
  const entries = Object.entries(counts);

  return (
    <div>
      <span className="section-label">Source Geographic Distribution</span>

      <div
        style={{
          height: "8px",
          borderRadius: "4px",
          display: "flex",
          overflow: "hidden",
          marginBottom: "12px",
        }}
      >
        {entries.map(([region, count], i) => (
          <div
            key={region}
            style={{
              width: (count / total * 100) + "%",
              background: REGION_COLORS[region] ?? "var(--text-muted)",
              borderRadius: i === 0 ? "4px 0 0 4px" : i === entries.length - 1 ? "0 4px 4px 0" : "0",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "14px" }}>
        {entries.map(([region, count]) => (
          <div key={region} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: REGION_COLORS[region] ?? "var(--text-muted)" }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-muted)" }}>
              {region} ({count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
