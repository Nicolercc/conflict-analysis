import { afterEach, describe, expect, it, vi } from "vitest";
import { adaptBrief } from "./adapter";

type Brief = Parameters<typeof adaptBrief>[0];

function brief(overrides: Record<string, unknown> = {}): Brief {
  return {
    headline: "Aid access to El Fasher remains blocked",
    generatedAt: "2026-09-12T10:00:00.000Z",
    location: {
      city: "El Fasher",
      country: "Sudan",
      region: "Sub-Saharan Africa",
      lat: 13.63,
      lng: 25.35,
    },
    summary: "Fighting continues.",
    actors: ["SAF", "RSF"],
    // Legacy fields the current contract still requires; removed in PR 1.
    credibility: { score: 80, label: "High", reason: "r" },
    verification: { sources: [], consensus: "c", divergence: "d" },
    sources: [],
    perspectives: [],
    relatedEvents: [
      {
        date: "Apr 2023",
        title: "Fighting begins in Khartoum",
        description: "Start of the war.",
        type: "escalation",
        lat: 15.5,
        lng: 32.56,
        searchQuery: "q",
      },
    ],
    escalationRisk: "High",
    escalationReason: "No ceasefire.",
    historicalContext: "Context.",
    affectedPopulation: "Civilians remain trapped.",
    keyQuestion: "Will corridors open?",
    casualtyData: { description: "d", civilianImpact: "c", allSides: "a" },
    liveEvents: [
      { title: "A", source: "example-news.org", url: "https://example-news.org/a", date: "Sep 10, 2026" },
      { title: "B", source: "example-news.org", url: "https://example-news.org/b", date: "Sep 11, 2026" },
      { title: "C", source: "example-wire.com", url: "https://example-wire.com/c", date: "Sep 11, 2026" },
    ],
    ...overrides,
  } as unknown as Brief;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("adaptBrief — baseline", () => {
  it("maps headline, actors and timeline", () => {
    const a = adaptBrief(brief());
    expect(a.title).toBe("Aid access to El Fasher remains blocked");
    expect(a.parties.map((p) => p.name)).toEqual(["SAF", "RSF"]);
    expect(a.timeline).toHaveLength(1);
  });
});

// Known defects from the audit; `it.fails` is removed when PR 1 fixes each one.
describe("adaptBrief — trust contract", () => {
  it.fails("shows the server generation time, not the time the page was opened", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T00:00:00.000Z"));
    expect(adaptBrief(brief()).publishedAt).toBe("2026-09-12T10:00:00.000Z");
  });

  it.fails("counts retrieved articles and distinct outlets, not invented sources", () => {
    const a = adaptBrief(brief()) as unknown as {
      coverage: { articles: number; outlets: number };
    };
    expect(a.coverage).toEqual({ articles: 3, outlets: 2 });
  });

  it.fails("leaves places with unknown coordinates off the map", () => {
    const a = adaptBrief(
      brief({
        location: { city: "", country: "Sudan", region: "Sub-Saharan Africa", lat: null, lng: null },
      }),
    );
    expect(a.mapEvents).toHaveLength(1);
    expect(a.mapEvents[0]).toMatchObject({ lat: 15.5, lng: 32.56 });
  });
});
