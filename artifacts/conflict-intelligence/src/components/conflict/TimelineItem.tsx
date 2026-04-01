import type { TimelineEvent } from './types';

interface TimelineItemProps {
  event: TimelineEvent;
  sendPrompt: (q: string) => void;
  onFlyTo: (lat: number, lng: number) => void;
  analysisTitle: string;
}

const TYPE_COLORS: Record<string, string> = {
  strike: '#C2536A',
  escalation: '#E07B39',
  negotiation: '#4A9B8B',
  now: '#C2536A',
};

export function TimelineItem({ event, sendPrompt, onFlyTo, analysisTitle }: TimelineItemProps) {
  const color = TYPE_COLORS[event.type] ?? '#888';

  const handleClick = () => {
    onFlyTo(event.lat, event.lng);
    sendPrompt(`Tell me more about ${event.title} in the context of ${analysisTitle}`);
  };

  return (
    <div
      className="tl-item"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="tl-left">
        <span className="tl-date">{event.date}</span>
        <span
          className={`tl-dot${event.type === 'now' ? ' tl-dot--now' : ''}`}
          style={{ background: color }}
        />
      </div>
      <div className="tl-right">
        <span className="tl-type" style={{ color }}>{event.type.toUpperCase()}</span>
        <div className="tl-title">{event.title}</div>
        <div className="tl-subtitle">{event.subtitle}</div>
        {event.detail && (
          <div className="tl-expand">
            <p className="tl-expand-text">{event.detail}</p>
          </div>
        )}
      </div>
    </div>
  );
}
