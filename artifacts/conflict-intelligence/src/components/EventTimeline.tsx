import type { RelatedEvent } from "@workspace/api-client-react";

export function EventTimeline({ events, active }: { events: RelatedEvent[]; active: boolean }) {
  const colors = {
    strike: "#ff3322",
    escalation: "#ff8800",
    negotiation: "#00dd66",
    humanitarian: "#3399ff",
    political: "#cc44ff"
  };

  return (
    <div className="relative pl-6 py-2">
      {/* Vertical Track */}
      <div className="absolute top-4 bottom-4 left-2.5 w-px bg-[#1a5c20]" />
      
      <div className="space-y-6">
        {events.map((evt, i) => {
          const color = colors[evt.type as keyof typeof colors];
          return (
            <div 
              key={i} 
              className="relative transition-all duration-700 ease-out"
              style={{
                opacity: active ? 1 : 0,
                transform: active ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `\${600 + i * 200}ms`
              }}
            >
              {/* Dot */}
              <div 
                className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-[#020e05] z-10"
                style={{ backgroundColor: color, boxShadow: `0 0 8px \${color}` }}
              />
              
              <div className="bg-[#030f05] border border-[#0a2010] p-4 hover:border-[#1a5c20] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-mono text-[#2d7040]">{evt.date}</div>
                  <div 
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-opacity-10"
                    style={{ color, backgroundColor: `\${color}20`, border: `1px solid \${color}40` }}
                  >
                    {evt.type}
                  </div>
                </div>
                <h4 className="font-serif text-lg font-bold text-[#c8eac8] mb-1">{evt.title}</h4>
                <p className="text-sm text-[#a8e0a8] line-clamp-2">{evt.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
