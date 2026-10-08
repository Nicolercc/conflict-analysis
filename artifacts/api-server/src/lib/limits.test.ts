import { describe, expect, it } from "vitest";
import { BriefCache } from "./brief-cache";
import { GenerationGate, RateLimiter } from "./limits";
import { MemoryUsageStore, type UsageStore } from "./usage-store";

describe("RateLimiter", () => {
  it("allows max requests per window, per client, then recovers", async () => {
    let t = 0;
    const limiter = new RateLimiter(2, 60_000, new MemoryUsageStore(() => t), () => t);
    await limiter.take("a");
    await limiter.take("a");
    await expect(limiter.take("a")).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
    await limiter.take("b"); // other clients are unaffected
    t = 60_000;
    await limiter.take("a");
  });

  it("tells the client how long is left in the window", async () => {
    const t = 45_000;
    const limiter = new RateLimiter(1, 60_000, new MemoryUsageStore(() => t), () => t);
    await limiter.take("a");
    await expect(limiter.take("a")).rejects.toMatchObject({ options: { retryAfterSec: 15 } });
  });

  it("stores a keyed hash of the client, never the address itself", async () => {
    const seen: string[] = [];
    const spy: UsageStore = { hit: async (_s, key) => (seen.push(key), 1), reserve: async () => true };
    await new RateLimiter(5, 60_000, spy, Date.now, "salt-one").take("203.0.113.9");
    await new RateLimiter(5, 60_000, spy, Date.now, "salt-two").take("203.0.113.9");
    expect(seen[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(seen[0]).not.toContain("203.0.113.9");
    expect(seen[0]).not.toBe(seen[1]);
  });

  it("shares its counts with any other limiter on the same store", async () => {
    const store = new MemoryUsageStore();
    const one = new RateLimiter(2, 60_000, store);
    const two = new RateLimiter(2, 60_000, store);
    await one.take("a");
    await two.take("a");
    await expect(one.take("a")).rejects.toMatchObject({ code: "RATE_LIMITED" });
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
    const gate = new GenerationGate(5, 2, new MemoryUsageStore(() => t));
    await gate.run(async () => 1);
    await gate.run(async () => 2);
    await expect(gate.run(async () => 3)).rejects.toMatchObject({ code: "OVERLOADED" });
    t = Date.UTC(2026, 9, 7, 0, 1);
    await expect(gate.run(async () => 4)).resolves.toBe(4);
  });

  it("shares the daily budget between instances and frees the slot when it is spent", async () => {
    const store = new MemoryUsageStore();
    const one = new GenerationGate(1, 1, store);
    const two = new GenerationGate(1, 1, store);
    await one.run(async () => 1);
    await expect(two.run(async () => 2)).rejects.toMatchObject({ code: "OVERLOADED" });
    // the refused request did not leave its concurrency slot held
    await expect(two.run(async () => 3)).rejects.toMatchObject({ message: expect.stringMatching(/today's limit/) });
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
