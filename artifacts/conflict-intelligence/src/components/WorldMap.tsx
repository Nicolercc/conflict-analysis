import { useEffect, useState } from "react";
import type { IntelligenceBrief } from "@workspace/api-client-react";

// Simplified world map paths for background
const WORLD_PATHS = [
  "M 100,100 Q 150,80 200,120 T 300,150 Q 350,120 400,180 T 500,200",
  // In a real app we'd use a comprehensive geojson conversion, but for this demo
  // we will draw an abstract grid map representation dynamically based on lat/lng.
];

interface WorldMapProps {
  data: IntelligenceBrief;
  active: boolean;
}

export function WorldMap({ data, active }: WorldMapProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) return;
    
    // Sequencing the animations:
    // 0: Initial
    // 1: Main marker (400ms)
    // 2: Lines (1000ms)
    // 3: Related marker 1 (1400ms)
    // 4: Related marker 2 (1850ms)
    // 5: Related marker 3 (2300ms)
    
    setTimeout(() => setPhase(1), 400);
    setTimeout(() => setPhase(2), 1000);
    setTimeout(() => setPhase(3), 1400);
    setTimeout(() => setPhase(4), 1850);
    setTimeout(() => setPhase(5), 2300);
  }, [active]);

  // Projection formula: x = ((lng + 180) / 360) * 960, y = ((90 - lat) / 180) * 500
  const project = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 960;
    const y = ((90 - lat) / 180) * 500;
    return { 
      x: Math.max(0, Math.min(960, x)), 
      y: Math.max(0, Math.min(500, y)) 
    };
  };

  const mainPos = project(data.location.lat, data.location.lng);

  const colors = {
    strike: "#ff3322",
    escalation: "#ff8800",
    negotiation: "#00dd66",
    humanitarian: "#3399ff",
    political: "#cc44ff"
  };

  return (
    <div className="relative w-full aspect-[960/500] bg-[#020e05] border border-[#0a2010] overflow-hidden rounded-sm">
      <svg viewBox="0 0 960 500" className="w-full h-full">
        {/* Lat/Lng Grid */}
        <g stroke="#0a2010" strokeWidth="1" opacity="0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h-\${i}`} x1="0" y1={i * (500/12)} x2="960" y2={i * (500/12)} />
          ))}
          {Array.from({ length: 24 }).map((_, i) => (
            <line key={`v-\${i}`} x1={i * (960/24)} y1="0" x2={i * (960/24)} y2="500" />
          ))}
        </g>

        {/* Abstract Continent Representation - Dotted map */}
        <g fill="#1a5c20" opacity="0.3">
          {/* North America area */}
          <circle cx="200" cy="150" r="40" filter="blur(20px)" />
          {/* South America */}
          <circle cx="280" cy="300" r="30" filter="blur(15px)" />
          {/* Europe / Africa */}
          <circle cx="480" cy="160" r="50" filter="blur(25px)" />
          {/* Asia */}
          <circle cx="650" cy="150" r="80" filter="blur(30px)" />
          {/* Australia */}
          <circle cx="800" cy="350" r="35" filter="blur(15px)" />
        </g>

        {/* Connection Lines */}
        {phase >= 2 && data.relatedEvents.map((evt, i) => {
          const pos = project(evt.lat, evt.lng);
          return (
            <path
              key={`line-\${i}`}
              d={`M \${mainPos.x} \${mainPos.y} Q \${(mainPos.x + pos.x)/2} \${Math.min(mainPos.y, pos.y) - 50} \${pos.x} \${pos.y}`}
              fill="none"
              stroke={colors[evt.type as keyof typeof colors]}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="animate-[dash_20s_linear_infinite]"
              opacity={phase >= 3 + i ? 0.6 : 0}
              style={{ transition: 'opacity 0.5s ease-in' }}
            />
          );
        })}

        {/* Main Incident Marker */}
        {phase >= 1 && (
          <g transform={`translate(\${mainPos.x}, \${mainPos.y})`}>
            <circle r="20" fill="none" stroke="#ff3322" strokeWidth="1" className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <circle r="12" fill="none" stroke="#ff3322" strokeWidth="1.5" className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
            <circle r="4" fill="#ff3322" stroke="#ffffff" strokeWidth="1.5" className="shadow-[0_0_10px_#ff3322]" />
          </g>
        )}

        {/* Related Event Markers */}
        {data.relatedEvents.map((evt, i) => {
          if (phase < 3 + i) return null;
          const pos = project(evt.lat, evt.lng);
          const color = colors[evt.type as keyof typeof colors];
          return (
            <g key={`evt-\${i}`} transform={`translate(\${pos.x}, \${pos.y})`} className="animate-in fade-in zoom-in duration-300">
              <circle r="8" fill={color} opacity="0.3" className="animate-pulse" />
              <circle r="3" fill={color} stroke="#000" strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* Overlays */}
      <div className="absolute bottom-4 left-4 bg-[#030f05]/90 border border-[#1a5c20] p-3 backdrop-blur-sm pointer-events-none">
        <div className="text-[#00dd55] font-mono text-xs mb-1">TARGET COORDS</div>
        <div className="text-white font-bold text-lg tracking-wider font-serif">
          {data.location.city.toUpperCase()}
        </div>
        <div className="text-[#a8e0a8] text-xs">
          {data.location.country}
        </div>
        <div className="text-[#2d7040] text-[10px] mt-2 font-mono">
          {data.location.lat.toFixed(4)}°N, {data.location.lng.toFixed(4)}°E
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-[#030f05]/90 border border-[#0a2010] p-2 backdrop-blur-sm pointer-events-none">
        <div className="text-[#2d7040] text-[10px] mb-2 border-b border-[#0a2010] pb-1">EVENT LEGEND</div>
        <div className="space-y-1.5">
          {Object.entries(colors).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: val }} />
              <span className="text-xs text-[#a8e0a8] uppercase text-[10px]">{key}</span>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to { stroke-dashoffset: -1000; }
        }
      `}} />
    </div>
  );
}
