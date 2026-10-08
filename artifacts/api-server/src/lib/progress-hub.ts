/**
 * Lets every request waiting on the same piece of work watch its progress.
 * The first request for a brief starts it; later ones join. A listener is
 * first given whatever it missed, whether it arrived before the work began
 * reporting or part-way through.
 */
export class ProgressHub<E> {
  private topics = new Map<string, { past: E[]; listeners: Set<(e: E) => void>; working: boolean }>();

  private topic(key: string) {
    let topic = this.topics.get(key);
    if (!topic) {
      topic = { past: [], listeners: new Set(), working: false };
      this.topics.set(key, topic);
    }
    return topic;
  }

  /** Mark work on a key as started. Call `close` when it settles. */
  open(key: string) {
    this.topic(key).working = true;
  }

  publish(key: string, event: E) {
    const topic = this.topics.get(key);
    if (!topic) return;
    topic.past.push(event);
    for (const listener of topic.listeners) listener(event);
  }

  /** The work has settled: nothing more will be published for this key. */
  close(key: string) {
    this.topics.delete(key);
  }

  /** Receive past and future events for a key until `unsubscribe` is called. */
  subscribe(key: string, listener: (e: E) => void): () => void {
    const topic = this.topic(key);
    for (const event of topic.past) listener(event);
    topic.listeners.add(listener);
    return () => {
      topic.listeners.delete(listener);
      // Nothing was ever started for this key (the answer came from cache): leave no trace.
      if (!topic.working && topic.listeners.size === 0 && this.topics.get(key) === topic) this.topics.delete(key);
    };
  }

  get size() {
    return this.topics.size;
  }
}
