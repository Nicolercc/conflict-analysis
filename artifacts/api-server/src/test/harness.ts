import { vi } from "vitest";

/**
 * Test harness: a fake model and fake retrieval so route tests never touch
 * the network or spend tokens.
 */

export type FakeArticle = {
  title?: string;
  domain?: string;
  url?: string;
  seendate?: string;
};

export const DEFAULT_ARTICLES: FakeArticle[] = [
  {
    title: "Aid convoys blocked outside El Fasher",
    domain: "example-news.org",
    url: "https://example-news.org/el-fasher",
    seendate: "20260910T120000Z",
  },
  {
    title: "Talks resume in Jeddah",
    domain: "example-wire.com",
    url: "https://example-wire.com/jeddah",
    seendate: "20260911T080000Z",
  },
];

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

/** Replace global fetch with canned GDELT and Wikipedia answers. */
export function stubRetrieval(opts: { articles?: FakeArticle[] } = {}) {
  const articles = opts.articles ?? DEFAULT_ARTICLES;
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes("api.gdeltproject.org")) {
      return jsonResponse({ articles });
    }
    if (url.includes("wikipedia.org/w/api.php")) {
      return jsonResponse({ query: { search: [{ title: "Sudanese civil war" }] } });
    }
    if (url.includes("wikipedia.org/api/rest_v1")) {
      return jsonResponse({ extract: "Background extract." });
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
}
