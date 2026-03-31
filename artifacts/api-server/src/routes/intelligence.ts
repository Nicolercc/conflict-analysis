import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

// ─── Live data fetching utilities ─────────────────────────────────────────

async function fetchGdeltNews(query: string): Promise<Array<{ title: string; source: string; url: string; date: string }>> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=10&format=json&sourcelang=english&sort=datedesc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { articles?: Array<{ title?: string; domain?: string; url?: string; seendate?: string }> };
    const articles = data.articles || [];
    return articles.slice(0, 8).map(a => ({
      title: a.title || "Untitled",
      source: a.domain || "Unknown",
      url: a.url || "",
      date: a.seendate ? formatGdeltDate(a.seendate) : "Recent",
    }));
  } catch {
    return [];
  }
}

function formatGdeltDate(seendate: string): string {
  // GDELT dates look like: "20260331T000000Z" or "20260331000000"
  try {
    const cleaned = seendate.replace("T", "").replace("Z", "");
    const year = cleaned.slice(0, 4);
    const month = cleaned.slice(4, 6);
    const day = cleaned.slice(6, 8);
    const d = new Date(`${year}-${month}-${day}`);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Recent";
  }
}

async function fetchWikipediaSummary(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    if (!searchRes.ok) return "";
    const searchData = await searchRes.json() as { query?: { search?: Array<{ title?: string }> } };
    const pages = searchData?.query?.search || [];
    if (!pages.length) return "";

    const pageTitle = pages[0]?.title;
    if (!pageTitle) return "";

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(6000) });
    if (!summaryRes.ok) return "";
    const summaryData = await summaryRes.json() as { extract?: string };
    return summaryData.extract?.slice(0, 2000) || "";
  } catch {
    return "";
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────

const buildSystemPrompt = (wikiContext: string, newsContext: string) => `You are a globally-balanced conflict intelligence analyst. Your mandate is to provide FACTUAL, NON-EUROCENTRIC, NON-US-CENTRIC analysis that centers all affected populations equally — with particular attention to Middle Eastern, African, Asian, and Global South perspectives that are routinely underrepresented in Western media.

CRITICAL REQUIREMENTS:
- Civilian casualties and suffering must be documented for ALL parties — not filtered by geopolitical alignment
- Present perspectives from ALL affected regions with equal weight (Middle Eastern, African, Asian, Latin American, not just NATO/Western framing)
- Use verified casualty figures from UN OCHA, WHO, MSF, ACLED, and similar humanitarian organizations, not just military/government sources
- Historical context must include colonial legacies, regional power dynamics, and local political economies
- Do NOT default to Western/US/European framing as "neutral" — actively counter-balance it
- Amplify civilian voices and humanitarian impacts across ALL communities

${wikiContext ? `VERIFIED HISTORICAL CONTEXT (Wikipedia):\n${wikiContext}\n\n` : ""}${newsContext ? `LIVE NEWS CONTEXT (Recent reporting):\n${newsContext}\n\n` : ""}

Return ONLY valid JSON — no markdown fences, no preamble, no explanation. Strictly follow this schema:

{
  "headline": "string (8-10 words, factual, non-sensationalized)",
  "location": {
    "city": "string",
    "country": "string",
    "lat": number (decimal degrees, -90 to 90),
    "lng": number (decimal degrees, -180 to 180)
  },
  "summary": "string (3-4 sentences with global context, citing civilian impacts from ALL sides, avoiding Western-centric framing)",
  "actors": ["string"] (2-5 key parties including civilian/humanitarian organizations, not just military actors),
  "credibility": {
    "score": number (0-100: check specificity, source diversity including non-Western sources, humanitarian org corroboration),
    "label": "Low" | "Medium" | "High",
    "reason": "string (1 sentence noting which sources corroborate or contradict)"
  },
  "relatedEvents": [
    {
      "date": "string (e.g. 'Mar 2022')",
      "title": "string",
      "description": "string (1 sentence including ALL affected populations)",
      "type": "strike" | "escalation" | "negotiation" | "humanitarian" | "political",
      "lat": number,
      "lng": number
    }
  ] (EXACTLY 5 real historically significant events spanning the conflict's full timeline — include events from Middle Eastern, African, or Asian perspective where relevant),
  "escalationRisk": "Low" | "Medium" | "High",
  "escalationReason": "string (1 sentence incorporating regional power dynamics)",
  "casualtyData": {
    "description": "string (known/estimated total casualties with source attribution, e.g. 'UN estimates 35,000+ killed' — do not minimize or maximize)",
    "civilianImpact": "string (2 sentences on displacement, infrastructure destruction, access to food/water/medical care for ALL civilian populations)",
    "allSides": "string (2 sentences presenting verified casualty context from MULTIPLE sources and perspectives — include data the Western press often underreports)"
  },
  "perspectives": [
    {
      "region": "string (e.g. 'Arab World', 'Sub-Saharan Africa', 'Global South', 'Russia', 'NATO/West', 'Iran', 'China')",
      "viewpoint": "string (2 sentences representing how this conflict is understood from this region's political/historical lens)"
    }
  ] (EXACTLY 4 regional perspectives — MUST include at least 2 from non-Western regions),
  "conflictBackground": "string (3-4 sentences on deep historical roots including colonial history, prior agreements broken, previous peace attempts, and why this conflict is ongoing — include perspectives routinely omitted from Western coverage)",
  "sources": ["string"] (2-4 source domain names of news outlets used in analysis — prioritize diverse geographic sources)
}`;

// ─── Core analysis engine ─────────────────────────────────────────────────

async function buildBrief(topic: string, articleText?: string): Promise<object> {
  // Parallel: fetch live news and Wikipedia context
  const [liveNews, wikiSummary] = await Promise.all([
    fetchGdeltNews(topic),
    fetchWikipediaSummary(topic),
  ]);

  const newsContext = liveNews.length
    ? liveNews.map(n => `[${n.date}] ${n.title} (${n.source})`).join("\n")
    : "";

  const systemPrompt = buildSystemPrompt(wikiSummary, newsContext);

  const userContent = articleText
    ? `Analyze this conflict news article:\n\n${articleText.trim()}`
    : `Generate a comprehensive conflict intelligence brief for this topic: "${topic}".\n\nDraw on the provided Wikipedia and news context above. Focus on the current state, civilian impacts, and multiple regional perspectives.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected AI response format");

  const raw = block.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(raw) as {
    location?: { lat?: number; lng?: number };
    relatedEvents?: Array<{ lat?: number; lng?: number }>;
    liveEvents?: unknown[];
  };

  if (
    typeof parsed.location?.lat !== "number" ||
    parsed.location.lat < -90 || parsed.location.lat > 90 ||
    parsed.location.lng < -180 || parsed.location.lng > 180
  ) {
    throw new Error("Invalid geographic coordinates in AI response");
  }

  if (Array.isArray(parsed.relatedEvents)) {
    parsed.relatedEvents = parsed.relatedEvents.map(ev => ({
      ...ev,
      lat: Math.max(-90, Math.min(90, Number(ev.lat) || 0)),
      lng: Math.max(-180, Math.min(180, Number(ev.lng) || 0)),
    }));
  }

  // Inject real live events from GDELT
  parsed.liveEvents = liveNews.slice(0, 6);

  return parsed;
}

// ─── Routes ───────────────────────────────────────────────────────────────

router.post("/analyze", async (req, res) => {
  const { article } = req.body as { article?: string };

  if (!article || typeof article !== "string" || article.trim().length < 50) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Article must be at least 50 characters long" });
    return;
  }

  try {
    // Extract a search topic from the article for GDELT/Wikipedia
    const topicMatch = article.match(/(?:in|at|from|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    const topic = topicMatch?.[1] || article.slice(0, 80);

    const result = await buildBrief(topic, article);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Intelligence analysis failed");
    const msg = err instanceof SyntaxError
      ? "AI returned malformed response. Please try again."
      : "Analysis failed. Please try again.";
    res.status(500).json({ error: "SERVER_ERROR", message: msg });
  }
});

router.post("/explore", async (req, res) => {
  const { topic } = req.body as { topic?: string };

  if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
    res.status(400).json({ error: "INVALID_INPUT", message: "Topic must be at least 3 characters long" });
    return;
  }

  try {
    const result = await buildBrief(topic.trim());
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Conflict exploration failed");
    const msg = err instanceof SyntaxError
      ? "AI returned malformed response. Please try again."
      : "Exploration failed. Please try again.";
    res.status(500).json({ error: "SERVER_ERROR", message: msg });
  }
});

export default router;
