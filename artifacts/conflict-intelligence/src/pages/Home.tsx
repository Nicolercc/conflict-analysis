import { useState } from 'react';
import { useAnalyzeArticle } from '@workspace/api-client-react';
import { LiveTicker } from '@/components/LiveTicker';
import { RadarLoader } from '@/components/RadarLoader';
import { WorldMap } from '@/components/WorldMap';
import { TypewriterSummary } from '@/components/TypewriterSummary';
import { AnimatedScore } from '@/components/AnimatedScore';
import { EscalationMeter } from '@/components/EscalationMeter';
import { EventTimeline } from '@/components/EventTimeline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { IntelligenceBrief } from '@workspace/api-client-react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

const DEMO_ARTICLE = "KYIV, Ukraine — Russian forces launched a massive coordinated missile and drone barrage on Kyiv in the early hours of Tuesday, striking multiple civilian districts and critical energy infrastructure. Ukrainian air defense intercepted dozens of projectiles, but ballistic missiles struck apartment buildings in the Shevchenkivskyi district, causing fires that burned for hours. Officials confirmed 7 civilians killed and 34 wounded. The assault — among the largest since Russia's full-scale invasion — followed the collapse of U.S.-brokered ceasefire talks last week. President Zelensky called it 'deliberate terror' and demanded Western allies accelerate air defense deliveries. NATO foreign ministers were meeting in Brussels as the strikes occurred.";

export function Home() {
  const [article, setArticle] = useState('');
  const [result, setResult] = useState<IntelligenceBrief | null>(null);
  const [active, setActive] = useState(false);
  const analyze = useAnalyzeArticle();

  const handleAnalyze = () => {
    analyze.mutate({ data: { article } }, {
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
    analyze.reset();
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
            Classified Intelligence Terminal / Protocol v2.4.1
          </p>
        </header>

        {analyze.isPending ? (
          <div className="min-h-[500px] flex items-center justify-center border border-[#0a2010] bg-[#020e05]">
            <RadarLoader />
          </div>
        ) : analyze.isError ? (
          <div className="border border-[#ff3322]/50 bg-[#ff3322]/10 p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-[#ff3322] mx-auto animate-pulse" />
            <div className="text-xl text-[#ff3322] font-mono font-bold uppercase">Signal Intercept Failed</div>
            <p className="text-[#c8eac8] font-mono text-sm max-w-md mx-auto">
              {analyze.error?.message || "An unexpected error occurred during intelligence extraction."}
            </p>
            <Button 
              onClick={() => analyze.reset()} 
              className="bg-[#ff3322] text-white hover:bg-[#ff3322]/80 font-mono rounded-none uppercase tracking-widest mt-4"
              data-testid="button-retry"
            >
              <RefreshCcw className="w-4 h-4 mr-2" /> Retry Connection
            </Button>
          </div>
        ) : result ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top row: Map and Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#030f05] border border-[#0a2010] p-1">
                  <WorldMap data={result} active={active} />
                </div>
                
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
                
                <TypewriterSummary text={result.summary} active={active} />

                <div className="bg-[#030f05] border border-[#0a2010] p-4">
                  <div className="text-[#2d7040] text-[10px] font-mono mb-3">RECOGNIZED ENTITIES</div>
                  <div className="flex flex-wrap gap-2">
                    {result.actors.map((actor, i) => (
                      <span 
                        key={i} 
                        className="px-3 py-1 bg-[#1a5c20]/30 border border-[#1a5c20] text-[#a8e0a8] font-mono text-xs hover:bg-[#1a5c20]/60 transition-colors cursor-default"
                        style={{
                          opacity: active ? 1 : 0,
                          transform: active ? 'scale(1)' : 'scale(0.9)',
                          transition: `all 0.3s ease \${400 + i * 100}ms`
                        }}
                      >
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
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

                <div className="bg-[#030f05] border border-[#0a2010] p-5">
                  <div className="text-[#2d7040] text-[10px] font-mono mb-4 border-b border-[#0a2010] pb-2">HISTORICAL CORRELATIONS</div>
                  <EventTimeline events={result.relatedEvents} active={active} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-[#030f05] border border-[#1a5c20] p-1 shadow-[0_0_30px_rgba(0,221,85,0.05)]">
              <div className="bg-[#020e05] border border-[#0a2010] p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-[#0a2010] pb-4">
                  <div className="font-mono text-[#00dd55] text-sm tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#00dd55] rounded-full animate-pulse" />
                    INPUT TERMINAL
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
                    placeholder="Paste unverified conflict report or news text here..."
                    className="min-h-[300px] bg-[#010a03] border-[#1a5c20] text-[#c8eac8] font-serif text-lg leading-relaxed rounded-none focus-visible:ring-1 focus-visible:ring-[#00dd55] focus-visible:border-[#00dd55] placeholder:text-[#2d7040] placeholder:font-mono placeholder:text-sm resize-y"
                    data-testid="textarea-article"
                  />
                  <div className="absolute bottom-3 right-3 text-[#2d7040] font-mono text-xs">
                    {article.length} / MIN 50 CHARS
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleAnalyze}
                    disabled={article.length < 50}
                    className="bg-[#00dd55] text-[#010a03] hover:bg-[#00dd55]/90 rounded-none font-mono font-bold uppercase tracking-widest px-8 shadow-[0_0_15px_rgba(0,221,85,0.3)] disabled:bg-[#1a5c20] disabled:text-[#2d7040] disabled:shadow-none transition-all"
                    data-testid="button-analyze"
                  >
                    Initiate Analysis
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center font-mono text-[#2d7040] text-xs pt-8 border-t border-[#0a2010]">
              <div>SECURE CONNECTION ESTABLISHED</div>
              <div>ENCRYPTION: AES-256-GCM</div>
              <div>NODE: OP-CENTER-09</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
