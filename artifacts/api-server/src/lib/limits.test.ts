import { describe, expect, it } from "vitest";
import { BriefCache } from "./brief-cache";
import { GenerationGate, RateLimiter } from "./limits";

describe("RateLimiter", () => {
  it("allows max requests per window, per client, then recovers", () => {
    let t = 0;
    const limiter = new RateLimiter(2, 60_000, () => t);
    limiter.take("a");
    limiter.take("a");
    expect(() => limiter.take("a")).toThrowError(/Too many requests/);
    limiter.take("b"); // other clients are unaffected
    t = 60_000;
    limiter.take("a");
  });
});

describe("GenerationGate", () => {
  it("refuses work beyond the concurrency cap and frees the slot afterwards", async () => {
    const gate = new GenerationGate(1, 100);
    let release!: () => void;
    const first = gate.run(() => new Promise<string>((r) => (release = () => r("done"))));
    await expect(gate.run(async () => "x")).rejects.toMatchObject({ code: "OVERLOADED" });
    release();
    await expect(first).resolves.toBe("done");
    await expect(gate.run(async () => "y")).resolves.toBe("y");
  });

  it("enforces a daily budget that resets at the next UTC day", async () => {
    let t = Date.UTC(2026, 9, 6, 12);
    const gate = new GenerationGate(5, 2, () => t);
    await gate.run(async () => 1);
    await gate.run(async () => 2);
    await expect(gate.run(async () => 3)).rejects.toMatchObject({ code: "OVERLOADED" });
    t = Date.UTC(2026, 9, 7, 0, 1);
    await expect(gate.run(async () => 4)).resolves.toBe(4);
  });

  it("frees the slot when work fails", async () => {
    const gate = new GenerationGate(1, 100);
    await expect(gate.run(async () => { throw new Error("x"); })).rejects.toThrow("x");
    await expect(gate.run(async () => "ok")).resolves.toBe("ok");
  });
});

describe("BriefCache", () => {
  it("expires entries after the TTL", () => {
    let t = 0;
    const cache = new BriefCache<string>(1000, 10, () => t);
    cache.set("k", "v");
    t = 999;
    expect(cache.get("k")).toBe("v");
    t = 1000;
    expect(cache.get("k")).toBeUndefined();
  });

  it("evicts the least recently used entry at capacity", () => {
    const cache = new BriefCache<string>(60_000, 2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a");
    cache.set("c", "3");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.size).toBe(2);
  });

  it("shares in-flight work and does not store failures", async () => {
    const cache = new BriefCache<string>(60_000, 10);
    let calls = 0;
    const make = async () => { calls += 1; return "v"; };
    const [a, b] = await Promise.all([cache.getOrCreate("k", make), cache.getOrCreate("k", make)]);
    expect([a, b, calls]).toEqual(["v", "v", 1]);
    await expect(cache.getOrCreate("bad", async () => { throw new Error("x"); })).rejects.toThrow("x");
    await expect(cache.getOrCreate("bad", async () => "recovered")).resolves.toBe("recovered");
  });
});
