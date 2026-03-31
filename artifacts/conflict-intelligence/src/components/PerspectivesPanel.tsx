import type { RegionalPerspective } from "@workspace/api-client-react";

const REGION_COLORS: Record<string, string> = {
  "Arab World": "#f59e0b",
  "Middle East": "#f59e0b",
  "Sub-Saharan Africa": "#84cc16",
  "Africa": "#84cc16",
  "Global South": "#22d3ee",
  "Latin America": "#a78bfa",
  "China": "#f87171",
  "Russia": "#f87171",
  "Iran": "#fb923c",
  "NATO/West": "#60a5fa",
  "United States": "#60a5fa",
  "Europe": "#60a5fa",
  "default": "#6ee7b7",
};

function getColor(region: string): string {
  for (const [key, val] of Object.entries(REGION_COLORS)) {
    if (region.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return REGION_COLORS.default;
}

export function PerspectivesPanel({ perspectives, active }: { perspectives: RegionalPerspective[]; active: boolean }) {
  return (
    <div
      className="bg-[#030f05] border border-[#0a2010] p-5 space-y-4 transition-all duration-700"
      style={{ opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(20px)" }}
    >
      <div className="flex items-center gap-2 border-b border-[#0a2010] pb-3">
        <div className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
        <div className="text-[#2d7040] text-[10px] font-mono tracking-widest">REGIONAL PERSPECTIVES</div>
      </div>

      <div className="space-y-4">
        {perspectives.map((p, i) => {
          const color = getColor(p.region);
          return (
            <div
              key={i}
              className="border-l-2 pl-3 space-y-1 transition-all duration-500"
              style={{
                borderColor: color,
                opacity: active ? 1 : 0,
                transitionDelay: `${i * 120}ms`,
              }}
            >
              <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color }}>
                {p.region}
              </div>
              <p className="font-mono text-xs text-[#a8c8a8] leading-relaxed">{p.viewpoint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
