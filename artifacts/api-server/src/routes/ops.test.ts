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

describe("GET /api/ops/briefs/:id/audit", () => {
  const quoted = () =>
    create.mockImplementation(async () =>
      modelText(
        JSON.stringify(
          modelBrief({
            keyFacts: [
              { text: "Agencies say 12 aid trucks were refused access to El Fasher.", evidence: [{ sourceId: "S1", quote: "12 trucks carrying food were refused access to El Fasher" }] },
            ],
          }),
        ),
      ),
    );

  it("needs the operations token", async () => {
    quoted();
    const made = await request(app).post("/api/intelligence/explore").send({ topic: "Sudan El Fasher aid" });
    expect((await request(app).get(`/api/ops/briefs/${made.body.id}/audit`)).status).toBe(404);
  });

  it("confirms every quote against the text saved with the brief", async () => {
    state().config.opsToken = TOKEN;
    quoted();
    const made = await request(app).post("/api/intelligence/explore").send({ topic: "Sudan El Fasher aid" });
    const res = await request(app).get(`/api/ops/briefs/${made.body.id}/audit`).set("Authorization", `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.intact).toBe(true);
    expect(res.body.claims[0].quotes).toEqual([{ sourceId: "S1", status: "found" }]);
    expect(res.body.sources.every((s: { fingerprintMatches: boolean }) => s.fingerprintMatches)).toBe(true);
    // the public brief carries the same fingerprints, and never the text
    expect(made.body.sources[0].contentHash).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(made.body)).not.toContain("turned back near El Fasher. Humanitarian");
    expect(JSON.stringify(res.body)).not.toContain("Humanitarian agencies say");
  });

  it("reports a brief as not intact when its saved text has been altered", async () => {
    state().config.opsToken = TOKEN;
    quoted();
    const made = await request(app).post("/api/intelligence/explore").send({ topic: "Sudan El Fasher aid" });
    const snapshot = (await state().store.snapshot(made.body.id))!;
    snapshot[0]!.text = "Something else entirely.";
    const res = await request(app).get(`/api/ops/briefs/${made.body.id}/audit`).set("Authorization", `Bearer ${TOKEN}`);
    expect(res.body.intact).toBe(false);
    expect(res.body.sources[0].fingerprintMatches).toBe(false);
    expect(res.body.claims[0].quotes[0].status).toBe("missing");
  });

  it("does not keep pasted text, and says its quotes cannot be re-checked", async () => {
    state().config.opsToken = TOKEN;
    const article = "Fighting continued in Khartoum on Monday as agencies warned that 30 aid convoys were blocked from El Fasher. SECRET-MARKER";
    create.mockImplementation(async () =>
      modelText(JSON.stringify(modelBrief({ keyFacts: [{ text: "Agencies warned that 30 aid convoys were blocked from El Fasher.", evidence: [{ sourceId: "S1", quote: "agencies warned that 30 aid convoys were blocked from El Fasher" }] }] }))),
    );
    const made = await request(app).post("/api/intelligence/analyze").send({ article });
    const snapshot = await state().store.snapshot(made.body.id);
    expect(snapshot![0]).toMatchObject({ id: "S1", text: null });
    expect(JSON.stringify(snapshot)).not.toContain("SECRET-MARKER");
    const res = await request(app).get(`/api/ops/briefs/${made.body.id}/audit`).set("Authorization", `Bearer ${TOKEN}`);
    expect(res.body.notes.join(" ")).toMatch(/pasted is never stored/);
    expect(res.body.sources[0]).toMatchObject({ kept: false, fingerprintMatches: null });
  });
});
