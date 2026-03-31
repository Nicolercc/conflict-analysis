import type { RelatedEvent } from "@workspace/api-client-react";

const TYPE_COLORS: Record<string, string> = {
  strike: "#ff3322",
  escalation: "#ff8800",
  negotiation: "#00dd66",
  humanitarian: "#3399ff",
  political: "#cc44ff",
};

const TYPE_LABELS: Record<string, string> = {
  strike: "Strike / Attack",
  escalation: "Escalation",
  negotiation: "Negotiation",
  humanitarian: "Humanitarian",
  political: "Political",
};

export function EventTimeline({ events, active }: { events: RelatedEvent[]; active: boolean }) {
  return (
    <div className="relative pl-6 py-2">
      <div className="absolute top-4 bottom-4 left-2.5 w-px bg-[#1a5c20]" />

      <div className="space-y-5">
        {events.map((evt, i) => {
          const color = TYPE_COLORS[evt.type] ?? "#6ee7b7";
          const label = TYPE_LABELS[evt.type] ?? evt.type;
          return (
            <div
              key={i}
              className="relative transition-all duration-700 ease-out"
              style={{
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${500 + i * 180}ms`,
              }}
            >
              <div
                className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-[#020e05] z-10"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
              />

              <div className="bg-[#030f05] border border-[#0a2010] p-4 hover:border-[#1a5c20] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-mono text-[#2d7040]">{evt.date}</div>
                  <div
                    className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm"
                    style={{ color, backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                  >
                    {label}
                  </div>
                </div>
                <h4 className="font-serif text-base font-bold text-[#c8eac8] mb-1 leading-snug">{evt.title}</h4>
                <p className="text-xs text-[#a8e0a8] leading-relaxed">{evt.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
