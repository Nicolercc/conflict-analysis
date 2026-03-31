import { useEffect, useState } from "react";
import type { IntelligenceBrief } from "@workspace/api-client-react";

interface WorldMapProps {
  data: IntelligenceBrief;
  active: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  strike: "#ff3322",
  escalation: "#ff8800",
  negotiation: "#00dd66",
  humanitarian: "#3399ff",
  political: "#cc44ff",
};

export function WorldMap({ data, active }: WorldMapProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 1700),
      setTimeout(() => setPhase(5), 2100),
      setTimeout(() => setPhase(6), 2500),
      setTimeout(() => setPhase(7), 2900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const project = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 960;
    const y = ((90 - lat) / 180) * 500;
    return {
      x: Math.max(10, Math.min(950, x)),
      y: Math.max(10, Math.min(490, y)),
    };
  };

  const mainPos = project(data.location.lat, data.location.lng);

  return (
    <div className="relative w-full aspect-[960/500] bg-[#020e05] border border-[#0a2010] overflow-hidden">
      <svg viewBox="0 0 960 500" className="w-full h-full">
        {/* Grid */}
        <g stroke="#0a2010" strokeWidth="0.8" opacity="0.6">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={"h" + i} x1="0" y1={i * (500 / 12)} x2="960" y2={i * (500 / 12)} />
          ))}
          {Array.from({ length: 24 }).map((_, i) => (
            <line key={"v" + i} x1={i * (960 / 24)} y1="0" x2={i * (960 / 24)} y2="500" />
          ))}
        </g>

        {/* Continent blobs */}
        <g fill="#1a5c20" opacity="0.25">
          {/* North America */}
          <ellipse cx="190" cy="155" rx="90" ry="80" />
          {/* South America */}
          <ellipse cx="265" cy="320" rx="55" ry="75" />
          {/* Europe */}
          <ellipse cx="490" cy="150" rx="55" ry="55" />
          {/* Africa */}
          <ellipse cx="490" cy="295" rx="65" ry="95" />
          {/* Middle East */}
          <ellipse cx="565" cy="210" rx="40" ry="35" />
          {/* Central Asia */}
          <ellipse cx="630" cy="175" rx="60" ry="40" />
          {/* South/SE Asia */}
          <ellipse cx="710" cy="230" rx="80" ry="55" />
          {/* East Asia */}
          <ellipse cx="770" cy="160" rx="65" ry="55" />
          {/* Australia */}
          <ellipse cx="800" cy="365" rx="55" ry="40" />
        </g>

        {/* Equator line */}
        <line x1="0" y1="250" x2="960" y2="250" stroke="#1a5c20" strokeWidth="0.5" strokeDasharray="8 8" opacity="0.4" />

        {/* Connection lines from main to related events */}
        {phase >= 2 && data.relatedEvents.map((evt, i) => {
          if (phase < 3 + i) return null;
          const pos = project(evt.lat, evt.lng);
          const color = TYPE_COLORS[evt.type] ?? "#6ee7b7";
          const cx = (mainPos.x + pos.x) / 2;
          const cy = Math.min(mainPos.y, pos.y) - 60;
          return (
            <path
              key={"line" + i}
              d={"M " + mainPos.x + " " + mainPos.y + " Q " + cx + " " + cy + " " + pos.x + " " + pos.y}
              fill="none"
              stroke={color}
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.5"
              style={{ transition: "opacity 0.5s ease-in" }}
            />
          );
        })}

        {/* Main incident marker */}
        {phase >= 1 && (
          <g transform={"translate(" + mainPos.x + "," + mainPos.y + ")"}>
            <circle r="22" fill="none" stroke="#ff3322" strokeWidth="1" opacity="0.4" className="animate-ping" style={{ animationDuration: "2s" }} />
            <circle r="13" fill="none" stroke="#ff3322" strokeWidth="1.5" opacity="0.6" className="animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
            <circle r="5" fill="#ff3322" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}

        {/* Related event markers */}
        {data.relatedEvents.map((evt, i) => {
          if (phase < 3 + i) return null;
          const pos = project(evt.lat, evt.lng);
          const color = TYPE_COLORS[evt.type] ?? "#6ee7b7";
          return (
            <g key={"evt" + i} transform={"translate(" + pos.x + "," + pos.y + ")"}>
              <circle r="10" fill={color} opacity="0.2" className="animate-pulse" />
              <circle r="4" fill={color} stroke="#000" strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* Location overlay */}
      <div className="absolute bottom-4 left-4 bg-[#030f05]/90 border border-[#1a5c20] p-3 pointer-events-none">
        <div className="text-[#00dd55] font-mono text-[9px] mb-1 tracking-widest">TARGET COORDS</div>
        <div className="text-white font-bold text-base tracking-wider font-serif">
          {data.location.city.toUpperCase()}
        </div>
        <div className="text-[#a8e0a8] text-xs">{data.location.country}</div>
        <div className="text-[#2d7040] text-[9px] mt-1.5 font-mono">
          {data.location.lat.toFixed(3)}&deg;N &nbsp; {data.location.lng.toFixed(3)}&deg;E
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 bg-[#030f05]/90 border border-[#0a2010] p-2 pointer-events-none">
        <div className="text-[#2d7040] text-[9px] mb-1.5 border-b border-[#0a2010] pb-1 tracking-widest">LEGEND</div>
        <div className="space-y-1">
          {Object.entries(TYPE_COLORS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: val }} />
              <span className="text-[9px] text-[#a8e0a8] uppercase">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scan line animation */}
      {active && (
        <div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00dd55] to-transparent opacity-20 pointer-events-none"
          style={{ top: "50%", animation: "scanline 3s linear infinite" }}
        />
      )}

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-250px); opacity: 0.3; }
          50% { opacity: 0.15; }
          100% { transform: translateY(250px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
