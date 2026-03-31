import { useState, useEffect } from "react";

const MESSAGES = [
  "CONFLICT CONTEXT ENGINE · LIVE INTELLIGENCE SYSTEM",
  "GEOSPATIAL MAPPING · EVENT CORRELATION · CREDIBILITY SCORING",
  "PASTE ANY CONFLICT ARTICLE TO BEGIN ANALYSIS",
  "INCIDENT TRACKING · PATTERN RECOGNITION · BRIEF GENERATION"
];

export function LiveTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0a2010] border-b border-[#1a5c20] text-[#00dd55] text-xs font-mono py-1 px-4 flex items-center gap-3 overflow-hidden shadow-[0_0_10px_rgba(0,221,85,0.1)] z-50 fixed top-0 left-0">
      <div className="flex items-center gap-2 bg-[#ff3322]/20 px-2 py-0.5 rounded-sm border border-[#ff3322]/50 shrink-0">
        <div className="w-2 h-2 rounded-full bg-[#ff3322] animate-pulse shadow-[0_0_8px_#ff3322]" />
        <span className="font-bold text-[#ff3322] tracking-wider">LIVE</span>
      </div>
      <div className="relative flex-1 h-4 overflow-hidden">
        {MESSAGES.map((msg, i) => (
          <div
            key={i}
            className={`absolute inset-0 flex items-center transition-all duration-500 ease-in-out ${
              i === index ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {msg}
          </div>
        ))}
      </div>
      <div className="shrink-0 text-[#2d7040]">
        {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
      </div>
    </div>
  );
}
