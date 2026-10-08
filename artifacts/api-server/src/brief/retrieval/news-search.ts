import { XMLParser } from "fast-xml-parser";
import { cleanText, topicMatcher, topicTerms, truncate, type Candidate, type ProviderResult } from "../sources";

const PROVIDER = "Bing News search";
const TIMEOUT_MS = 6_000;
const parser = new XMLParser({ ignoreAttributes: true, processEntities: true });

const text = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

/** Bing wraps each result in a click-through link; the article's own address is its `url` parameter. */
export function articleUrl(link: string): string | null {
  try {
    const u = new URL(link);
    const target = /(^|\.)bing\.com$/i.test(u.hostname) ? u.searchParams.get("url") : link;
    return target && /^https?:\/\//i.test(target) ? target : null;
  } catch {
    return null;
  }
}

export function parseNewsSearch(xml: string, topic: string): Candidate[] {
  const isAboutTopic = topicMatcher(topic);
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: unknown } } };
  const raw = doc.rss?.channel?.item;
  const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Array<Record<string, unknown>>;

  const out: Candidate[] = [];
  for (const item of items) {
    const title = cleanText(text(item["title"]));
    const summary = cleanText(text(item["description"]));
    const url = articleUrl(text(item["link"]).trim());
    if (!title || !url) continue;
    // Headline only, as for feeds: a summary names places in passing ("…as
    // arrivals from Sudan continue" under a headline about South Sudan).
    if (!isAboutTopic(title)) continue;
    const date = new Date(text(item["pubDate"]));
    out.push({
      kind: "news",
      provider: PROVIDER,
      // "The Hill on MSN" is The Hill, republished.
      publisher:
        cleanText(text(item["News:Source"])).replace(/\s+on\s+MSN$/i, "") || new URL(url).hostname.replace(/^www\./, ""),
      title,
      url,
      publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      // The search is made in English; the outlet's country is not reported.
      language: "English",
      country: null,
      excerpt: truncate(summary, 320) || null,
    });
  }
  return out;
}

/**
 * Recent coverage from across the web, so a topic that the fixed publisher
 * feeds are not carrying this week still has reporting behind it.
 */
export async function searchNews(topic: string): Promise<ProviderResult> {
  const failed: ProviderResult = { provider: PROVIDER, status: "failed", candidates: [] };
  const terms = topicTerms(topic);
  if (terms.length === 0) return { provider: PROVIDER, status: "empty", candidates: [] };
  try {
    // interval="8": results from the past week.
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(terms.join(" "))}&format=rss&qft=${encodeURIComponent('interval="8"')}&setlang=en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VantageBot/1.0)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return failed;
    const xml = await res.text();
    // An error or consent page is HTML, not a feed: that is a failure, not "no coverage".
    if (!/<rss[\s>]/i.test(xml)) return failed;
    const candidates = parseNewsSearch(xml, topic);
    return { provider: PROVIDER, status: candidates.length ? "ok" : "empty", candidates };
  } catch {
    return failed;
  }
}
