import { useState, useEffect } from "react";

export function EscalationMeter({ level, reason, active }: { level: string; reason: string; active: boolean }) {
  const [fill, setFill] = useState(0);

  const targetFill = level === 'Low' ? 25 : level === 'Medium' ? 58 : 90;
  const color = level === 'Low' ? '#4ade80' : level === 'Medium' ? '#fbbf24' : '#ff3322';

  useEffect(() => {
    if (active) {
      setTimeout(() => {
        setFill(targetFill);
      }, 300);
    } else {
      setFill(0);
    }
  }, [active, targetFill]);

  return (
    <div className="bg-[#030f05] border border-[#0a2010] p-5">
      <div className="text-[#2d7040] text-[10px] font-mono mb-4">THREAT ESCALATION VECTOR</div>
      
      <div className="relative h-6 bg-[#0a2010] border border-[#1a5c20] overflow-hidden mb-3">
        {/* Target Zones */}
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-[#1a5c20] z-10" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-[#1a5c20] z-10" />
        
        {/* Fill Bar */}
        <div 
          className="absolute left-0 top-0 bottom-0"
          style={{ 
            width: `\${fill}%`, 
            backgroundColor: color,
            boxShadow: `0 0 20px \${color}80`,
            transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        />
        
        {/* Stripes Overlay */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)'
          }}
        />
      </div>

      <div 
        className="text-2xl font-bold uppercase tracking-widest mb-3"
        style={{ color, textShadow: `0 0 10px \${color}40` }}
      >
        {level} RISK
      </div>

      <div className="text-sm text-[#a8e0a8] font-serif border-l-2 pl-3 py-1" style={{ borderColor: color }}>
        {reason}
      </div>
    </div>
  );
}
