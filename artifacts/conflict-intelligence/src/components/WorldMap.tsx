import { useEffect, useState, useRef } from "react";
import type { IntelligenceBrief } from "@workspace/api-client-react";

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

const CONTINENTS = [
  { id: "na", d: "M 75,85 L 80,70 L 100,65 L 135,60 L 185,55 L 220,60 L 235,75 L 240,100 L 230,120 L 215,140 L 200,155 L 185,165 L 165,170 L 145,175 L 130,185 L 115,195 L 100,205 L 85,195 L 75,180 L 65,165 L 55,145 L 50,120 L 55,100 Z" },
  { id: "sa", d: "M 185,210 L 210,200 L 235,210 L 250,230 L 255,260 L 250,290 L 240,320 L 225,345 L 210,360 L 195,355 L 180,335 L 170,305 L 165,275 L 168,250 L 175,230 Z" },
  { id: "eu", d: "M 390,55 L 420,50 L 450,52 L 470,58 L 475,70 L 465,82 L 450,88 L 435,90 L 420,85 L 405,80 L 395,70 Z" },
  { id: "af", d: "M 390,110 L 430,100 L 465,105 L 490,120 L 500,145 L 500,175 L 495,205 L 480,230 L 460,255 L 440,268 L 420,265 L 400,250 L 385,225 L 375,195 L 372,165 L 375,140 L 382,120 Z" },
  { id: "as", d: "M 480,55 L 530,45 L 600,40 L 670,42 L 730,50 L 780,58 L 800,70 L 790,88 L 760,100 L 720,108 L 680,112 L 640,115 L 600,118 L 560,115 L 525,108 L 495,95 L 478,78 Z" },
  { id: "au", d: "M 680,270 L 720,260 L 760,265 L 790,280 L 800,300 L 795,320 L 775,335 L 745,340 L 710,335 L 685,320 L 670,300 L 672,282 Z" },
];

function project(lat: number, lng: number) {
  return {
    x: Math.max(10, Math.min(950, ((lng + 180) / 360) * 960)),
    y: Math.max(10, Math.min(490, ((90 - lat) / 180) * 500)),
  };
}

interface WorldMapProps {
  data: IntelligenceBrief;
  active: boolean;
}

export function WorldMap({ data, active }: WorldMapProps) {
  const [phase, setPhase] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; date: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 1850),
      setTimeout(() => setPhase(5), 2300),
      setTimeout(() => setPhase(6), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const mainPos = project(data.location.lat, data.location.lng);
  const presentTypes = [...new Set(data.relatedEvents.map(e => e.type))];

  return (
    <div className="relative w-full" style={{ aspectRatio: "960/500" }}>
      <svg
        ref={svgRef}
        viewBox="0 0 960 500"
        className="w-full h-full"
        style={{ background: "#EEE8DF" }}
      >
        {/* Grid lines every 30deg */}
        <g stroke="#C8C2B8" strokeWidth="0.3" opacity="0.5">
          {[-60, -30, 0, 30, 60].map(lat => {
            const y = ((90 - lat) / 180) * 500;
            return <line key={"lat" + lat} x1="0" y1={y} x2="960" y2={y} />;
          })}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lng => {
            const x = ((lng + 180) / 360) * 960;
            return <line key={"lng" + lng} x1={x} y1="0" x2={x} y2="500" />;
          })}
        </g>

        {/* Continents */}
        {CONTINENTS.map(c => (
          <path key={c.id} d={c.d} fill="#D4CCBE" stroke="#BFB8AE" strokeWidth="0.5" />
        ))}

        {/* Connection lines — fade in at phase 2 */}
        {phase >= 2 && data.relatedEvents.map((evt, i) => {
          const pos = project(evt.lat, evt.lng);
          const color = TYPE_COLORS[evt.type] ?? "#7A7470";
          const cx = (mainPos.x + pos.x) / 2;
          const cy = Math.min(mainPos.y, pos.y) - 40;
          return (
            <path
              key={"line" + i}
              d={"M " + mainPos.x + " " + mainPos.y + " Q " + cx + " " + cy + " " + pos.x + " " + pos.y}
              fill="none"
              stroke={color}
              strokeWidth="1"
              strokeDasharray="5 4"
              opacity={phase >= 3 + i ? 0.6 : 0}
              style={{ transition: "opacity 0.5s ease" }}
            />
          );
        })}

        {/* Main incident marker */}
        {phase >= 1 && (
          <g transform={"translate(" + mainPos.x + "," + mainPos.y + ")"}>
            {/* Ripple — animates twice then stops */}
            <circle r="5" fill="none" stroke="var(--risk-high)" strokeWidth="1.5">
              <animate attributeName="r" values="5;20" dur="2.5s" repeatCount="2" />
              <animate attributeName="stroke-opacity" values="0.6;0" dur="2.5s" repeatCount="2" />
            </circle>
            {/* Static marker */}
            <circle r="6" fill="var(--risk-high)" stroke="white" strokeWidth="1.5" />
          </g>
        )}

        {/* City label */}
        {phase >= 1 && (
          <g transform={"translate(" + mainPos.x + "," + (mainPos.y + 16) + ")"}>
            <rect x="-45" y="2" width="90" height="22" rx="11" fill="white" stroke="var(--border-medium)" strokeWidth="0.8" />
            <text
              x="0" y="16"
              textAnchor="middle"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", fill: "var(--accent-navy)", fontWeight: 600 }}
            >
              {data.location.city}
            </text>
          </g>
        )}

        {/* Related event markers */}
        {data.relatedEvents.map((evt, i) => {
          if (phase < 3 + i) return null;
          const pos = project(evt.lat, evt.lng);
          const color = TYPE_COLORS[evt.type] ?? "#7A7470";
          return (
            <g
              key={"evt" + i}
              transform={"translate(" + pos.x + "," + pos.y + ")"}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setTooltip({ x: pos.x, y: pos.y, title: evt.title, date: evt.date })}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle r="5" fill={color} stroke="white" strokeWidth="1" opacity="0.85" />
              {/* Single ripple then static */}
              <circle r="4" fill="none" stroke={color} strokeWidth="1">
                <animate attributeName="r" values="5;14" dur="1.5s" repeatCount="1" fill="freeze" />
                <animate attributeName="stroke-opacity" values="0.6;0" dur="1.5s" repeatCount="1" fill="freeze" />
              </circle>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g transform={"translate(" + Math.min(tooltip.x, 820) + "," + Math.max(tooltip.y - 48, 10) + ")"}>
            <rect x="-4" y="0" width="160" height="40" rx="4" fill="white" stroke="var(--border-light)" strokeWidth="0.8" style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.12))" }} />
            <text x="6" y="13" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "8px", fill: "var(--text-muted)" }}>
              {tooltip.date}
            </text>
            <text x="6" y="28" style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", fill: "var(--text-primary)", fontWeight: 600 }}>
              {tooltip.title.length > 22 ? tooltip.title.slice(0, 22) + "…" : tooltip.title}
            </text>
          </g>
        )}

        {/* Legend — appears at phase 6 */}
        {phase >= 6 && (
          <g transform="translate(16, 16)">
            <rect width={100} height={presentTypes.length * 18 + 16} rx="4" fill="white" stroke="var(--border-light)" strokeWidth="0.8" />
            {presentTypes.map((type, i) => (
              <g key={type} transform={"translate(8," + (i * 18 + 12) + ")"}>
                <circle r="4" fill={TYPE_COLORS[type] ?? "#7A7470"} />
                <text x="12" y="4" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "8px", fill: "var(--text-muted)" }}>
                  {TYPE_LABELS[type] ?? type}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
