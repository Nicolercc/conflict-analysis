import type { PerspectiveItem } from './types';

interface PerspectivePillProps {
  item: PerspectiveItem;
  index: number;
  total: number;
  sendPrompt: (q: string) => void;
  analysisTitle: string;
}

export function PerspectivePill({ item, index, total, sendPrompt, analysisTitle }: PerspectivePillProps) {
  // Edge anchoring: first 2 → popup aligns left; last 2 → popup aligns right
  const isRightAnchored = index >= total - 2;

  const handleClick = () => {
    sendPrompt(`What is ${item.actor}'s full position on ${analysisTitle}?`);
  };

  return (
    <div
      className="persp-pill"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <span className="persp-dot" style={{ background: item.color }} />
      <span className="persp-label">{item.label}</span>
      <span className="persp-actor">{item.actor}</span>

      <div className={`pp-popup${isRightAnchored ? ' pp-popup--right' : ''}`}>
        <p className="pp-quote">"{item.quote}"</p>
        <p className="pp-interest">
          <strong>Interest:</strong> {item.interest}
        </p>
      </div>
    </div>
  );
}
