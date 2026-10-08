import { BriefCache } from "./brief-cache";
import { createBriefStore, type StoredBrief } from "./brief-store";
import { GenerationGate, RateLimiter } from "./limits";

const num = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/** Process-wide state for brief generation. Lives on app.locals so tests can reset it. */
export function createBriefState() {
  const cache = new BriefCache<StoredBrief>(num("BRIEF_CACHE_TTL_MINUTES", 360) * 60_000, num("BRIEF_CACHE_MAX_ENTRIES", 200));
  const limiter = new RateLimiter(num("RATE_LIMIT_MAX", 20), num("RATE_LIMIT_WINDOW_MINUTES", 10) * 60_000);
  const gate = new GenerationGate(num("BRIEF_MAX_CONCURRENT", 4), num("BRIEF_DAILY_BUDGET", 300));
  const store = createBriefStore();
  return {
    cache,
    cacheTtlMs: num("BRIEF_CACHE_TTL_MINUTES", 360) * 60_000,
    store,
    limiter,
    gate,
    reset() {
      cache.reset();
      store.reset();
      limiter.reset();
      gate.reset();
    },
  };
}

export type BriefState = ReturnType<typeof createBriefState>;
