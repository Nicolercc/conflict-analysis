import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { modelBrief, modelText, resetBriefState, stubRetrieval } from "../test/harness";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@workspace/integrations-anthropic-ai", () => ({
  anthropic: { messages: { create } },
}));

import app from "../app";

const explore = (topic: unknown) =>
  request(app).post("/api/intelligence/explore").send({ topic });

/** Every model call answers with the same brief unless a test overrides it. */
function modelAnswers(brief: unknown) {
  create.mockImplementation(async () => modelText(JSON.stringify(brief)));
}

beforeEach(() => {
  create.mockReset();
  resetBriefState(app);
  stubRetrieval();
  modelAnswers(modelBrief());
});

describe("POST /api/intelligence/explore — baseline", () => {
  it("rejects a topic shorter than three characters", async () => {
    const res = await explore("ab");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_INPUT");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns the model brief with retrieved coverage attached", async () => {
    const res = await explore("Sudan humanitarian access");
    expect(res.status).toBe(200);
    expect(res.body.headline).toMatch(/El Fasher/);
    const urls = res.body.sources.map((s: { url: string }) => s.url);
    expect(urls).toContain("https://example-news.org/el-fasher");
    expect(res.body).not.toHaveProperty("liveEvents");
  });

  it("serves a repeated topic from cache without new model calls", async () => {
    await explore("Sudan humanitarian access");
    const callsAfterFirst = create.mock.calls.length;
    const res = await explore("Sudan humanitarian access");
    expect(res.status).toBe(200);
    expect(create.mock.calls.length).toBe(callsAfterFirst);
  });

  it("parses a brief wrapped in a markdown fence", async () => {
    create.mockImplementation(async () =>
      modelText("```json\n" + JSON.stringify(modelBrief()) + "\n```"),
    );
    const res = await explore("Sudan humanitarian access");
    expect(res.status).toBe(200);
    expect(res.body.location.city).toBe("El Fasher");
  });
});

// Regression gates for the trust defects found in the audit.
describe("POST /api/intelligence/explore — trust contract", () => {
  it("makes one model call per brief (no simulated verification pass)", async () => {
    await explore("Sudan humanitarian access");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("never returns model-invented verification sources", async () => {
    create.mockImplementation(async () =>
      modelText(
        JSON.stringify({
          ...modelBrief(),
          sources: ["aljazeera.com"],
          verification: {
            sources: [{ outlet: "Al Jazeera", url: "https://aljazeera.com/made-up" }],
            consensus: "x",
            divergence: "y",
          },
        }),
      ),
    );
    const res = await explore("Sudan humanitarian access");
    expect(res.body).not.toHaveProperty("verification");
    expect(JSON.stringify(res.body)).not.toMatch(/made-up/);
  });

  it("drops a model-invented credibility score", async () => {
    modelAnswers(
      modelBrief({ credibility: { score: 82, label: "High", reason: "r" } }),
    );
    const res = await explore("Sudan humanitarian access");
    expect(res.body).not.toHaveProperty("credibility");
  });

  it("stamps the brief with a server generation time that survives caching", async () => {
    const first = await explore("Sudan humanitarian access");
    expect(Number.isNaN(Date.parse(first.body.generatedAt))).toBe(false);
    await new Promise((r) => setTimeout(r, 15));
    const second = await explore("Sudan humanitarian access");
    expect(second.body.generatedAt).toBe(first.body.generatedAt);
  });

  it("reports a missing location as unknown instead of 0,0", async () => {
    modelAnswers(
      modelBrief({
        location: { city: "", country: "Sudan", region: "Sub-Saharan Africa" },
      }),
    );
    const res = await explore("Sudan humanitarian access");
    expect(res.body.location.lat).toBeNull();
    expect(res.body.location.lng).toBeNull();
  });

  it("puts the brief on the map where the geocoder finds the place, not where the model says", async () => {
    modelAnswers(modelBrief({ location: { city: "El Fasher", country: "Sudan", region: "Sub-Saharan Africa", lat: 13.9, lng: 25.1 } }));
    const res = await explore("Sudan humanitarian access");
    expect(res.body.location).toMatchObject({ lat: 13.6279, lng: 25.3494 });
    expect(res.body.relatedEvents[0]).toMatchObject({ place: "Khartoum, Sudan", lat: 15.5007, lng: 32.5599 });
  });

  it("leaves a place off the map when the lookup lands far from the model's estimate", async () => {
    // Same name, different place: the geocoder answers with somewhere 1,800 km away.
    stubRetrieval({ geocoder: { places: { "el fasher, sudan": { lat: "31.5", lon: "34.47" } } } });
    const res = await explore("Sudan humanitarian access");
    expect(res.body.location).toMatchObject({ city: "El Fasher", lat: null, lng: null });
  });

  it("leaves places off the map when the geocoder fails or does not know them", async () => {
    stubRetrieval({ geocoder: { status: 503 } });
    const down = await explore("Sudan humanitarian access");
    expect(down.status).toBe(200);
    expect(down.body.location).toMatchObject({ lat: null, lng: null });
    expect(down.body.relatedEvents[0]).toMatchObject({ lat: null, lng: null });

    resetBriefState(app);
    stubRetrieval();
    modelAnswers(modelBrief({ location: { city: "Atlantis", country: "Nowhere", region: "x", lat: 10, lng: 10 } }));
    const unknown = await explore("Sudan humanitarian access");
    expect(unknown.body.location).toMatchObject({ lat: null, lng: null });
  });

  it("does not pin an event to the centre of a country", async () => {
    const event = { date: "Apr 2025", title: "Famine declared", description: "d", type: "humanitarian", place: "Sudan", lat: 14.6, lng: 29.5, searchQuery: "q" };
    modelAnswers(modelBrief({ relatedEvents: [event] }));
    const res = await explore("Sudan humanitarian access");
    expect(res.body.relatedEvents[0]).toMatchObject({ place: "Sudan", lat: null, lng: null });
  });

  it("does not pair one valid coordinate with a made-up zero, and never maps an unnamed event", async () => {
    modelAnswers(
      modelBrief({
        location: {
          city: "El Fasher",
          country: "Sudan",
          region: "Sub-Saharan Africa",
          lat: 13.63,
          lng: "unknown",
        },
        relatedEvents: [
          {
            date: "Apr 2023",
            title: "Event",
            description: "d",
            type: "escalation",
            lat: 999,
            lng: 32.56,
            searchQuery: "q",
          },
        ],
      }),
    );
    const res = await explore("Sudan humanitarian access");
    // A half-valid pair is no estimate at all, so there is nothing to confirm the lookup against.
    expect(res.body.location).toMatchObject({ lat: null, lng: null });
    expect(res.body.relatedEvents[0]).toMatchObject({ place: null, lat: null, lng: null });
  });
});
