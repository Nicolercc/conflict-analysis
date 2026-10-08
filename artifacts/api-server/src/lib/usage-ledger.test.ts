import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPool } from "./db";
import { costOf, MemoryLedger, PostgresLedger, type CostLedger, type ModelCall } from "./ledger";
import { MemoryUsageStore, PostgresUsageStore, ResilientUsageStore, type UsageStore } from "./usage-store";

const unique = () => `k${Math.random().toString(36).slice(2)}`;

function usageContract(name: string, make: () => UsageStore) {
  describe(`${name} usage counters`, () => {
    it("counts per key and per scope", async () => {
      const store = make();
      const [a, b] = [unique(), unique()];
      expect(await store.hit("rate", a, 60_000)).toBe(1);
      expect(await store.hit("rate", a, 60_000)).toBe(2);
      expect(await store.hit("rate", b, 60_000)).toBe(1);
      expect(await store.hit("other", a, 60_000)).toBe(1);
    });

    it("reserves up to a maximum and no further, even when asked all at once", async () => {
      const store = make();
      const key = unique();
      const results = await Promise.all(Array.from({ length: 12 }, () => store.reserve("budget", key, 86_400_000, 5)));
      expect(results.filter(Boolean)).toHaveLength(5);
      expect(await store.reserve("budget", key, 86_400_000, 5)).toBe(false);
    });
  });
}

const call = (over: Partial<ModelCall> = {}): ModelCall => ({
  at: new Date().toISOString(), briefId: "abcdefghijkl", purpose: "writer", model: "claude-haiku-4-5-20251001",
  inputTokens: 2000, outputTokens: 1500, costUsd: 0.0095, ms: 21_000, ok: true, ...over,
});

function ledgerContract(name: string, make: () => CostLedger) {
  describe(`${name} cost ledger`, () => {
    it("totals calls per day, purpose and model", async () => {
      const ledger = make();
      await ledger.record(call());
      await ledger.record(call({ costUsd: 0.0105 }));
      await ledger.record(call({ purpose: "verifier", inputTokens: 900, outputTokens: 300, costUsd: 0.0024, ok: false }));
      const rows = await ledger.daily(1);
      const writer = rows.find((r) => r.purpose === "writer")!;
      const verifier = rows.find((r) => r.purpose === "verifier")!;
      expect(writer).toMatchObject({ calls: 2, failed: 0, inputTokens: 4000, outputTokens: 3000 });
      expect(writer.costUsd).toBeCloseTo(0.02, 6);
      expect(verifier).toMatchObject({ calls: 1, failed: 1 });
    });

    it("gives no total for a day that includes a call with no known price", async () => {
      const ledger = make();
      await ledger.record(call({ model: "unpriced-model", costUsd: null }));
      await ledger.record(call({ model: "unpriced-model", costUsd: 0.01 }));
      const row = (await ledger.daily(1)).find((r) => r.model === "unpriced-model")!;
      expect(row.calls).toBe(2);
      expect(row.costUsd).toBeNull();
    });

    it("leaves out calls older than the period asked for", async () => {
      const ledger = make();
      await ledger.record(call({ model: "old-model", at: new Date(Date.now() - 5 * 86_400_000).toISOString() }));
      expect((await ledger.daily(2)).some((r) => r.model === "old-model")).toBe(false);
      expect((await ledger.daily(7)).some((r) => r.model === "old-model")).toBe(true);
    });
  });
}

describe("cost of a call", () => {
  it("is tokens times the per-million price, and unknown for an unpriced model", () => {
    const prices = { haiku: { input: 1, output: 5 } };
    expect(costOf(prices, "haiku", 2000, 1500)).toBe(0.0095);
    expect(costOf(prices, "haiku", 0, 0)).toBe(0);
    expect(costOf(prices, "something-else", 2000, 1500)).toBeNull();
  });
});

usageContract("memory", () => new MemoryUsageStore());
ledgerContract("memory", () => new MemoryLedger());

describe("usage counters when the database is down", () => {
  it("keep counting in this process instead of failing the request", async () => {
    const broken: UsageStore = {
      hit: async () => { throw new Error("database down"); },
      reserve: async () => { throw new Error("database down"); },
    };
    const store = new ResilientUsageStore(broken);
    expect(await store.hit("rate", "a", 60_000)).toBe(1);
    expect(await store.hit("rate", "a", 60_000)).toBe(2);
    expect(await store.reserve("budget", "b", 60_000, 1)).toBe(true);
    expect(await store.reserve("budget", "b", 60_000, 1)).toBe(false);
  });
});

// Against a real database when one is provided (CI starts one).
const url = process.env["TEST_DATABASE_URL"];
describe.skipIf(!url)("postgres", () => {
  let pool: Pool;
  const suffix = Date.now();
  beforeAll(() => {
    pool = createPool(url!);
  });
  afterAll(async () => {
    await pool?.end();
  });
  usageContract("postgres", () => new PostgresUsageStore(pool, `usage_test_${suffix}`));
  // A fresh table per test: the ledger's totals are over everything in it.
  let n = 0;
  ledgerContract("postgres", () => new PostgresLedger(pool, `calls_test_${suffix}_${n++}`));

  it("two instances share one rate count", async () => {
    const [one, two] = [new PostgresUsageStore(pool, `usage_test_${suffix}`), new PostgresUsageStore(pool, `usage_test_${suffix}`)];
    const key = unique();
    await one.hit("rate", key, 60_000);
    expect(await two.hit("rate", key, 60_000)).toBe(2);
  });
});
