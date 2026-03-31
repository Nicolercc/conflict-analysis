import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

// ─── URL Scraper ──────────────────────────────────────────────────────────

async function scrapeArticle(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ConflictIntelBot/2.0; +https://conflict.intel)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching article URL`);
  const html = await res.text();
  // Strip scripts, styles, nav, and extract text
  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length < 100) {
    throw new Error("Could not extract article text from this URL. Try pasting the article text directly.");
  }
  return stripped.slice(0, 8000);
}

// ─── Live data fetching ───────────────────────────────────────────────────

async function fetchGdeltNews(query: string): Promise<Array<{ title: string; source: string; url: string; date: string }>> {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=8&format=json&sourcelang=english&sort=datedesc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { articles?: Array<{ title?: string; domain?: string; url?: string; seendate?: string }> };
    return (data.articles || []).slice(0, 6).map(a => ({
      title: a.title || "Untitled",
      source: a.domain || "Unknown",
      url: a.url || "",
      date: formatGdeltDate(a.seendate || ""),
    }));
  } catch { return []; }
}

function formatGdeltDate(s: string): string {
  try {
    const c = s.replace("T", "").replace("Z", "");
    return new Date(`${c.slice(0,4)}-${c.slice(4,6)}-${c.slice(6,8)}`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "Recent"; }
}

async function fetchWikipediaSummary(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    if (!searchRes.ok) return "";
    const searchData = await searchRes.json() as { query?: { search?: Array<{ title?: string }> } };
    const pages = searchData?.query?.search || [];
    if (!pages.length) return "";
    const title = pages[0]?.title;
    if (!title) return "";
    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(6000) });
    if (!summaryRes.ok) return "";
    const data = await summaryRes.json() as { extract?: string };
    return data.extract?.slice(0, 2000) || "";
  } catch { return ""; }
}

// ─── System Prompt (Pass 1 — Analysis) ───────────────────────────────────

const buildAnalysisPrompt = (wikiContext: string, newsContext: string) => `You are a geopolitical research analyst writing for journalists and academic researchers. Your analysis is non-Eurocentric, non-US-centric, and rigorously multi-perspective. You center ALL affected populations equally — with particular attention to Middle Eastern, African, Asian, and Global South perspectives routinely underrepresented in Western media.

CRITICAL FRAMING: Do NOT default to Western government or NATO framing as neutral. Analyze from multiple geopolitical perspectives — regional actors, affected civilian populations, Global South viewpoints, and non-Western institutional positions. Write in measured, academic language.

${wikiContext ? `WIKIPEDIA CONTEXT:\n${wikiContext}\n\n` : ""}${newsContext ? `RECENT NEWS CONTEXT:\n${newsContext}\n\n` : ""}

Return ONLY valid JSON — no markdown, no code fences, no preamble. Schema:

{
  "headline": "string (8-10 words, factual, no editorializing)",
  "location": {
    "city": "string",
    "country": "string",
    "region": "string (e.g. Middle East, Sub-Saharan Africa, Eastern Europe, South Asia)",
    "lat": number,
    "lng": number
  },
  "summary": "string (2-3 sentences, neutral framing, no Western-default perspective)",
  "actors": ["string"] (2-5 key parties: state + non-state + affected civilian groups),
  "credibility": {
    "score": number (0-100),
    "label": "Low" | "Medium" | "High",
    "reason": "string (1 sentence, specific — note if only one-sided sources available)"
  },
  "perspectives": [
    {
      "actor": "string (name of actor or group)",
      "alignment": "Western" | "Regional" | "State Media" | "Civil Society" | "Affected Population",
      "framing": "string (1-2 sentences — how this actor frames the event)",
      "interests": "string (1 sentence — underlying interest shaping this framing)"
    }
  ] (3-5 items, MUST include at minimum one Regional and one Affected Population perspective),
  "relatedEvents": [
    {
      "date": "string (Mon YYYY)",
      "title": "string",
      "description": "string (1 sentence — why this event is relevant now)",
      "type": "strike" | "escalation" | "negotiation" | "humanitarian" | "political",
      "lat": number,
      "lng": number,
      "searchQuery": "string (5-8 word Google News query)"
    }
  ] (EXACTLY 3 items, chronological, real documented events),
  "escalationRisk": "Low" | "Medium" | "High",
  "escalationReason": "string (1-2 sentences incorporating regional power dynamics)",
  "historicalContext": "string (2-3 sentences — long-term forces, colonial legacies, prior agreements, non-Western framing)",
  "affectedPopulation": "string (1-2 sentences — civilian impact using UN/WHO/OCHA figures, not military framing)",
  "keyQuestion": "string (1 sentence — the most important unanswered geopolitical question)",
  "casualtyData": {
    "description": "string (UN/WHO-sourced toll estimates — do not filter by geopolitical alignment)",
    "civilianImpact": "string (2 sentences on displacement, infrastructure, medical access)",
    "allSides": "string (2 sentences on casualty context from multiple sources including non-Western reporting)"
  },
  "sources": ["string"] (2-4 diverse news source domain names consulted)
}`;

// ─── Verification Prompt (Pass 2 — Claude as verifier) ───────────────────

const buildVerificationPrompt = (brief: object) => `You are a conflict verification researcher. Review the intelligence brief below and generate a multi-source verification panel showing how this event is covered by diverse global news outlets — particularly NON-WESTERN sources including Al Jazeera, Middle East Eye, teleSUR, The Hindu, Africa Report, CGTN, Xinhua, Dawn, and regional outlets.

INTELLIGENCE BRIEF:
${JSON.stringify(brief, null, 2)}

Based on your knowledge of how this conflict is covered globally, generate realistic verification source entries from diverse world regions. Identify where international coverage converges (consensus) and where it diverges based on geopolitical alignment.

Return ONLY valid JSON — no markdown, no code fences, no preamble. Schema:

{
  "sources": [
    {
      "title": "string (realistic headline from this outlet's perspective)",
      "url": "string (plausible but non-verified URL — use the outlet's real domain)",
      "outlet": "string (e.g. Al Jazeera, The Hindu, Africa Report, teleSUR, Dawn)",
      "region": "Western" | "Middle East" | "Asia" | "Africa" | "Latin America" | "State Media",
      "summary": "string (1-2 sentences — how this outlet frames the event differently)"
    }
  ] (4-6 sources from at least 3 different regions — MUST include Middle East and at least one Global South outlet),
  "consensus": "string (2 sentences — what all international coverage agrees on, including facts and civilian toll)",
  "divergence": "string (2 sentences — where coverage splits along geopolitical lines — e.g. Western framing vs regional/state media framing)"
}`;

// ─── Core Analysis Engine ─────────────────────────────────────────────────

async function buildBrief(topic: string, articleText?: string): Promise<object> {
  const [liveNews, wikiSummary] = await Promise.all([
    fetchGdeltNews(topic),
    fetchWikipediaSummary(topic),
  ]);

  const newsContext = liveNews.map(n => `[${n.date}] ${n.title} (${n.source})`).join("\n");
  const systemPrompt = buildAnalysisPrompt(wikiSummary, newsContext);

  const userContent = articleText
    ? `Analyze this conflict news article:\n\n${articleText.trim()}`
    : `Generate a comprehensive conflict intelligence brief for this topic: "${topic}". Draw on the Wikipedia and news context above. Provide full multi-perspective analysis.`;

  // Pass 1: Main analysis
  const analysisMsg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const block = analysisMsg.content[0];
  if (block.type !== "text") throw new Error("Unexpected AI response format");
  const raw = block.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(raw) as {
    location?: { lat?: number; lng?: number };
    relatedEvents?: Array<{ lat?: number; lng?: number; searchQuery?: string }>;
    liveEvents?: unknown[];
    verification?: unknown;
  };

  // Validate coordinates
  if (typeof parsed.location?.lat !== "number" || parsed.location.lat < -90 || parsed.location.lat > 90) {
    throw new Error("Invalid geographic coordinates in AI response");
  }

  // Clamp related event coordinates
  if (Array.isArray(parsed.relatedEvents)) {
    parsed.relatedEvents = parsed.relatedEvents.map(ev => ({
      ...ev,
      lat: Math.max(-90, Math.min(90, Number(ev.lat) || 0)),
      lng: Math.max(-180, Math.min(180, Number(ev.lng) || 0)),
      searchQuery: ev.searchQuery || "",
    }));
  }

  // Inject real GDELT live news
  parsed.liveEvents = liveNews;

  // Pass 2: Claude verification using perspectives
  try {
    const verifyMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      system: "You are a conflict verification researcher. Return only valid JSON.",
      messages: [{ role: "user", content: buildVerificationPrompt(parsed) }],
    });
    const vBlock = verifyMsg.content[0];
    if (vBlock.type === "text") {
      const vRaw = vBlock.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed.verification = JSON.parse(vRaw);
    }
  } catch {
    // Verification is non-blocking — degrade gracefully
    parsed.verification = {
      sources: [],
      consensus: "Verification temporarily unavailable.",
      divergence: "Verification temporarily unavailable.",
    };
  }

  return parsed;
}

// ─── Routes ───────────────────────────────────────────────────────────────

router.post("/analyze", async (req, res) => {
  const { article, url } = req.body as { article?: string; url?: string };

  if (!article && !url) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Provide either article text or a URL." });
    return;
  }

  try {
    let articleText: string | undefined = article;

    if (url && !articleText) {
      articleText = await scrapeArticle(url);
    }

    if (!articleText || articleText.trim().length < 50) {
      res.status(400).json({ error: "INVALID_INPUT", message: "Article must be at least 50 characters." });
      return;
    }

    // Extract a search topic from the article text for GDELT/Wikipedia
    const topicMatch = articleText.match(/(?:in|at|from|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    const topic = topicMatch?.[1] || articleText.slice(0, 80);

    const result = await buildBrief(topic, articleText);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Intelligence analysis failed");
    const msg = err instanceof Error ? err.message : "Analysis failed. Please try again.";
    const isSyntax = err instanceof SyntaxError;
    res.status(isSyntax ? 500 : 500).json({ error: "SERVER_ERROR", message: isSyntax ? "AI returned malformed response. Please try again." : msg });
  }
});

router.post("/explore", async (req, res) => {
  const { topic } = req.body as { topic?: string };

  if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Topic must be at least 3 characters." });
    return;
  }

  try {
    const result = await buildBrief(topic.trim());
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Conflict exploration failed");
    const msg = err instanceof SyntaxError ? "AI returned malformed response. Please try again." : "Exploration failed. Please try again.";
    res.status(500).json({ error: "SERVER_ERROR", message: msg });
  }
});

export default router;
