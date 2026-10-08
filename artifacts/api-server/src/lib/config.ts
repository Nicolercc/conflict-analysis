/**
 * Every setting the server reads from its environment, validated once at
 * start-up. A malformed value stops the process with a message naming the
 * variable, instead of silently falling back to a default and misbehaving
 * later. Secrets are never included in messages.
 */
export type Config = {
  nodeEnv: string;
  /** Postgres connection string, or null when briefs and limits are kept in memory. */
  databaseUrl: string | null;
  /** When true the server refuses to start, and reports not-ready, without a database. */
  requireDatabase: boolean;
  /** Bearer token for the operations endpoints; they answer 404 without it. */
  opsToken: string | null;
  /** Whether a model API key is present (the key itself is read by the client library). */
  modelKeyPresent: boolean;
  limits: {
    rateLimitMax: number;
    rateLimitWindowMs: number;
    maxConcurrent: number;
    dailyBudget: number;
    cacheTtlMs: number;
    cacheMaxEntries: number;
  };
  /** US dollars per million tokens, by model id. A model not listed has no cost recorded. */
  modelPrices: Record<string, { input: number; output: number }>;
};

type Env = Record<string, string | undefined>;

const DEFAULT_PRICES: Config["modelPrices"] = {
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

export function loadConfig(env: Env = process.env): { config: Config; problems: string[]; warnings: string[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  const nodeEnv = env["NODE_ENV"] ?? "development";
  const production = nodeEnv === "production";

  const positive = (name: string, fallback: number, { integer = true } = {}) => {
    const raw = env[name];
    if (raw === undefined || raw.trim() === "") return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || (integer && !Number.isInteger(n))) {
      problems.push(`${name} must be a positive ${integer ? "whole number" : "number"}; got "${raw}"`);
      return fallback;
    }
    return n;
  };
  const flag = (name: string) => {
    const raw = (env[name] ?? "").trim().toLowerCase();
    if (raw === "" || raw === "false" || raw === "0" || raw === "off") return false;
    if (raw === "true" || raw === "1" || raw === "on") return true;
    problems.push(`${name} must be true or false; got "${env[name]}"`);
    return false;
  };

  let databaseUrl: string | null = null;
  const rawDb = env["DATABASE_URL"]?.trim();
  if (rawDb) {
    if (/^postgres(ql)?:\/\/\S+$/.test(rawDb)) databaseUrl = rawDb;
    else if (production) problems.push("DATABASE_URL must be a postgres:// connection string");
    // A placeholder left in a local .env is not worth stopping for.
    else warnings.push("DATABASE_URL is set but is not a postgres:// connection string; ignoring it");
  }
  const requireDatabase = flag("REQUIRE_DATABASE");
  if (requireDatabase && !databaseUrl) {
    problems.push("REQUIRE_DATABASE is on but DATABASE_URL is not set");
  }
  if (!databaseUrl && production) {
    warnings.push("no DATABASE_URL: briefs, rate limits and the cost ledger are kept in memory and are lost on every restart or deploy");
  }

  const opsToken = env["OPS_TOKEN"]?.trim() || null;
  if (opsToken && opsToken.length < 24) problems.push("OPS_TOKEN must be at least 24 characters");

  const modelKeyPresent = Boolean((env["ANTHROPIC_API_KEY"] ?? env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"])?.trim());
  if (!modelKeyPresent) problems.push("ANTHROPIC_API_KEY is not set");

  let modelPrices = DEFAULT_PRICES;
  if (env["MODEL_PRICES"]?.trim()) {
    try {
      const parsed = JSON.parse(env["MODEL_PRICES"]) as Record<string, { input?: unknown; output?: unknown }>;
      const ok = Object.values(parsed).every((p) => typeof p?.input === "number" && typeof p?.output === "number" && p.input >= 0 && p.output >= 0);
      if (!ok) throw new Error("shape");
      modelPrices = { ...DEFAULT_PRICES, ...(parsed as Config["modelPrices"]) };
    } catch {
      problems.push('MODEL_PRICES must be JSON like {"model-id":{"input":1,"output":5}} (US dollars per million tokens)');
    }
  }

  return {
    config: {
      nodeEnv,
      databaseUrl,
      requireDatabase,
      opsToken,
      modelKeyPresent,
      limits: {
        rateLimitMax: positive("RATE_LIMIT_MAX", 20),
        rateLimitWindowMs: positive("RATE_LIMIT_WINDOW_MINUTES", 10, { integer: false }) * 60_000,
        maxConcurrent: positive("BRIEF_MAX_CONCURRENT", 4),
        dailyBudget: positive("BRIEF_DAILY_BUDGET", 300),
        cacheTtlMs: positive("BRIEF_CACHE_TTL_MINUTES", 360, { integer: false }) * 60_000,
        cacheMaxEntries: positive("BRIEF_CACHE_MAX_ENTRIES", 200),
      },
      modelPrices,
    },
    problems,
    warnings,
  };
}
