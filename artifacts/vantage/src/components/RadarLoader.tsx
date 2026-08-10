import { useState, useEffect } from "react";

const STEPS = [
  "Parsing article...",
  "Extracting location...",
  "Correlating events...",
  "Scoring source...",
  "Generating brief..."
];

export function RadarLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 750);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8 font-mono">
      {/* Radar Animation */}
      <div className="relative w-48 h-48 border border-[#00dd55]/30 rounded-full overflow-hidden bg-[#020e05] shadow-[0_0_30px_rgba(0,221,85,0.1)]">
        {/* Grid circles */}
        <div className="absolute inset-4 border border-[#00dd55]/20 rounded-full" />
        <div className="absolute inset-10 border border-[#00dd55]/20 rounded-full" />
        <div className="absolute inset-16 border border-[#00dd55]/20 rounded-full" />
        
        {/* Crosshairs */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#00dd55]/20" />
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[#00dd55]/20" />

        {/* Sweep arm */}
        <div className="absolute top-1/2 left-1/2 w-24 h-24 origin-top-left animate-[spin_2s_linear_infinite]">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#00dd55]/40 to-transparent -rotate-90 origin-bottom-left" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }} />
          <div className="absolute top-0 left-0 w-[2px] h-full bg-[#00dd55] shadow-[0_0_8px_#00dd55]" />
        </div>

        {/* Random blips */}
        <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-[#00dd55] rounded-full animate-pulse shadow-[0_0_5px_#00dd55]" />
        <div className="absolute top-2/3 left-2/3 w-1 h-1 bg-[#ff3322] rounded-full animate-ping shadow-[0_0_5px_#ff3322]" />
      </div>

      {/* Progress Info */}
      <div className="w-64 space-y-3">
        <div className="text-[#00dd55] text-sm font-medium tracking-widest text-center h-5">
          {STEPS[stepIndex]}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[#0a2010] rounded-none overflow-hidden border border-[#1a5c20]">
          <div 
            className="h-full bg-[#00dd55] transition-all duration-300 ease-out shadow-[0_0_10px_#00dd55]"
            style={{ width: `\${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        
        {/* Matrix codes */}
        <div className="text-[#2d7040] text-[10px] flex justify-between font-mono">
          <span>SYS.OP.{stepIndex}</span>
          <span>{Math.floor(((stepIndex + 1) / STEPS.length) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
