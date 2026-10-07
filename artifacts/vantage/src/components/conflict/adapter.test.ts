import { afterEach, describe, expect, it, vi } from "vitest";
import { adaptBrief } from "./adapter";

type Brief = Parameters<typeof adaptBrief>[0];

function brief(overrides: Partial<Brief> = {}): Brief {
  return {
    headline: "Aid access to El Fasher remains blocked",
    inScope: true,
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

// Regression gates for the trust defects found in the audit.
describe("adaptBrief — trust contract", () => {
  it("shows the server generation time, not the time the page was opened", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T00:00:00.000Z"));
    expect(adaptBrief(brief()).publishedAt).toBe("2026-09-12T10:00:00.000Z");
  });

  it("counts retrieved articles and distinct outlets, not invented sources", () => {
    expect(adaptBrief(brief()).coverage).toEqual({ articles: 3, outlets: 2 });
  });

  it("leaves places with unknown coordinates off the map", () => {
    const a = adaptBrief(
      brief({
        location: { city: "", country: "Sudan", region: "Sub-Saharan Africa", lat: null, lng: null },
      }),
    );
    expect(a.mapEvents).toHaveLength(1);
    expect(a.mapEvents[0]).toMatchObject({ lat: 15.5, lng: 32.56 });
  });
});
