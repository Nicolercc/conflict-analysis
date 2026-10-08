import { vi } from "vitest";
import { resetGeocoder } from "../brief/geocode";
import { FEEDS, resetFeedCache } from "../brief/retrieval/rss";

/**
 * Test harness: a fake model and fake retrieval so route tests never touch
 * the network or spend tokens.
 */

/** One result from the news search. */
export type FakeArticle = {
  title?: string;
  source?: string;
  url?: string;
  description?: string;
  pubDate?: string;
};

export const DEFAULT_ARTICLES: FakeArticle[] = [
  {
    title: "Sudan: aid convoys blocked outside El Fasher as fighting continues",
    source: "Example News",
    url: "https://example-news.org/el-fasher",
    description: "Convoys bound for the Sudan city were stopped at checkpoints.",
    pubDate: "Thu, 10 Sep 2026 12:00:00 GMT",
  },
  {
    title: "Talks on Sudan's El Fasher resume in Jeddah",
    source: "Example Wire",
    url: "https://example-wire.com/jeddah",
    description: "Delegations discussed access to El Fasher on Friday.",
    pubDate: "Fri, 11 Sep 2026 08:00:00 GMT",
  },
];

export type FakeFeedItem = { title: string; description: string; link: string; pubDate?: string };

export const DEFAULT_FEED_ITEMS: FakeFeedItem[] = [
  {
    title: "Sudan: 12 aid trucks turned back near El Fasher",
    description: "Humanitarian agencies say 12 trucks carrying food were refused access to El Fasher on Monday.",
    link: "https://www.aljazeera.com/news/2026/9/11/sudan-aid-trucks?traffic_source=rss",
    pubDate: "Fri, 11 Sep 2026 09:00:00 +0000",
  },
  {
    title: "Football leaders meet in Berlin",
    description: "Nothing to do with the topic, though it mentions Sudan and El Fasher in passing.",
    link: "https://www.aljazeera.com/sports/2026/9/11/football",
  },
];

export function rssXml(items: FakeFeedItem[]): string {
  const body = items
    .map(
      (i) =>
        `<item><title><![CDATA[${i.title}]]></title><description><![CDATA[${i.description}]]></description><link>${i.link.replace(/&/g, "&amp;")}</link>${i.pubDate ? `<pubDate>${i.pubDate}</pubDate>` : ""}</item>`,
    )
    .join("");
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>${body}</channel></rss>`;
}

/** The search engine's feed: each link is a click-through carrying the article's own address. */
export function newsSearchXml(articles: FakeArticle[]): string {
  const body = articles
    .map((a) => {
      const link = `http://www.bing.com/news/apiclick.aspx?ref=FexRss&url=${encodeURIComponent(a.url ?? "")}&c=1`;
      return `<item><title><![CDATA[${a.title ?? ""}]]></title><link>${link.replace(/&/g, "&amp;")}</link><description><![CDATA[${a.description ?? ""}]]></description>${a.pubDate ? `<pubDate>${a.pubDate}</pubDate>` : ""}${a.source ? `<News:Source>${a.source}</News:Source>` : ""}</item>`;
    })
    .join("");
  return `<?xml version="1.0"?><rss version="2.0" xmlns:News="https://www.bing.com/news/search"><channel><title>Search</title>${body}</channel></rss>`;
}

/** Places the fake geocoder knows. Anything else is "not found". */
export const KNOWN_PLACES: Record<string, { lat: string; lon: string; addresstype?: string }> = {
  "el fasher, sudan": { lat: "13.6279", lon: "25.3494" },
  "khartoum, sudan": { lat: "15.5007", lon: "32.5599" },
  sudan: { lat: "14.5844", lon: "29.4918", addresstype: "country" },
};

/** A complete, well-formed model answer. Override fields per test. */
export function modelBrief(overrides: Record<string, unknown> = {}) {
  return {
    headline: "Aid access to El Fasher remains blocked amid fighting",
    location: {
      city: "El Fasher",
      country: "Sudan",
      region: "Sub-Saharan Africa",
      lat: 13.63,
      lng: 25.35,
    },
    summary: "Fighting continues around El Fasher.",
    keyFacts: [
      {
        text: "Aid convoys were blocked outside El Fasher while fighting continued.",
        evidence: [{ sourceId: "S2", quote: "aid convoys blocked outside El Fasher as fighting continues" }],
      },
    ],
    coverage: { agreements: [], differences: [] },
    actors: ["Sudanese Armed Forces", "Rapid Support Forces"],
    perspectives: [
      {
        actor: "Local residents",
        alignment: "Affected Population",
        framing: "Residents describe a siege.",
        interests: "Safe passage and aid.",
      },
    ],
    relatedEvents: [
      {
        date: "Apr 2023",
        title: "Fighting begins in Khartoum",
        description: "Start of the current war.",
        type: "escalation",
        place: "Khartoum, Sudan",
        lat: 15.5,
        lng: 32.56,
        searchQuery: "Khartoum fighting April 2023",
      },
    ],
    escalationRisk: "High",
    escalationReason: "No ceasefire is in place.",
    historicalContext: "The war began in April 2023.",
    affectedPopulation: "Civilians remain trapped.",
    keyQuestion: "Will aid corridors open?",
    casualtyData: {
      description: "Figures are disputed.",
      civilianImpact: "Displacement is widespread.",
      allSides: "Both parties are accused of abuses.",
    },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type RetrievalStub = {
  articles?: FakeArticle[];
  /** Feed items served by the Al Jazeera feed; the other feeds are empty unless set. */
  feedItems?: FakeFeedItem[];
  /** Raw news-search response override: a status, or a non-feed body returned with a 200. */
  search?: { status: number } | { text: string };
  wikipedia?: boolean;
  /** Geocoder override: a failing status, or a different set of known places. */
  geocoder?: { status: number } | { places: Record<string, { lat: string; lon: string }> };
};

/** Replace global fetch with canned news-search, RSS, Wikipedia and geocoder answers. */
export function stubRetrieval(opts: RetrievalStub = {}) {
  resetGeocoder();
  resetFeedCache();
  const articles = opts.articles ?? DEFAULT_ARTICLES;
  const feedItems = opts.feedItems ?? DEFAULT_FEED_ITEMS;
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes("bing.com/news/search")) {
      if (opts.search && "status" in opts.search) return new Response("limit", { status: opts.search.status });
      if (opts.search && "text" in opts.search) return new Response(opts.search.text, { status: 200 });
      return new Response(newsSearchXml(articles), { status: 200 });
    }
    if (url.includes("nominatim.openstreetmap.org")) {
      if (opts.geocoder && "status" in opts.geocoder) return new Response("busy", { status: opts.geocoder.status });
      const places = opts.geocoder && "places" in opts.geocoder ? opts.geocoder.places : KNOWN_PLACES;
      const hit = places[(new URL(url).searchParams.get("q") ?? "").toLowerCase()];
      return jsonResponse(hit ? [hit] : []);
    }
    if (url.includes("aljazeera.com/xml/rss")) return new Response(rssXml(feedItems), { status: 200 });
    if (FEEDS.some((f) => f.url === url)) return new Response(rssXml([]), { status: 200 });
    if (url.includes("wikipedia.org/w/api.php")) {
      return jsonResponse({ query: { search: opts.wikipedia === false ? [] : [{ title: "Sudanese civil war" }] } });
    }
    if (url.includes("wikipedia.org/api/rest_v1")) {
      return jsonResponse({
        extract: "The Sudanese civil war began in April 2023.",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Sudanese_civil_war" } },
      });
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Shape of an Anthropic text message, enough for the route. */
export function modelText(text: string) {
  return { content: [{ type: "text", text }] };
}

/** Clear cached briefs, in-flight work and rate-limit counters between tests. */
export function resetBriefState(app: { locals: Record<string, unknown> }) {
  (app.locals["briefs"] as { reset: () => void }).reset();
  resetGeocoder();
}
