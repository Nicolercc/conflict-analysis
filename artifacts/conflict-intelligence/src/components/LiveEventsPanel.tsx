import { ExternalLink } from "lucide-react";
import type { LiveEvent } from "@workspace/api-client-react";

export function LiveEventsPanel({ events, active }: { events: LiveEvent[]; active: boolean }) {
  if (!events || events.length === 0) return null;

  return (
    <div
      className="bg-[#030f05] border border-[#0a2010] p-5 space-y-4 transition-all duration-700"
      style={{ opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(20px)" }}
    >
      <div className="flex items-center justify-between border-b border-[#0a2010] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00dd55] animate-pulse" />
          <div className="text-[#2d7040] text-[10px] font-mono tracking-widest">LIVE FEED — REAL WORLD REPORTS</div>
        </div>
        <div className="text-[9px] font-mono text-[#2d7040] border border-[#0a2010] px-1.5 py-0.5">GDELT</div>
      </div>

      <div className="space-y-2">
        {events.map((ev, i) => (
          <div
            key={i}
            className="group flex items-start gap-3 py-2 border-b border-[#0a2010] last:border-0 transition-all duration-500"
            style={{
              opacity: active ? 1 : 0,
              transitionDelay: `${i * 80}ms`,
            }}
          >
            <div className="flex-shrink-0 w-1 h-1 rounded-full bg-[#00dd55] mt-2 group-hover:bg-[#00ff66] transition-colors" />
            <div className="flex-1 min-w-0">
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[#c8eac8] hover:text-[#00dd55] line-clamp-2 leading-relaxed transition-colors flex items-start gap-1"
              >
                <span className="flex-1">{ev.title}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] font-mono text-[#2d7040]">{ev.source}</span>
                <span className="text-[9px] font-mono text-[#1a5c20]">{ev.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
