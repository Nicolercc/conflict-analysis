import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { modelBrief, modelText, stubRetrieval } from "../test/harness";

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
  (app.locals["anthropicCache"] as Map<string, unknown>).clear();
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
    expect(res.body.liveEvents).toHaveLength(2);
    expect(res.body.liveEvents[0]).toMatchObject({
      source: "example-news.org",
      url: "https://example-news.org/el-fasher",
    });
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
    expect(res.body).not.toHaveProperty("sources");
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

  it("does not pair one valid coordinate with a made-up zero", async () => {
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
    expect(res.body.location).toMatchObject({ lat: null, lng: null });
    expect(res.body.relatedEvents[0]).toMatchObject({ lat: null, lng: null });
  });
});
