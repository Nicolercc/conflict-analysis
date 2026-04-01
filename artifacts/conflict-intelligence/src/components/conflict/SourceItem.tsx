import type { SourceItem as SourceItemType } from './types';

interface SourceItemProps {
  item: SourceItemType;
  index: number;
  total: number;
  sendPrompt: (q: string) => void;
  analysisTitle: string;
}

export function SourceItem({ item, index, total, sendPrompt, analysisTitle }: SourceItemProps) {
  // Last 2 items: anchor popup to the right to avoid overflow on the sidebar
  const isBottomItem = index >= total - 2;

  const handleClick = () => {
    sendPrompt(`What is ${item.name}'s full coverage of ${analysisTitle}?`);
  };

  return (
    <li
      className="ci-source-item"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <span className="ci-source-flag">{item.flag}</span>
      <span className="ci-source-info">
        <span className="ci-source-name">{item.name}</span>
        <span className="ci-source-region">{item.region}</span>
      </span>
      <span className="ci-source-arrow">→</span>

      <div className={`src-popup${isBottomItem ? ' src-popup--bottom' : ''}`}>
        <span className="src-popup-name">{item.name}</span>
        <p className="src-popup-text">{item.summary}</p>
      </div>
    </li>
  );
}
