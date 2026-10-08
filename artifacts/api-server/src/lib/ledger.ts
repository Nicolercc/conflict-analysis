import type pg from "pg";
import { once, safeName } from "./db";
import { logger } from "./logger";

/** One call to a model: what it was for, what it used and what that cost. */
export type ModelCall = {
  at: string;
  briefId: string | null;
  purpose: "writer" | "verifier";
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** US dollars, or null when no price is configured for the model. */
  costUsd: number | null;
  ms: number;
  ok: boolean;
};

export type DailyCost = {
  day: string;
  purpose: string;
  model: string;
  calls: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
};

export interface CostLedger {
  record(call: ModelCall): Promise<void>;
  /** Totals per day, purpose and model for the last `days` days, newest first. */
  daily(days: number): Promise<DailyCost[]>;
  reset?(): void;
}

export type Prices = Record<string, { input: number; output: number }>;

/** Dollars for one call, from per-million-token prices. Null when the model has no price. */
export function costOf(prices: Prices, model: string, inputTokens: number, outputTokens: number): number | null {
  const p = prices[model];
  if (!p) return null;
  return Math.round(((inputTokens * p.input + outputTokens * p.output) / 1_000_000) * 1e6) / 1e6;
}

function summarise(calls: ModelCall[], days: number): DailyCost[] {
  const since = Date.now() - days * 86_400_000;
  const groups = new Map<string, DailyCost>();
  for (const c of calls) {
    if (Date.parse(c.at) < since) continue;
    const day = c.at.slice(0, 10);
    const key = `${day}|${c.purpose}|${c.model}`;
    const g = groups.get(key) ?? { day, purpose: c.purpose, model: c.model, calls: 0, failed: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    g.calls += 1;
    if (!c.ok) g.failed += 1;
    g.inputTokens += c.inputTokens;
    g.outputTokens += c.outputTokens;
    g.costUsd = g.costUsd === null || c.costUsd === null ? null : Math.round((g.costUsd + c.costUsd) * 1e6) / 1e6;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.day.localeCompare(a.day) || a.purpose.localeCompare(b.purpose));
}

/** The most recent calls, in this process only. */
export class MemoryLedger implements CostLedger {
  private calls: ModelCall[] = [];

  constructor(private readonly max = 5_000) {}

  async record(call: ModelCall) {
    this.calls.push(call);
    if (this.calls.length > this.max) this.calls.splice(0, this.calls.length - this.max);
  }

  async daily(days: number) {
    return summarise(this.calls, days);
  }

  reset() {
    this.calls = [];
  }
}

export class PostgresLedger implements CostLedger {
  private readonly table: string;
  private readonly ensure: () => Promise<void>;

  constructor(private readonly pool: pg.Pool, table = "model_calls") {
    this.table = safeName(table);
    this.ensure = once(() =>
      pool.query(
        `CREATE TABLE IF NOT EXISTS ${this.table} (
           id bigserial PRIMARY KEY,
           at timestamptz NOT NULL,
           brief_id text,
           purpose text NOT NULL,
           model text NOT NULL,
           input_tokens integer NOT NULL,
           output_tokens integer NOT NULL,
           cost_usd numeric(12, 6),
           ms integer NOT NULL,
           ok boolean NOT NULL
         );
         CREATE INDEX IF NOT EXISTS ${this.table}_at ON ${this.table} (at DESC);`,
      ),
    );
  }

  async record(c: ModelCall) {
    await this.ensure();
    await this.pool.query(
      `INSERT INTO ${this.table} (at, brief_id, purpose, model, input_tokens, output_tokens, cost_usd, ms, ok)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [c.at, c.briefId, c.purpose, c.model, c.inputTokens, c.outputTokens, c.costUsd, Math.round(c.ms), c.ok],
    );
  }

  async daily(days: number) {
    await this.ensure();
    const { rows } = await this.pool.query<{
      day: string; purpose: string; model: string; calls: string; failed: string; input_tokens: string; output_tokens: string; cost_usd: string | null; unpriced: string;
    }>(
      `SELECT to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, purpose, model,
              count(*) AS calls, count(*) FILTER (WHERE NOT ok) AS failed,
              sum(input_tokens) AS input_tokens, sum(output_tokens) AS output_tokens,
              sum(cost_usd) AS cost_usd, count(*) FILTER (WHERE cost_usd IS NULL) AS unpriced
       FROM ${this.table}
       WHERE at > now() - make_interval(days => $1)
       GROUP BY 1, 2, 3
       ORDER BY 1 DESC, 2`,
      [days],
    );
    return rows.map((r) => ({
      day: r.day,
      purpose: r.purpose,
      model: r.model,
      calls: Number(r.calls),
      failed: Number(r.failed),
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      // A total that leaves out unpriced calls would understate the bill, so it is not given.
      costUsd: Number(r.unpriced) > 0 || r.cost_usd === null ? null : Number(r.cost_usd),
    }));
  }
}

let ledger: CostLedger = new MemoryLedger();
let prices: Prices = {};

/** Called once at start-up with the configured ledger and prices. */
export function useLedger(next: CostLedger, nextPrices: Prices) {
  ledger = next;
  prices = nextPrices;
}

export const currentLedger = () => ledger;

/**
 * Note one model call. Never throws and never delays the brief: the ledger is
 * bookkeeping, and a failure to write it must not cost the reader their answer.
 */
export function recordModelCall(call: Omit<ModelCall, "at" | "costUsd">) {
  const entry: ModelCall = { ...call, at: new Date().toISOString(), costUsd: costOf(prices, call.model, call.inputTokens, call.outputTokens) };
  ledger.record(entry).catch((err) => logger.warn({ err }, "model call not written to the ledger"));
}
