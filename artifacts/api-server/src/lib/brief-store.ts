import crypto from "node:crypto";
import type pg from "pg";
import { once, safeName } from "./db";
import { logger } from "./logger";

/**
 * Where finished briefs are kept so a link to one keeps working. A brief is
 * saved once and never changed: the stored copy is exactly what its first
 * reader saw, including its generation time.
 */
export type StoredBrief = { id: string; generatedAt: string };

export interface BriefStore {
  save(key: string, brief: StoredBrief): Promise<void>;
  get(id: string): Promise<StoredBrief | null>;
  /** The newest brief for the same request, if it is younger than `maxAgeMs`. */
  latest(key: string, maxAgeMs: number): Promise<StoredBrief | null>;
  reset?(): void;
  close?(): Promise<void>;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{10,32}$/;
export const isBriefId = (value: string) => ID_PATTERN.test(value);
/** Unguessable and short enough for a link: 12 URL-safe characters (72 random bits). */
export const newBriefId = () => crypto.randomBytes(9).toString("base64url");

/** Keeps the most recent briefs in the process. Lost on restart. */
export class MemoryBriefStore implements BriefStore {
  private byId = new Map<string, { key: string; brief: StoredBrief }>();
  private newest = new Map<string, string>();

  constructor(private readonly maxEntries = 500) {}

  async save(key: string, brief: StoredBrief) {
    this.byId.set(brief.id, { key, brief });
    this.newest.set(key, brief.id);
    while (this.byId.size > this.maxEntries) {
      const oldestId = this.byId.keys().next().value;
      if (oldestId === undefined) break;
      const oldest = this.byId.get(oldestId);
      this.byId.delete(oldestId);
      if (oldest && this.newest.get(oldest.key) === oldestId) this.newest.delete(oldest.key);
    }
  }

  async get(id: string) {
    return this.byId.get(id)?.brief ?? null;
  }

  async latest(key: string, maxAgeMs: number) {
    const id = this.newest.get(key);
    const brief = id ? this.byId.get(id)?.brief : undefined;
    if (!brief) return null;
    return Date.now() - Date.parse(brief.generatedAt) < maxAgeMs ? brief : null;
  }

  reset() {
    this.byId.clear();
    this.newest.clear();
  }
}

/** Briefs in Postgres: links survive restarts and deploys. */
export class PostgresBriefStore implements BriefStore {
  private readonly table: string;
  private readonly ensure: () => Promise<void>;

  constructor(private readonly pool: pg.Pool, table = "briefs") {
    this.table = safeName(table);
    this.ensure = once(() =>
      pool.query(
        `CREATE TABLE IF NOT EXISTS ${this.table} (
           id text PRIMARY KEY,
           cache_key text NOT NULL,
           created_at timestamptz NOT NULL,
           body jsonb NOT NULL
         );
         CREATE INDEX IF NOT EXISTS ${this.table}_key_created ON ${this.table} (cache_key, created_at DESC);`,
      ),
    );
  }

  async save(key: string, brief: StoredBrief) {
    await this.ensure();
    await this.pool.query(
      `INSERT INTO ${this.table} (id, cache_key, created_at, body) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [brief.id, key, brief.generatedAt, JSON.stringify(brief)],
    );
  }

  async get(id: string) {
    await this.ensure();
    const { rows } = await this.pool.query<{ body: StoredBrief }>(`SELECT body FROM ${this.table} WHERE id = $1`, [id]);
    return rows[0]?.body ?? null;
  }

  async latest(key: string, maxAgeMs: number) {
    await this.ensure();
    const { rows } = await this.pool.query<{ body: StoredBrief }>(
      `SELECT body FROM ${this.table} WHERE cache_key = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT 1`,
      [key, new Date(Date.now() - maxAgeMs).toISOString()],
    );
    return rows[0]?.body ?? null;
  }

}

/**
 * Memory in front of a durable store. A brief is always readable from this
 * process even if the database is briefly unreachable; database errors are
 * logged and never fail a request that already has its brief.
 */
export class LayeredBriefStore implements BriefStore {
  constructor(private readonly memory: MemoryBriefStore, private readonly durable: BriefStore | null) {}

  async save(key: string, brief: StoredBrief) {
    await this.memory.save(key, brief);
    if (!this.durable) return;
    try {
      await this.durable.save(key, brief);
    } catch (err) {
      logger.error({ err, id: brief.id }, "brief not saved to the database; its link will not survive a restart");
    }
  }

  async get(id: string) {
    const local = await this.memory.get(id);
    if (local || !this.durable) return local;
    return this.durable.get(id);
  }

  async latest(key: string, maxAgeMs: number) {
    const local = await this.memory.latest(key, maxAgeMs);
    if (local || !this.durable) return local;
    try {
      return await this.durable.latest(key, maxAgeMs);
    } catch (err) {
      logger.warn({ err }, "brief store lookup failed; generating instead");
      return null;
    }
  }

  reset() {
    this.memory.reset();
  }
}

export function createBriefStore(pool: pg.Pool | null): LayeredBriefStore {
  return new LayeredBriefStore(new MemoryBriefStore(), pool ? new PostgresBriefStore(pool) : null);
}
