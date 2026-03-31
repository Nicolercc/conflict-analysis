import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useAnalyzeArticle, useExploreConflict } from '@workspace/api-client-react';
import { SiteHeader } from '@/components/LiveTicker';
import { AnalysisLoader } from '@/components/AnalysisLoader';
import { WorldMap } from '@/components/WorldMap';
import { TypewriterSummary } from '@/components/TypewriterSummary';
import { AnimatedScore } from '@/components/AnimatedScore';
import { EscalationMeter } from '@/components/EscalationMeter';
import { EventTimeline } from '@/components/EventTimeline';
import { CasualtyPanel } from '@/components/CasualtyPanel';
import { PerspectivesPanel } from '@/components/PerspectivesPanel';
import { LiveEventsPanel } from '@/components/LiveEventsPanel';
import { VerificationPanel } from '@/components/VerificationPanel';
import { SourceDiversity } from '@/components/SourceDiversity';
import type { IntelligenceBrief } from '@workspace/api-client-react';

const DEMO_ARTICLE = "KYIV, Ukraine — Russian forces launched a massive coordinated missile and drone barrage on Kyiv in the early hours of Tuesday, striking multiple civilian districts and critical energy infrastructure. Ukrainian air defense intercepted dozens of projectiles, but ballistic missiles struck apartment buildings in the Shevchenkivskyi district, causing fires that burned for hours. Officials confirmed 7 civilians killed and 34 wounded. The assault — among the largest since Russia's full-scale invasion — followed the collapse of U.S.-brokered ceasefire talks last week. President Zelensky called it 'deliberate terror' and demanded Western allies accelerate air defense deliveries. NATO foreign ministers were meeting in Brussels as the strikes occurred.";

const DEMO_TOPICS = [
  "Gaza conflict 2024",
  "Sudan civil war",
  "Congo DRC conflict",
  "Yemen humanitarian crisis",
  "Myanmar civil war",
  "Haiti gang violence",
];

type Mode = 'article' | 'url' | 'explore';

const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-primary)",
    paddingTop: "56px",
    paddingBottom: "80px",
  } as CSSProperties,
  wrap: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 24px",
  } as CSSProperties,
  hr: {
    border: "none",
    borderTop: "1px solid var(--border-light)",
    margin: "40px 0",
  } as CSSProperties,
  sectionGap: { marginBottom: "40px" } as CSSProperties,
};

function InputView({
  mode, setMode, article, setArticle, url, setUrl, topic, setTopic,
  onAnalyze, onExplore, isPending,
}: {
  mode: Mode; setMode: (m: Mode) => void;
  article: string; setArticle: (v: string) => void;
  url: string; setUrl: (v: string) => void;
  topic: string; setTopic: (v: string) => void;
  onAnalyze: () => void; onExplore: () => void;
  isPending: boolean;
}) {
  const canAnalyze = (mode === 'article' && article.length >= 50) || (mode === 'url' && url.length > 10);
  const canExplore = topic.trim().length >= 3;

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", paddingTop: "64px" }}>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: "16px" }}>
        Conflict Intelligence System
      </p>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(32px, 5vw, 44px)", fontWeight: 700, lineHeight: 1.2, color: "var(--text-primary)", marginBottom: "14px" }}>
        Understand any conflict<br />article in context
      </h1>
      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "16px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "36px" }}>
        Paste a URL, article text, or search a conflict topic. Receive a structured brief with multi-perspective analysis, source verification, and historical context.
      </p>

      {/* Mode tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-light)", marginBottom: "24px", gap: "28px" }}>
        {([
          { id: 'url',     label: 'Article URL' },
          { id: 'article', label: 'Paste Text' },
          { id: 'explore', label: 'Explore Topic' },
        ] as { id: Mode; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "15px",
              color: mode === tab.id ? "var(--text-primary)" : "var(--text-muted)",
              background: "none",
              border: "none",
              borderBottom: mode === tab.id ? "2px solid var(--text-primary)" : "2px solid transparent",
              paddingBottom: "10px",
              cursor: "pointer",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input fields */}
      {mode === 'url' && (
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && canAnalyze && onAnalyze()}
          placeholder="https://aljazeera.com/..."
          data-testid="input-url"
          style={{
            width: "100%",
            height: "48px",
            border: "1px solid var(--border-light)",
            borderRadius: "6px",
            padding: "0 16px",
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: "15px",
            color: "var(--text-primary)",
            background: "var(--bg-surface)",
            marginBottom: "16px",
            outline: "none",
          }}
          onFocus={e => { e.target.style.borderColor = "var(--border-focus)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--border-light)"; }}
        />
      )}

      {mode === 'article' && (
        <div style={{ position: "relative" as const, marginBottom: "16px" }}>
          <textarea
            value={article}
            onChange={e => setArticle(e.target.value)}
            placeholder="Paste article text here — from any source, any country..."
            data-testid="textarea-article"
            style={{
              width: "100%",
              minHeight: "180px",
              border: "1px solid var(--border-light)",
              borderRadius: "6px",
              padding: "12px 16px",
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "15px",
              color: "var(--text-primary)",
              background: "var(--bg-surface)",
              resize: "vertical" as const,
              outline: "none",
              lineHeight: "1.6",
            }}
            onFocus={e => { e.target.style.borderColor = "var(--border-focus)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--border-light)"; }}
          />
          <span style={{ position: "absolute" as const, bottom: "10px", right: "12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-faint)" }}>
            {article.length} chars
          </span>
        </div>
      )}

      {mode === 'explore' && (
        <div style={{ marginBottom: "16px" }}>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canExplore && onExplore()}
            placeholder="e.g. Gaza conflict, Sudan civil war, Congo DRC..."
            data-testid="input-topic"
            style={{
              width: "100%",
              height: "48px",
              border: "1px solid var(--border-light)",
              borderRadius: "6px",
              padding: "0 16px",
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "15px",
              color: "var(--text-primary)",
              background: "var(--bg-surface)",
              marginBottom: "12px",
              outline: "none",
            }}
            onFocus={e => { e.target.style.borderColor = "var(--border-focus)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--border-light)"; }}
          />
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", alignItems: "center" }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-faint)" }}>Examples:</span>
            {DEMO_TOPICS.map(t => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "3px",
                  padding: "3px 8px",
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
        <button
          onClick={mode === 'explore' ? onExplore : onAnalyze}
          disabled={isPending || (mode === 'explore' ? !canExplore : !canAnalyze)}
          data-testid={mode === 'explore' ? "button-explore" : "button-analyze"}
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: "15px",
            color: "#ffffff",
            background: "var(--accent-navy)",
            border: "none",
            borderRadius: "5px",
            padding: "12px 28px",
            cursor: (isPending || (mode === 'explore' ? !canExplore : !canAnalyze)) ? "not-allowed" : "pointer",
            opacity: (isPending || (mode === 'explore' ? !canExplore : !canAnalyze)) ? 0.45 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {mode === 'explore' ? 'Generate Intelligence Brief' : 'Analyze Article'}
        </button>

        {mode === 'article' && (
          <button
            onClick={() => setArticle(DEMO_ARTICLE)}
            data-testid="button-load-demo"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "15px",
              color: "var(--accent-navy)",
              background: "transparent",
              border: "1px solid var(--accent-navy-border)",
              borderRadius: "5px",
              padding: "12px 20px",
              cursor: "pointer",
            }}
          >
            Load Demo
          </button>
        )}
      </div>

      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-faint)", marginTop: "14px", letterSpacing: "0.05em" }}>
        Analyzes in ~15 seconds · Powered by Claude AI + Live GDELT News
      </p>
    </div>
  );
}

function ResultsView({ result, active, onReset }: { result: IntelligenceBrief; active: boolean; onReset: () => void }) {
  const analysisDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={S.wrap}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "32px", marginBottom: "28px" }}>
        <button
          onClick={onReset}
          data-testid="button-new-analysis"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: "var(--accent-navy)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          ← New Analysis
        </button>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: "var(--text-muted)" }}>
          · {result.location.city}, {result.location.country}
        </span>
      </div>

      {/* Brief header card */}
      <div className="card" style={{ marginBottom: "40px" }}>
        <div style={{ marginBottom: "12px" }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              color: "var(--accent-navy)",
              background: "var(--accent-navy-light)",
              border: "1px solid var(--accent-navy-border)",
              padding: "2px 8px",
              borderRadius: "3px",
              letterSpacing: "0.1em",
            }}
          >
            {result.location.region}
          </span>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, lineHeight: 1.25, color: "var(--text-primary)", maxWidth: "780px", marginBottom: "16px" }}>
          {result.headline}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
          {result.actors.map((actor, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "9px",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-medium)",
                padding: "3px 8px",
                borderRadius: "3px",
              }}
            >
              {actor}
            </span>
          ))}
        </div>
      </div>

      {/* Section 1: Map */}
      <div style={S.sectionGap}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid var(--border-light)" }}>
            <span className="section-label" style={{ marginBottom: 0 }}>Incident Location &amp; Related Events</span>
          </div>
          <WorldMap data={result} active={active} />
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-light)" }}>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              {result.historicalContext}
            </p>
          </div>
        </div>
      </div>

      <hr style={S.hr} />

      {/* Section 2: Summary + Scores */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "32px", marginBottom: "40px", alignItems: "start" }}>
        <div>
          <span className="section-label">Summary</span>
          <div style={{ marginBottom: "20px" }}>
            <TypewriterSummary text={result.summary} active={active} />
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--border-light)", margin: "20px 0" }} />
          <div style={{ marginBottom: "16px" }}>
            <span className="section-label" style={{ marginBottom: "8px" }}>Affected Population</span>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              {result.affectedPopulation}
            </p>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid var(--border-light)", margin: "20px 0" }} />
          <div
            style={{
              borderLeft: "3px solid var(--accent-navy-border)",
              paddingLeft: "16px",
              opacity: active ? 1 : 0,
              transition: "opacity 0.8s ease 0.5s",
            }}
          >
            <span className="section-label" style={{ marginBottom: "6px" }}>Key Question</span>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "15px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              {result.keyQuestion}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: "16px" }}>
          <AnimatedScore score={result.credibility.score} label={result.credibility.label} reason={result.credibility.reason} active={active} />
          <EscalationMeter level={result.escalationRisk} reason={result.escalationReason} active={active} />
        </div>
      </div>

      <hr style={S.hr} />

      {/* Section 3: Casualty Data */}
      <div style={S.sectionGap}>
        <CasualtyPanel data={result.casualtyData} active={active} />
      </div>

      <hr style={S.hr} />

      {/* Section 4: Perspectives */}
      <div style={S.sectionGap}>
        <PerspectivesPanel perspectives={result.perspectives} active={active} />
      </div>

      <hr style={S.hr} />

      {/* Section 5: Verification + Source Diversity */}
      <div style={S.sectionGap}>
        <VerificationPanel verification={result.verification} active={active} />
        {result.verification?.sources && result.verification.sources.length > 0 && (
          <div style={{ marginTop: "28px" }}>
            <SourceDiversity sources={result.verification.sources} />
          </div>
        )}
      </div>

      <hr style={S.hr} />

      {/* Section 6: Timeline */}
      <div style={S.sectionGap}>
        <span className="section-label">Related Events &amp; Historical Context</span>
        <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", marginTop: "-10px" }}>
          Events that shaped the conditions for this incident
        </p>
        <EventTimeline events={result.relatedEvents} active={active} />
      </div>

      <hr style={S.hr} />

      {/* Section 7: Live News */}
      {result.liveEvents && result.liveEvents.length > 0 && (
        <>
          <div style={S.sectionGap}>
            <LiveEventsPanel events={result.liveEvents} active={active} />
          </div>
          <hr style={S.hr} />
        </>
      )}

      {/* Footer */}
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--text-faint)", textAlign: "center" as const, marginTop: "40px", letterSpacing: "0.05em" }}>
        Analysis generated via Claude (Anthropic) + GDELT Live News · {analysisDate}
      </p>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ maxWidth: "480px", margin: "80px auto", padding: "0 24px" }}>
      <div className="card">
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--risk-high)", letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>
          Analysis could not complete
        </span>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "22px", color: "var(--text-primary)", marginBottom: "10px" }}>
          {message || "Something went wrong"}
        </h3>
        <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Try pasting the article text directly, or check that the URL is publicly accessible.
        </p>
        <button
          onClick={onRetry}
          data-testid="button-retry"
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: "15px",
            color: "#ffffff",
            background: "var(--accent-navy)",
            border: "none",
            borderRadius: "5px",
            padding: "10px 24px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export function Home() {
  const [mode, setMode] = useState<Mode>('url');
  const [article, setArticle] = useState('');
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<IntelligenceBrief | null>(null);
  const [active, setActive] = useState(false);

  const analyze = useAnalyzeArticle();
  const explore = useExploreConflict();

  const isPending = analyze.isPending || explore.isPending;
  const isError = analyze.isError || explore.isError;
  const errorMsg = analyze.error?.message || explore.error?.message || "Analysis failed. Please try again.";

  const onSuccess = (data: IntelligenceBrief) => {
    setResult(data);
    setTimeout(() => setActive(true), 100);
  };

  const handleAnalyze = () => {
    const body = mode === 'url' ? { url } : { article };
    analyze.mutate({ data: body }, { onSuccess });
  };

  const handleExplore = () => {
    explore.mutate({ data: { topic } }, { onSuccess });
  };

  const handleReset = () => {
    setResult(null);
    setActive(false);
    setArticle('');
    setUrl('');
    setTopic('');
    analyze.reset();
    explore.reset();
  };

  return (
    <div style={S.page}>
      <SiteHeader onReset={result ? handleReset : undefined} hasResult={!!result} />

      {isPending ? (
        <div style={S.wrap}>
          <AnalysisLoader />
        </div>
      ) : isError ? (
        <ErrorView message={errorMsg} onRetry={handleReset} />
      ) : result ? (
        <ResultsView result={result} active={active} onReset={handleReset} />
      ) : (
        <div style={S.wrap}>
          <InputView
            mode={mode} setMode={setMode}
            article={article} setArticle={setArticle}
            url={url} setUrl={setUrl}
            topic={topic} setTopic={setTopic}
            onAnalyze={handleAnalyze} onExplore={handleExplore}
            isPending={isPending}
          />
        </div>
      )}
    </div>
  );
}
