import { useEffect, useRef } from 'react';

interface ScoreCardProps {
  label: string;
  value: string;
  barWidth: number; // 0–100 percentage
  barColor: string;
  tag: string;
  onClick: () => void;
}

export function ScoreCard({ label, value, barWidth, barColor, tag, onClick }: ScoreCardProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    // Start at 0, animate to target after short delay
    el.style.width = '0%';
    const t = setTimeout(() => {
      el.style.width = `${barWidth}%`;
    }, 300);
    return () => clearTimeout(t);
  }, [barWidth]);

  return (
    <div className="sc-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <span className="sc-label">{label}</span>
      <div className="sc-value">{value}</div>
      <div className="sc-bar-bg">
        <div
          ref={barRef}
          className="sc-bar-fill"
          style={{ background: barColor }}
        />
      </div>
      <span className="sc-tag">{tag}</span>
    </div>
  );
}
