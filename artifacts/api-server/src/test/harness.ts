import { vi } from "vitest";
import { resetGdeltThrottle } from "../brief/retrieval/gdelt";
import { FEEDS, resetFeedCache } from "../brief/retrieval/rss";

/**
 * Test harness: a fake model and fake retrieval so route tests never touch
 * the network or spend tokens.
 */

export type FakeArticle = {
  title?: string;
  domain?: string;
  url?: string;
  seendate?: string;
  language?: string;
  sourcecountry?: string;
};

export const DEFAULT_ARTICLES: FakeArticle[] = [
  {
    title: "Aid convoys blocked outside El Fasher as fighting continues",
    domain: "example-news.org",
    url: "https://example-news.org/el-fasher",
    seendate: "20260910T120000Z",
    language: "English",
    sourcecountry: "Kenya",
  },
  {
    title: "Talks on Sudan resume in Jeddah",
    domain: "example-wire.com",
    url: "https://example-wire.com/jeddah",
    seendate: "20260911T080000Z",
    language: "English",
    sourcecountry: "Saudi Arabia",
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
      { text: "Aid convoys were blocked outside El Fasher while fighting continued.", sourceIds: ["S2"] },
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
  /** Raw GDELT response override: a status, or a plain-text body returned with a 200. */
  gdelt?: { status: number } | { text: string };
  wikipedia?: boolean;
};

/** Replace global fetch with canned GDELT, RSS and Wikipedia answers. */
export function stubRetrieval(opts: RetrievalStub = {}) {
  resetGdeltThrottle();
  resetFeedCache();
  const articles = opts.articles ?? DEFAULT_ARTICLES;
  const feedItems = opts.feedItems ?? DEFAULT_FEED_ITEMS;
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes("api.gdeltproject.org")) {
      if (opts.gdelt && "status" in opts.gdelt) return new Response("limit", { status: opts.gdelt.status });
      if (opts.gdelt && "text" in opts.gdelt) return new Response(opts.gdelt.text, { status: 200 });
      return jsonResponse({ articles });
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
  resetGdeltThrottle();
}
