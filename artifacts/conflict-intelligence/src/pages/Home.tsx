import { useState } from 'react';
import { useAnalyzeArticle, useExploreConflict } from '@workspace/api-client-react';
import { LiveTicker } from '@/components/LiveTicker';
import { RadarLoader } from '@/components/RadarLoader';
import { WorldMap } from '@/components/WorldMap';
import { TypewriterSummary } from '@/components/TypewriterSummary';
import { AnimatedScore } from '@/components/AnimatedScore';
import { EscalationMeter } from '@/components/EscalationMeter';
import { EventTimeline } from '@/components/EventTimeline';
import { CasualtyPanel } from '@/components/CasualtyPanel';
import { PerspectivesPanel } from '@/components/PerspectivesPanel';
import { LiveEventsPanel } from '@/components/LiveEventsPanel';
import { ConflictBackground } from '@/components/ConflictBackground';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { IntelligenceBrief } from '@workspace/api-client-react';
import { AlertCircle, RefreshCcw, FileText, Search } from 'lucide-react';

const DEMO_ARTICLE = "KYIV, Ukraine — Russian forces launched a massive coordinated missile and drone barrage on Kyiv in the early hours of Tuesday, striking multiple civilian districts and critical energy infrastructure. Ukrainian air defense intercepted dozens of projectiles, but ballistic missiles struck apartment buildings in the Shevchenkivskyi district, causing fires that burned for hours. Officials confirmed 7 civilians killed and 34 wounded. The assault — among the largest since Russia's full-scale invasion — followed the collapse of U.S.-brokered ceasefire talks last week. President Zelensky called it 'deliberate terror' and demanded Western allies accelerate air defense deliveries. NATO foreign ministers were meeting in Brussels as the strikes occurred.";

const DEMO_TOPICS = [
  "Gaza conflict 2024",
  "Sudan civil war",
  "Congo DRC conflict",
  "Yemen humanitarian crisis",
  "Myanmar civil war",
  "Haiti gang violence",
];

type Mode = 'article' | 'explore';

export function Home() {
  const [mode, setMode] = useState<Mode>('article');
  const [article, setArticle] = useState('');
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<IntelligenceBrief | null>(null);
  const [active, setActive] = useState(false);

  const analyze = useAnalyzeArticle();
  const explore = useExploreConflict();

  const isPending = analyze.isPending || explore.isPending;
  const isError = analyze.isError || explore.isError;
  const errorMsg = analyze.error?.message || explore.error?.message;

  const handleAnalyze = () => {
    analyze.mutate({ data: { article } }, {
      onSuccess: (data) => {
        setResult(data);
        setTimeout(() => setActive(true), 100);
      }
    });
  };

  const handleExplore = () => {
    explore.mutate({ data: { topic } }, {
      onSuccess: (data) => {
        setResult(data);
        setTimeout(() => setActive(true), 100);
      }
    });
  };

  const handleReset = () => {
    setResult(null);
    setActive(false);
    setArticle('');
    setTopic('');
    analyze.reset();
    explore.reset();
  };

  return (
    <div className="min-h-screen bg-[#010a03] text-[#c8eac8] pt-12 pb-24 selection:bg-[#00dd55] selection:text-[#010a03]">
      <LiveTicker />

      <main className="max-w-6xl mx-auto px-6 mt-8">
        <header className="mb-10 border-b border-[#0a2010] pb-6">
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#00dd55] tracking-tight uppercase shadow-sm">
            Conflict Context Engine
          </h1>
          <p className="text-[#2d7040] font-mono mt-2 uppercase tracking-widest text-sm">
            Global Intelligence Terminal &bull; Live Data + AI Analysis
          </p>
        </header>

        {isPending ? (
          <div className="min-h-[500px] flex items-center justify-center border border-[#0a2010] bg-[#020e05]">
            <RadarLoader />
          </div>
        ) : isError ? (
          <div className="border border-[#ff3322]/50 bg-[#ff3322]/10 p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-[#ff3322] mx-auto animate-pulse" />
            <div className="text-xl text-[#ff3322] font-mono font-bold uppercase">Signal Intercept Failed</div>
            <p className="text-[#c8eac8] font-mono text-sm max-w-md mx-auto">
              {errorMsg || "An unexpected error occurred during intelligence extraction."}
            </p>
            <Button
              onClick={handleReset}
              className="bg-[#ff3322] text-white hover:bg-[#ff3322]/80 font-mono rounded-none uppercase tracking-widest mt-4"
              data-testid="button-retry"
            >
              <RefreshCcw className="w-4 h-4 mr-2" /> Retry Connection
            </Button>
          </div>
        ) : result ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header bar */}
            <div className="flex justify-between items-center bg-[#020e05] border border-[#0a2010] p-4">
              <h2 className="text-2xl font-serif text-[#00dd55]">{result.headline}</h2>
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-[#1a5c20] text-[#00dd55] hover:bg-[#00dd55]/10 rounded-none font-mono uppercase text-xs"
                data-testid="button-new-analysis"
              >
                New Analysis
              </Button>
            </div>

            {/* Map full-width */}
            <div className="bg-[#030f05] border border-[#0a2010] p-1">
              <WorldMap data={result} active={active} />
            </div>

            {/* Summary + Actors */}
            <TypewriterSummary text={result.summary} active={active} />

            <div className="bg-[#030f05] border border-[#0a2010] p-4">
              <div className="text-[#2d7040] text-[10px] font-mono mb-3">KEY ACTORS</div>
              <div className="flex flex-wrap gap-2">
                {result.actors.map((actor, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[#1a5c20]/30 border border-[#1a5c20] text-[#a8e0a8] font-mono text-xs hover:bg-[#1a5c20]/60 transition-colors cursor-default"
                    style={{
                      opacity: active ? 1 : 0,
                      transform: active ? 'scale(1)' : 'scale(0.9)',
                      transition: `all 0.3s ease ${400 + i * 100}ms`
                    }}
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>

            {/* Three-column metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatedScore
                score={result.credibility.score}
                label={result.credibility.label}
                reason={result.credibility.reason}
                active={active}
              />
              <EscalationMeter
                level={result.escalationRisk}
                reason={result.escalationReason}
                active={active}
              />
              <CasualtyPanel data={result.casualtyData} active={active} />
            </div>

            {/* Two-column: perspectives + background */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerspectivesPanel perspectives={result.perspectives} active={active} />
              <ConflictBackground text={result.conflictBackground} sources={result.sources} active={active} />
            </div>

            {/* Live news feed */}
            {result.liveEvents && result.liveEvents.length > 0 && (
              <LiveEventsPanel events={result.liveEvents} active={active} />
            )}

            {/* Timeline — full width */}
            <div className="bg-[#030f05] border border-[#0a2010] p-5">
              <div className="text-[#2d7040] text-[10px] font-mono mb-4 border-b border-[#0a2010] pb-2">
                CONFLICT TIMELINE — KEY HISTORICAL EVENTS
              </div>
              <EventTimeline events={result.relatedEvents} active={active} />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Mode toggle */}
            <div className="flex border border-[#0a2010] bg-[#020e05]">
              <button
                onClick={() => setMode('article')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
                  mode === 'article'
                    ? 'bg-[#00dd55]/10 text-[#00dd55] border-r border-[#0a2010]'
                    : 'text-[#2d7040] border-r border-[#0a2010] hover:text-[#a8e0a8] hover:bg-[#0a2010]'
                }`}
                data-testid="tab-article"
              >
                <FileText className="w-3.5 h-3.5" />
                Paste Article
              </button>
              <button
                onClick={() => setMode('explore')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
                  mode === 'explore'
                    ? 'bg-[#00dd55]/10 text-[#00dd55]'
                    : 'text-[#2d7040] hover:text-[#a8e0a8] hover:bg-[#0a2010]'
                }`}
                data-testid="tab-explore"
              >
                <Search className="w-3.5 h-3.5" />
                Explore Conflict
              </button>
            </div>

            {/* Input panel */}
            <div className="bg-[#030f05] border border-[#1a5c20] p-1 shadow-[0_0_30px_rgba(0,221,85,0.05)]">
              <div className="bg-[#020e05] border border-[#0a2010] p-6 space-y-4">
                {mode === 'article' ? (
                  <>
                    <div className="flex justify-between items-center border-b border-[#0a2010] pb-4">
                      <div className="font-mono text-[#00dd55] text-sm tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#00dd55] rounded-full animate-pulse" />
                        INPUT TERMINAL — ARTICLE ANALYSIS
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setArticle(DEMO_ARTICLE)}
                        className="text-[#a8e0a8] hover:text-[#00dd55] hover:bg-[#1a5c20]/30 font-mono text-xs rounded-none border border-transparent hover:border-[#1a5c20]"
                        data-testid="button-load-demo"
                      >
                        Load Demo Article
                      </Button>
                    </div>

                    <div className="relative group">
                      <Textarea
                        value={article}
                        onChange={(e) => setArticle(e.target.value)}
                        placeholder="Paste any conflict news article — from any country, any region, any source..."
                        className="min-h-[260px] bg-[#010a03] border-[#1a5c20] text-[#c8eac8] font-serif text-lg leading-relaxed rounded-none focus-visible:ring-1 focus-visible:ring-[#00dd55] focus-visible:border-[#00dd55] placeholder:text-[#2d7040] placeholder:font-mono placeholder:text-sm resize-y"
                        data-testid="textarea-article"
                      />
                      <div className="absolute bottom-3 right-3 text-[#2d7040] font-mono text-xs">
                        {article.length} / MIN 50 CHARS
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleAnalyze}
                        disabled={article.length < 50}
                        className="bg-[#00dd55] text-[#010a03] hover:bg-[#00dd55]/90 rounded-none font-mono font-bold uppercase tracking-widest px-8 shadow-[0_0_15px_rgba(0,221,85,0.3)] disabled:bg-[#1a5c20] disabled:text-[#2d7040] disabled:shadow-none transition-all"
                        data-testid="button-analyze"
                      >
                        Initiate Analysis
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center border-b border-[#0a2010] pb-4">
                      <div className="font-mono text-[#00dd55] text-sm tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#00dd55] rounded-full animate-pulse" />
                        CONFLICT EXPLORER — LIVE INTELLIGENCE
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-mono text-xs text-[#2d7040]">
                        Enter any conflict, war, crisis, or geopolitical topic. The system will pull real news from global sources and generate a comprehensive intelligence brief.
                      </p>

                      <div className="relative">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && topic.trim().length >= 3 && handleExplore()}
                          placeholder="e.g. Gaza conflict, Sudan civil war, Congo DRC, Yemen crisis..."
                          className="w-full bg-[#010a03] border border-[#1a5c20] text-[#c8eac8] font-mono text-base px-4 py-3 focus:outline-none focus:border-[#00dd55] focus:ring-1 focus:ring-[#00dd55] placeholder:text-[#2d7040] placeholder:text-sm"
                          data-testid="input-topic"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-[9px] font-mono text-[#2d7040] self-center">EXAMPLES:</span>
                        {DEMO_TOPICS.map((t) => (
                          <button
                            key={t}
                            onClick={() => setTopic(t)}
                            className="text-[9px] font-mono text-[#1a5c20] bg-[#0a2010] border border-[#1a5c20]/30 px-2 py-1 hover:text-[#00dd55] hover:border-[#1a5c20] transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleExplore}
                        disabled={topic.trim().length < 3}
                        className="bg-[#00dd55] text-[#010a03] hover:bg-[#00dd55]/90 rounded-none font-mono font-bold uppercase tracking-widest px-8 shadow-[0_0_15px_rgba(0,221,85,0.3)] disabled:bg-[#1a5c20] disabled:text-[#2d7040] disabled:shadow-none transition-all"
                        data-testid="button-explore"
                      >
                        Generate Intelligence Brief
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center font-mono text-[#2d7040] text-xs pt-8 border-t border-[#0a2010]">
              <div>LIVE DATA: GDELT + WIKIPEDIA</div>
              <div>AI ANALYSIS: CLAUDE AI</div>
              <div>COVERAGE: 195 COUNTRIES</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
