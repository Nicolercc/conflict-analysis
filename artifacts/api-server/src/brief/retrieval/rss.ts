import { XMLParser } from "fast-xml-parser";
import { cleanText, topicMatcher, truncate, type Candidate, type ProviderResult } from "../sources";

type Feed = { provider: string; publisher: string; country: string | null; url: string };

const feed = (publisher: string, country: string | null, url: string, section = ""): Feed => ({
  provider: `${publisher} RSS${section ? ` (${section})` : ""}`,
  publisher,
  country,
  url,
});

/**
 * Publisher-owned feeds, chosen for regional spread. Each gives a headline,
 * the publisher's own summary, a link and a date. A feed holds only the
 * outlet's most recent items, so a topic can legitimately match nothing.
 */
export const FEEDS: Feed[] = [
  feed("Al Jazeera", "Qatar", "https://www.aljazeera.com/xml/rss/all.xml"),
  feed("BBC News", "United Kingdom", "https://feeds.bbci.co.uk/news/world/rss.xml", "World"),
  feed("BBC News", "United Kingdom", "https://feeds.bbci.co.uk/news/world/africa/rss.xml", "Africa"),
  feed("BBC News", "United Kingdom", "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", "Middle East"),
  feed("BBC News", "United Kingdom", "https://feeds.bbci.co.uk/news/world/europe/rss.xml", "Europe"),
  feed("BBC News", "United Kingdom", "https://feeds.bbci.co.uk/news/world/asia/rss.xml", "Asia"),
  feed("The Guardian", "United Kingdom", "https://www.theguardian.com/world/rss"),
  feed("France 24", "France", "https://www.france24.com/en/rss"),
  feed("NPR", "United States", "https://feeds.npr.org/1004/rss.xml"),
  feed("The Hindu", "India", "https://www.thehindu.com/news/international/feeder/default.rss"),
  feed("Times of India", "India", "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms"),
  feed("Dawn", "Pakistan", "https://www.dawn.com/feeds/world"),
  feed("South China Morning Post", "Hong Kong", "https://www.scmp.com/rss/91/feed"),
  feed("Premium Times", "Nigeria", "https://www.premiumtimesng.com/feed"),
  feed("Africanews", null, "https://www.africanews.com/feed/rss"),
  feed("AllAfrica", null, "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf"),
  feed("teleSUR", "Venezuela", "https://www.telesurenglish.net/feed/"),
  feed("UN News", "United Nations", "https://news.un.org/feed/subscribe/en/news/all/rss.xml"),
  feed("UN News", "United Nations", "https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml", "Peace and security"),
];

const TIMEOUT_MS = 6_000;
const parser = new XMLParser({ ignoreAttributes: true, processEntities: true });

const text = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

export function parseFeed(xml: string, feed: Feed, topic: string): Candidate[] {
  // A feed is everything the outlet published lately; keep only items about the topic.
  const isAboutTopic = topicMatcher(topic);
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: unknown } } };
  const raw = doc.rss?.channel?.item;
  const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Array<Record<string, unknown>>;

  const out: Candidate[] = [];
  for (const item of items) {
    const title = cleanText(text(item["title"]));
    const excerpt = truncate(cleanText(text(item["description"])), 320);
    const link = text(item["link"]).trim();
    if (!title || !/^https?:\/\//i.test(link)) continue;
    // Headline only: summaries mention places in passing ("…after the Sudan game").
    if (!isAboutTopic(title)) continue;
    const date = new Date(text(item["pubDate"]));
    out.push({
      kind: "news",
      provider: feed.provider,
      publisher: feed.publisher,
      title,
      url: link,
      publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      language: "English",
      country: feed.country,
      excerpt: excerpt || null,
    });
  }
  return out;
}

// A feed changes every few minutes at most; refetching it for every brief is wasteful and impolite.
const FEED_TTL_MS = 10 * 60_000;
const feedCache = new Map<string, { at: number; xml: string }>();

export function resetFeedCache() {
  feedCache.clear();
}

async function loadFeed(url: string): Promise<string | null> {
  const hit = feedCache.get(url);
  if (hit && Date.now() - hit.at < FEED_TTL_MS) return hit.xml;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; VantageBot/1.0)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const xml = await res.text();
  feedCache.set(url, { at: Date.now(), xml });
  return xml;
}

export async function searchFeed(feed: Feed, topic: string): Promise<ProviderResult> {
  try {
    const xml = await loadFeed(feed.url);
    if (xml === null) return { provider: feed.provider, status: "failed", candidates: [] };
    const candidates = parseFeed(xml, feed, topic);
    return { provider: feed.provider, status: candidates.length ? "ok" : "empty", candidates };
  } catch {
    return { provider: feed.provider, status: "failed", candidates: [] };
  }
}
