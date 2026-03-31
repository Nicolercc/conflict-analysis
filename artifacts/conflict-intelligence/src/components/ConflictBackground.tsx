export function ConflictBackground({ text, sources, active }: { text: string; sources: string[]; active: boolean }) {
  return (
    <div
      className="bg-[#030f05] border border-[#0a2010] p-5 space-y-4 transition-all duration-700"
      style={{ opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(20px)" }}
    >
      <div className="flex items-center gap-2 border-b border-[#0a2010] pb-3">
        <div className="w-2 h-2 rounded-full bg-[#cc44ff] animate-pulse" />
        <div className="text-[#2d7040] text-[10px] font-mono tracking-widest">HISTORICAL CONTEXT</div>
      </div>

      <p className="font-mono text-xs text-[#a8c0a8] leading-relaxed">{text}</p>

      {sources && sources.length > 0 && (
        <div className="border-t border-[#0a2010] pt-3 space-y-1">
          <div className="text-[9px] font-mono text-[#2d7040] tracking-widest">SOURCES CONSULTED</div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <span
                key={i}
                className="text-[9px] font-mono text-[#1a5c20] bg-[#0a2010] px-2 py-0.5 border border-[#1a5c20]/30"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
