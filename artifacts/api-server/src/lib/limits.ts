import { AppError } from "./errors";

type Clock = () => number;

/** Fixed-window request counter per client. */
export class RateLimiter {
  private windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: Clock = Date.now,
  ) {}

  /** Throws RATE_LIMITED once a client exceeds `max` requests in the window. */
  take(key: string) {
    const t = this.now();
    let w = this.windows.get(key);
    if (!w || t - w.start >= this.windowMs) {
      if (this.windows.size > 10_000) this.prune(t);
      w = { start: t, count: 0 };
      this.windows.set(key, w);
    }
    w.count += 1;
    if (w.count > this.max) {
      throw new AppError(429, "RATE_LIMITED", "Too many requests. Please wait a few minutes and try again.", {
        retryAfterSec: Math.max(1, Math.ceil((w.start + this.windowMs - t) / 1000)),
      });
    }
  }

  private prune(t: number) {
    for (const [k, w] of this.windows) {
      if (t - w.start >= this.windowMs) this.windows.delete(k);
    }
  }

  reset() {
    this.windows.clear();
  }
}

/**
 * Bounds what the public can make the service spend: how many briefs may be
 * generating at once, and how many may be generated per UTC day.
 */
export class GenerationGate {
  private active = 0;
  private day = "";
  private usedToday = 0;

  constructor(
    private readonly maxConcurrent: number,
    private readonly dailyBudget: number,
    private readonly now: Clock = Date.now,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const today = new Date(this.now()).toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.usedToday = 0;
    }
    if (this.usedToday >= this.dailyBudget) {
      throw new AppError(503, "OVERLOADED", "Vantage has reached today's limit for new briefs. Previously generated briefs still load.", { retryAfterSec: 3600 });
    }
    if (this.active >= this.maxConcurrent) {
      throw new AppError(503, "OVERLOADED", "Vantage is busy generating other briefs. Please try again in a moment.", { retryAfterSec: 20 });
    }
    this.active += 1;
    this.usedToday += 1;
    try {
      return await work();
    } finally {
      this.active -= 1;
    }
  }

  reset() {
    this.active = 0;
    this.day = "";
    this.usedToday = 0;
  }
}
