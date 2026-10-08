import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { modelBrief, modelText, resetBriefState, stubRetrieval } from "../test/harness";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@workspace/integrations-anthropic-ai", () => ({
  anthropic: { messages: { create } },
}));

import app from "../app";

const explore = (body: unknown) =>
  request(app).post("/api/intelligence/explore").send(body as object);
const analyze = (body: unknown) =>
  request(app).post("/api/intelligence/analyze").send(body as object);

const ARTICLE =
  "Fighting continued in Khartoum on Monday as humanitarian agencies warned that aid convoys were being blocked from reaching El Fasher.";

let fetchMock: ReturnType<typeof stubRetrieval>;

beforeEach(() => {
  create.mockReset();
  resetBriefState(app);
  fetchMock = stubRetrieval();
  create.mockImplementation(async () => modelText(JSON.stringify(modelBrief())));
});

describe("input validation", () => {
  it.each([
    ["a non-string topic", { topic: 42 }],
    ["a topic over 240 characters", { topic: "war ".repeat(80) }],
    ["a whitespace-only topic", { topic: "      " }],
  ])("explore rejects %s before any retrieval or inference", async (_n, body) => {
    const res = await explore(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_INPUT");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ["a non-string article", { article: 123 }],
    ["both an article and a url", { article: ARTICLE, url: "https://example.org/a" }],
    ["an article over 20,000 characters", { article: "x".repeat(20_001) }],
    ["a url that is not http(s)", { url: "file:///etc/passwd" }],
    ["neither field", {}],
  ])("analyze rejects %s before any retrieval or inference", async (_n, body) => {
    const res = await analyze(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_INPUT");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("outbound fetch policy", () => {
  it.each([
    "http://127.0.0.1:3001/api/healthz",
    "http://localhost/admin",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/",
    "http://2130706433/",
    "http://[::ffff:127.0.0.1]/",
  ])("refuses to fetch %s", async (url) => {
    const res = await analyze({ url });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("FETCH_BLOCKED");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("model output contract", () => {
  it("does not return 200 for syntactically valid but incomplete output", async () => {
    create.mockImplementation(async () =>
      modelText(JSON.stringify({ headline: "Only a headline" })),
    );
    const res = await explore({ topic: "Sudan humanitarian access" });
    expect(res.status).toBe(502);
    expect(res.body.error).toBe("MODEL_OUTPUT_INVALID");
    // one bounded retry, then give up
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("recovers when the retry returns a valid brief", async () => {
    create
      .mockImplementationOnce(async () => modelText("not json at all"))
      .mockImplementationOnce(async () => modelText(JSON.stringify(modelBrief())));
    const res = await explore({ topic: "Sudan humanitarian access" });
    expect(res.status).toBe(200);
    expect(res.body.headline).toMatch(/El Fasher/);
  });

  it("does not cache a failed generation", async () => {
    create.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    await explore({ topic: "Sudan humanitarian access" });
    const res = await explore({ topic: "Sudan humanitarian access" });
    expect(res.status).toBe(200);
  });
});

describe("failures", () => {
  it("reports a provider failure without leaking the upstream message", async () => {
    create.mockImplementation(async () => {
      throw new Error(
        '400 {"type":"error","error":{"message":"This organization has been disabled."},"request_id":"req_secret"}',
      );
    });
    for (const res of [
      await explore({ topic: "Sudan humanitarian access" }),
      await analyze({ article: ARTICLE }),
    ]) {
      expect(res.status).toBe(502);
      expect(res.body.error).toBe("PROVIDER_UNAVAILABLE");
      expect(JSON.stringify(res.body)).not.toMatch(/organization|req_secret/);
      expect(typeof res.body.requestId).toBe("string");
    }
  });
});

describe("response headers", () => {
  it("sends protective headers and no server fingerprint", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toMatch(/default-src 'none'/);
    expect(res.headers["content-security-policy"]).toMatch(/frame-ancestors 'none'/);
    expect(res.headers["strict-transport-security"]).toMatch(/max-age=/);
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("still lets the allowed site read a response", async () => {
    const res = await request(app).get("/api/healthz").set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });
});

describe("provider blips", () => {
  it("tries once more when the provider fails straight away, then succeeds", async () => {
    let calls = 0;
    create.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw new Error("529 overloaded");
      return modelText(JSON.stringify(modelBrief()));
    });
    const res = await explore({ topic: "Sudan humanitarian access" });
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("gives up after the second quick failure", async () => {
    create.mockImplementation(async () => {
      throw new Error("529 overloaded");
    });
    const res = await explore({ topic: "Sudan humanitarian access" });
    expect(res.status).toBe(502);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe("resource controls", () => {
  it("shares one generation between identical concurrent requests", async () => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    create.mockImplementation(async () => {
      await held;
      return modelText(JSON.stringify(modelBrief()));
    });
    const a = explore({ topic: "Sudan humanitarian access" }).then((r) => r);
    const b = explore({ topic: "  sudan humanitarian ACCESS " }).then((r) => r);
    await new Promise((r) => setTimeout(r, 50));
    release();
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.status).toBe(200);
    expect(rb.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
    expect(rb.body.generatedAt).toBe(ra.body.generatedAt);
  });

  it("limits requests per client and says when to retry", async () => {
    let last = await explore({ topic: "Sudan humanitarian access" });
    for (let i = 0; i < 30 && last.status !== 429; i++) {
      last = await explore({ topic: "Sudan humanitarian access" });
    }
    expect(last.status).toBe(429);
    expect(last.body.error).toBe("RATE_LIMITED");
    expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
  });
});

describe("http hardening", () => {
  it("only grants CORS to configured origins", async () => {
    const evil = await request(app).get("/api/healthz").set("Origin", "https://evil.example");
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
    const ok = await request(app)
      .get("/api/healthz")
      .set("Origin", "https://conflict-analysis-vantage.vercel.app");
    expect(ok.headers["access-control-allow-origin"]).toBe(
      "https://conflict-analysis-vantage.vercel.app",
    );
  });

  it("does not advertise the framework", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
