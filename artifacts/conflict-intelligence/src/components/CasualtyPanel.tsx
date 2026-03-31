import type { CasualtyData } from "@workspace/api-client-react";

export function CasualtyPanel({ data, active }: { data: CasualtyData; active: boolean }) {
  return (
    <div
      className="bg-[#030f05] border border-[#0a2010] p-5 space-y-4 transition-all duration-700"
      style={{ opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(20px)" }}
    >
      <div className="flex items-center gap-2 border-b border-[#0a2010] pb-3">
        <div className="w-2 h-2 rounded-full bg-[#ff3322] animate-pulse" />
        <div className="text-[#2d7040] text-[10px] font-mono tracking-widest">CASUALTY INTELLIGENCE</div>
      </div>

      <div className="space-y-1">
        <div className="text-[9px] font-mono text-[#ff3322] tracking-widest uppercase">Confirmed Toll</div>
        <p className="font-mono text-sm text-[#ffd0d0] leading-relaxed">{data.description}</p>
      </div>

      <div className="space-y-1">
        <div className="text-[9px] font-mono text-[#ff8800] tracking-widest uppercase">Civilian Impact</div>
        <p className="font-mono text-xs text-[#c8eac8] leading-relaxed">{data.civilianImpact}</p>
      </div>

      <div className="space-y-1 border-t border-[#0a2010] pt-3">
        <div className="text-[9px] font-mono text-[#3399ff] tracking-widest uppercase">All-Sides Context</div>
        <p className="font-mono text-xs text-[#a8c8e0] leading-relaxed">{data.allSides}</p>
      </div>
    </div>
  );
}
