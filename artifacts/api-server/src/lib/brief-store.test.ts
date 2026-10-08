import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createPool } from "./db";
import { isBriefId, LayeredBriefStore, MemoryBriefStore, newBriefId, PostgresBriefStore, type BriefStore, type StoredBrief } from "./brief-store";

const brief = (over: Record<string, unknown> = {}) =>
  ({ id: newBriefId(), generatedAt: new Date().toISOString(), headline: "Aid access blocked", ...over }) as StoredBrief;

function contract(name: string, make: () => BriefStore) {
  describe(name, () => {
    it("returns exactly what was saved, by id", async () => {
      const store = make();
      const b = brief({ sources: [{ id: "S1", title: "“Quoted” headline — with dashes" }] });
      await store.save("topic:sudan", b);
      expect(await store.get(b.id)).toEqual(b);
      expect(await store.get(newBriefId())).toBeNull();
    });

    it("finds the newest brief for a request only while it is fresh", async () => {
      const store = make();
      const key = `topic:${newBriefId()}`;
      const old = brief({ generatedAt: new Date(Date.now() - 3_600_000).toISOString() });
      const fresh = brief({ generatedAt: new Date(Date.now() - 60_000).toISOString() });
      await store.save(key, old);
      await store.save(key, fresh);
      expect((await store.latest(key, 600_000))?.id).toBe(fresh.id);
      expect(await store.latest(key, 30_000)).toBeNull();
      expect(await store.latest("topic:other", 600_000)).toBeNull();
      // an old brief is still readable by its link
      expect((await store.get(old.id))?.id).toBe(old.id);
    });

    it("keeps the source text saved with a brief, and returns none when none was saved", async () => {
      const store = make();
      const [withText, without] = [brief(), brief()];
      const snapshot = [
        { id: "S1", publisher: "UN News", url: "https://news.un.org/a", textFrom: "article" as const, retrievedAt: new Date().toISOString(), contentHash: "abc123", text: "“Quoted” text — kept exactly." },
        { id: "S2", publisher: "Pasted text", url: null, textFrom: "article" as const, retrievedAt: new Date().toISOString(), contentHash: "def456", text: null },
      ];
      await store.save("k1", withText, snapshot);
      await store.save("k2", without);
      expect(await store.snapshot(withText.id)).toEqual(snapshot);
      expect(await store.snapshot(without.id)).toBeNull();
      expect(await store.snapshot(newBriefId())).toBeNull();
    });

    it("keeps the first copy when the same id is saved twice", async () => {
      const store = make();
      const b = brief();
      await store.save("k", b);
      await store.save("k", { ...b, headline: "changed" } as StoredBrief);
      expect(await store.get(b.id)).toMatchObject({ id: b.id });
    });
  });
}

describe("brief ids", () => {
  it("are URL-safe, long enough not to be guessed, and validated", () => {
    const ids = new Set(Array.from({ length: 500 }, newBriefId));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(isBriefId(id)).toBe(true);
    expect(isBriefId("short")).toBe(false);
    expect(isBriefId("../../etc/passwd")).toBe(false);
    expect(isBriefId("a".repeat(40))).toBe(false);
  });
});

contract("memory store", () => new MemoryBriefStore());

describe("memory store limits", () => {
  it("drops the oldest brief once full", async () => {
    const store = new MemoryBriefStore(2);
    const [a, b, c] = [brief(), brief(), brief()];
    await store.save("a", a);
    await store.save("b", b);
    await store.save("c", c);
    expect(await store.get(a.id)).toBeNull();
    expect(await store.latest("a", 60_000)).toBeNull();
    expect((await store.get(c.id))?.id).toBe(c.id);
  });
});

describe("layered store", () => {
  const failing: BriefStore = {
    save: async () => { throw new Error("database down"); },
    get: async () => { throw new Error("database down"); },
    latest: async () => { throw new Error("database down"); },
    snapshot: async () => { throw new Error("database down"); },
  };

  it("still serves a brief from this process when the database is down", async () => {
    const store = new LayeredBriefStore(new MemoryBriefStore(), failing);
    const b = brief();
    await expect(store.save("k", b)).resolves.toBeUndefined();
    expect((await store.get(b.id))?.id).toBe(b.id);
    expect(await store.latest("unknown", 60_000)).toBeNull();
  });

  it("reads through to the database for a brief this process has not seen", async () => {
    const durable = new MemoryBriefStore();
    const b = brief();
    await durable.save("k", b);
    const store = new LayeredBriefStore(new MemoryBriefStore(), durable);
    expect((await store.get(b.id))?.id).toBe(b.id);
    expect((await store.latest("k", 60_000))?.id).toBe(b.id);
  });
});

// Runs against a real database when one is provided (CI starts one).
const url = process.env["TEST_DATABASE_URL"];
describe.skipIf(!url)("postgres store", () => {
  let pool: Pool;
  let store: PostgresBriefStore;
  beforeAll(() => {
    pool = createPool(url!);
    store = new PostgresBriefStore(pool, `briefs_test_${Date.now()}`);
  });
  afterAll(async () => {
    await pool?.end();
  });
  contract("postgres", () => store);
});
