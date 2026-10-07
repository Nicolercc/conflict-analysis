import { Router, type IRouter, type Request } from "express";
import crypto from "crypto";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  AnalyzeArticleBody,
  ExploreConflictBody,
  ExploreConflictResponse,
} from "@workspace/api-zod";
import type { BriefState } from "../lib/brief-state";
import { AppError, invalidInput, sendError } from "../lib/errors";
import { fetchPublicPage } from "../lib/safe-fetch";

const router: IRouter = Router();

const briefState = (req: Request) => req.app.locals["briefs"] as BriefState;

const BRIEF_MODEL = process.env["BRIEF_MODEL"] ?? "claude-haiku-4-5-20251001";
/** One retry when the model's answer is unusable; provider errors are not retried here. */
const MAX_GENERATION_ATTEMPTS = 2;

// ─── JSON Extraction Helper ───────────────────────────────────────────────
// Robustly extract valid JSON from Claude response that may contain:
// - Markdown code fences (```json ... ```)
// - Extra text before/after JSON
// - Incomplete JSON
function findFirstJsonBracketIndex(s: string): number {
  const i = s.indexOf("{");
  const j = s.indexOf("[");
  if (i === -1) return j;
  if (j === -1) return i;
  return Math.min(i, j);
}

function extractJSON(text: string): object {
  // Remove markdown code fences (opening); strip trailing fence if present
  let cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  let startIdx = findFirstJsonBracketIndex(cleaned);

  if (startIdx === -1) {
    throw new Error("No JSON object or array found in response");
  }
  
  // Use the first character as the opening bracket
  const openChar = cleaned[startIdx];
  const closeChar = openChar === "{" ? "}" : "]";
  
  let depth = 0;
  let endIdx = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIdx; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === openChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  
  if (endIdx === -1) {
    throw new Error("Malformed JSON: could not find matching closing bracket");
  }
  
  const jsonStr = cleaned.substring(startIdx, endIdx);
  return JSON.parse(jsonStr);
}

/**
 * Coerce AI string/number coords. A pair is either fully valid or unknown:
 * an unusable lat or lng makes both null, so a missing place never becomes
 * a real point on the map.
 */
function normalizeLatLng(
  lat: unknown,
  lng: unknown,
): { lat: number; lng: number } | { lat: null; lng: null } {
  const parse = (v: unknown): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v !== "string") return NaN;
    const t = v.trim().replace(/,/g, "");
    return /^[+-]?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
  };
  const la = parse(lat);
  const ln = parse(lng);
  const valid =
    Number.isFinite(la) && la >= -90 && la <= 90 &&
    Number.isFinite(ln) && ln >= -180 && ln <= 180;
  return valid ? { lat: la, lng: ln } : { lat: null, lng: null };
}

/** When the model adds preamble/postamble, try fenced blocks or trailing JSON. */
function tryExtractJsonFallback(text: string): object | null {
  const fencedBlocks: string[] = [];
  const re = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1]?.trim();
    if (inner) fencedBlocks.push(inner);
  }
  for (const block of fencedBlocks.reverse()) {
    try {
      return extractJSON(block);
    } catch {
      /* try next */
    }
  }
  const lineStart = text.lastIndexOf("\n{");
  if (lineStart !== -1) {
    try {
      return extractJSON(text.slice(lineStart + 1));
    } catch {
      /* */
    }
  }
  const lb = text.lastIndexOf("{");
  if (lb !== -1) {
    try {
      return extractJSON(text.slice(lb));
    } catch {
      /* */
    }
  }
  return null;
}

// ─── URL Scraper ──────────────────────────────────────────────────────────

async function scrapeArticle(url: string): Promise<string> {
  const html = await fetchPublicPage(url);
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
    throw new AppError(422, "FETCH_FAILED", "We couldn't find article text on that page. Try pasting the article text instead.");
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
    return (data.articles || []).filter(a => /^https?:\/\//i.test(a.url ?? "")).slice(0, 6).map(a => ({
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

SOURCING RULES: You have only the context above plus your background knowledge. Do not name news outlets you were not given, and do not invent URLs, quotes or statistics. State a figure only when you are confident of it, and name the reporting organisation and the date it refers to; otherwise say that reliable figures are not available.

Return ONLY valid JSON — no markdown, no code fences, no preamble. Schema:

{
  "inScope": boolean (false if the input is not a conflict, humanitarian crisis or geopolitical tension — still fill the other fields as best you can),
  "headline": "string (8-10 words, factual, no editorializing)",
  "location": {
    "city": "string",
    "country": "string",
    "region": "string (e.g. Middle East, Sub-Saharan Africa, Eastern Europe, South Asia)",
    "lat": number | null,
    "lng": number | null (use null for both when the location is not known)
  },
  "summary": "string (2-3 sentences, neutral framing, no Western-default perspective)",
  "actors": ["string"] (2-5 key parties: state + non-state + affected civilian groups),
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
      "lat": number | null,
      "lng": number | null,
      "searchQuery": "string (5-8 word Google News query)"
    }
  ] (EXACTLY 3 items, chronological, real documented events),
  "escalationRisk": "Low" | "Medium" | "High",
  "escalationReason": "string (1-2 sentences incorporating regional power dynamics)",
  "historicalContext": "string (2-3 sentences — long-term forces, colonial legacies, prior agreements, non-Western framing)",
  "affectedPopulation": "string (1-2 sentences — civilian impact, not military framing; attribute and date any figure)",
  "keyQuestion": "string (1 sentence — the most important unanswered geopolitical question)",
  "casualtyData": {
    "description": "string (toll estimates with the reporting organisation and date, or a statement that reliable figures are not available — do not filter by geopolitical alignment)",
    "civilianImpact": "string (2 sentences on displacement, infrastructure, medical access)",
    "allSides": "string (2 sentences on casualty context across the parties, noting where figures are disputed)"
  }
}`;

// ─── Core Analysis Engine ─────────────────────────────────────────────────

type RetrievedContext = {
  liveNews: Awaited<ReturnType<typeof fetchGdeltNews>>;
  systemPrompt: string;
  userContent: string;
};

const providerUnavailable = (cause: unknown) =>
  new AppError(502, "PROVIDER_UNAVAILABLE", "The analysis service is unavailable right now. Please try again later.", { cause });

/** One model call, parsed and checked against the response contract. Throws on unusable output. */
async function generateOnce(ctx: RetrievedContext): Promise<object> {
  let analysisMsg;
  try {
    analysisMsg = await anthropic.messages.create(
      {
        model: BRIEF_MODEL,
        max_tokens: 6000,
        system: ctx.systemPrompt,
        messages: [{ role: "user", content: ctx.userContent }],
      },
      { timeout: 60_000, maxRetries: 1 },
    );
  } catch (err) {
    throw providerUnavailable(err);
  }

  const block = analysisMsg.content[0];
  if (!block || block.type !== "text") throw new Error("model returned no text");

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJSON(block.text) as typeof parsed;
  } catch (parseErr) {
    // Sometimes the model wraps JSON in extra prose — take last ```json block or last { ... }
    const fallback = tryExtractJsonFallback(block.text);
    if (!fallback) throw parseErr;
    parsed = fallback as typeof parsed;
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const rawLoc = (parsed["location"] && typeof parsed["location"] === "object" ? parsed["location"] : {}) as Record<string, unknown>;

  // Provenance fields (retrieved coverage, generation time) are set here and
  // never by the model. The schema parse below strips any field outside the
  // contract and rejects a brief with missing or mistyped fields.
  const candidate = {
    ...parsed,
    generatedAt: new Date().toISOString(),
    inScope: parsed["inScope"] !== false,
    location: {
      city: str(rawLoc["city"]),
      country: str(rawLoc["country"]),
      region: str(rawLoc["region"]),
      ...normalizeLatLng(rawLoc["lat"], rawLoc["lng"]),
    },
    relatedEvents: Array.isArray(parsed["relatedEvents"])
      ? (parsed["relatedEvents"] as Array<Record<string, unknown>>).map(ev => ({
          ...ev,
          ...normalizeLatLng(ev?.["lat"], ev?.["lng"]),
          searchQuery: str(ev?.["searchQuery"]),
        }))
      : parsed["relatedEvents"],
    liveEvents: ctx.liveNews,
  };

  const checked = ExploreConflictResponse.safeParse(candidate);
  if (!checked.success) {
    throw new Error(`brief failed contract: ${checked.error.issues.slice(0, 5).map(i => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  if (!checked.data.headline.trim() || !checked.data.summary.trim()) {
    throw new Error("brief has an empty headline or summary");
  }
  return checked.data;
}

async function buildBrief(topic: string, articleText?: string): Promise<object> {
  const [liveNews, wikiSummary] = await Promise.all([
    fetchGdeltNews(topic),
    fetchWikipediaSummary(topic),
  ]);

  const newsContext = liveNews.map(n => `[${n.date}] ${n.title} (${n.source})`).join("\n");
  const ctx: RetrievedContext = {
    liveNews,
    systemPrompt: buildAnalysisPrompt(wikiSummary, newsContext),
    userContent: articleText
      ? `Analyze this conflict news article:\n\n${articleText.trim()}`
      : `Generate a comprehensive conflict intelligence brief for this topic: "${topic}". Draw on the Wikipedia and news context above. Provide full multi-perspective analysis.`,
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      return await generateOnce(ctx);
    } catch (err) {
      if (err instanceof AppError) throw err;
      lastError = err;
    }
  }
  throw new AppError(502, "MODEL_OUTPUT_INVALID", "The analysis came back incomplete. Please try again.", { cause: lastError });
}

// ─── Routes ───────────────────────────────────────────────────────────────

/** Rate-limit, then serve from cache or share one generation per key. */
async function respondWithBrief(req: Request, key: string, make: () => Promise<object>) {
  const { cache, gate } = briefState(req);
  return cache.getOrCreate(key, () => gate.run(make));
}

const firstIssue = (issues: Array<{ path: Array<string | number>; message: string }>) =>
  issues[0] ? `${issues[0].path.join(".") || "body"}: ${issues[0].message}` : "Invalid request.";

router.post("/analyze", async (req, res) => {
  try {
    briefState(req).limiter.take(req.ip ?? "unknown");

    const body = AnalyzeArticleBody.safeParse(req.body);
    if (!body.success) throw invalidInput(firstIssue(body.error.issues));
    const { article, url } = body.data;
    if ((article === undefined) === (url === undefined)) {
      throw invalidInput("Provide either article text or a URL, not both.");
    }
    if (url !== undefined && !/^https?:\/\//i.test(url.trim())) {
      throw invalidInput("The link must start with http:// or https://.");
    }

    const articleText = (article ?? (await scrapeArticle(url!.trim()))).trim();
    if (articleText.length < 50) throw invalidInput("Article must be at least 50 characters.");

    const cacheKey = `article:${crypto.createHash("sha256").update(articleText).digest("hex")}`;
    const result = await respondWithBrief(req, cacheKey, () => {
      // Extract a search topic from the article text for GDELT/Wikipedia
      const topicMatch = articleText.match(/(?:in|at|from|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
      return buildBrief(topicMatch?.[1] || articleText.slice(0, 80), articleText);
    });
    res.json(result);
  } catch (err) {
    sendError(req, res, err);
  }
});

router.post("/explore", async (req, res) => {
  try {
    briefState(req).limiter.take(req.ip ?? "unknown");

    const body = ExploreConflictBody.safeParse(req.body);
    if (!body.success) throw invalidInput(firstIssue(body.error.issues));
    const topic = body.data.topic.trim().replace(/\s+/g, " ");
    if (topic.length < 3) throw invalidInput("Topic must be at least 3 characters.");

    const cacheKey = `topic:${topic.toLowerCase()}`;
    const result = await respondWithBrief(req, cacheKey, () => buildBrief(topic));
    res.json(result);
  } catch (err) {
    sendError(req, res, err);
  }
});

export default router;
