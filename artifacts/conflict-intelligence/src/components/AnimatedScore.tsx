import { useState, useEffect } from "react";

export function AnimatedScore({ score, label, reason, active }: { score: number; label: string; reason: string; active: boolean }) {
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    if (!active) return;
    
    const duration = 1400; // ms
    const start = performance.now();
    
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      setCurrentScore(Math.floor(easeProgress * score));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score, active]);

  const getColor = (s: number) => {
    if (s >= 75) return "#4ade80";
    if (s >= 50) return "#fbbf24";
    return "#ff6b6b";
  };

  const color = getColor(currentScore);

  return (
    <div className="bg-[#030f05] border border-[#0a2010] p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 text-[#2d7040] text-[10px] font-mono">CREDIBILITY INDEX</div>
      
      <div className="flex items-end gap-3 mt-4 mb-2">
        <div 
          className="text-6xl font-bold tracking-tighter"
          style={{ color, textShadow: `0 0 15px \${color}40` }}
        >
          {currentScore}
        </div>
        <div className="text-xl mb-1.5 uppercase font-bold" style={{ color }}>
          {label}
        </div>
      </div>

      <div className="h-1 bg-[#0a2010] w-full mb-4">
        <div 
          className="h-full transition-all duration-75"
          style={{ 
            width: `\${currentScore}%`, 
            backgroundColor: color,
            boxShadow: `0 0 10px \${color}`
          }} 
        />
      </div>

      <div className="text-sm italic text-[#a8e0a8] font-serif border-l-2 border-[#1a5c20] pl-3 py-1">
        {reason}
      </div>
    </div>
  );
}
