import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { modelBrief, modelText, resetBriefState, stubRetrieval } from "../test/harness";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@workspace/integrations-anthropic-ai", () => ({
  anthropic: { messages: { create } },
}));

import app from "../app";
import type { BriefState } from "../lib/brief-state";

const state = () => app.locals["briefs"] as BriefState;
const TOKEN = "an-operations-token-of-sufficient-length";

beforeEach(() => {
  create.mockReset();
  resetBriefState(app);
  stubRetrieval();
  state().config.opsToken = null;
  state().config.requireDatabase = false;
  state().config.modelKeyPresent = true;
  create.mockImplementation(async () => ({
    ...modelText(JSON.stringify(modelBrief())),
    usage: { input_tokens: 2000, output_tokens: 1500 },
  }));
});

describe("GET /api/readyz", () => {
  it("is ready without a database, and says plainly that nothing it saves will last", async () => {
    const res = await request(app).get("/api/readyz");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ready", durable: false });
    expect(res.body.checks.storage.detail).toMatch(/lost on restart/);
  });

  it("is not ready when a database is required and absent, or the model key is missing", async () => {
    state().config.requireDatabase = true;
    const noDb = await request(app).get("/api/readyz");
    expect(noDb.status).toBe(503);
    expect(noDb.body.checks.storage.ok).toBe(false);

    state().config.requireDatabase = false;
    state().config.modelKeyPresent = false;
    const noKey = await request(app).get("/api/readyz");
    expect(noKey.status).toBe(503);
    expect(noKey.body.checks.model).toEqual({ ok: false, detail: "ANTHROPIC_API_KEY is not set" });
  });

  it("never reveals a secret or a connection string", async () => {
    const res = await request(app).get("/api/readyz");
    expect(JSON.stringify(res.body)).not.toMatch(/test-key|postgres:\/\/|sk-/);
  });
});

describe("GET /api/ops/costs", () => {
  it("does not exist unless an operations token is configured", async () => {
    expect((await request(app).get("/api/ops/costs")).status).toBe(404);
    expect((await request(app).get("/api/ops/costs").set("Authorization", `Bearer ${TOKEN}`)).status).toBe(404);
  });

  it("answers 404, not 401, to a missing or wrong token", async () => {
    state().config.opsToken = TOKEN;
    for (const header of [undefined, "Bearer wrong", `Basic ${TOKEN}`, "Bearer "]) {
      const req = request(app).get("/api/ops/costs");
      const res = await (header ? req.set("Authorization", header) : req);
      expect(res.status).toBe(404);
    }
  });

  it("reports what the briefs cost once they are generated", async () => {
    state().config.opsToken = TOKEN;
    await request(app).post("/api/intelligence/explore").send({ topic: "Sudan humanitarian access" });
    await request(app).post("/api/intelligence/explore").send({ topic: "Sudan El Fasher aid" });
    // cached: no new model call, so no new cost
    await request(app).post("/api/intelligence/explore").send({ topic: "Sudan El Fasher aid" });

    const res = await request(app).get("/api/ops/costs?days=1").set("Authorization", `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.briefs).toBe(2);
    // 2 briefs × (2,000 in at $1/M + 1,500 out at $5/M) = 2 × $0.0095
    expect(res.body.totalUsd).toBeCloseTo(0.019, 6);
    expect(res.body.usdPerBrief).toBeCloseTo(0.0095, 6);
    expect(res.body.unpricedModels).toEqual([]);
    expect(res.body.daily[0]).toMatchObject({ purpose: "writer", calls: 2, failed: 0, inputTokens: 4000, outputTokens: 3000 });
  });

  it("records a failed model call, at no cost", async () => {
    state().config.opsToken = TOKEN;
    create.mockImplementation(async () => {
      throw new Error("529 overloaded");
    });
    await request(app).post("/api/intelligence/explore").send({ topic: "Sudan humanitarian access" });
    const res = await request(app).get("/api/ops/costs").set("Authorization", `Bearer ${TOKEN}`);
    expect(res.body.daily[0]).toMatchObject({ purpose: "writer", calls: 2, failed: 2, inputTokens: 0 });
    expect(res.body.briefs).toBe(0);
    expect(res.body.totalUsd).toBe(0);
  });
});
