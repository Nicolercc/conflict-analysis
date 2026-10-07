type Clock = () => number;

/**
 * Bounded cache with expiry, plus in-flight sharing: concurrent requests for
 * the same key wait on one piece of work instead of each starting their own.
 * Failures are never stored.
 */
export class BriefCache<T> {
  private entries = new Map<string, { value: T; expires: number }>();
  private inflight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: Clock = Date.now,
  ) {}

  get(key: string): T | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (hit.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Re-insert so the least recently used entry is the first to be evicted.
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit.value;
  }

  set(key: string, value: T) {
    this.entries.delete(key);
    this.entries.set(key, { value, expires: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  getOrCreate(key: string, make: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return Promise.resolve(cached);
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const work = make()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, work);
    return work;
  }

  get size() {
    return this.entries.size;
  }

  reset() {
    this.entries.clear();
    this.inflight.clear();
  }
}
