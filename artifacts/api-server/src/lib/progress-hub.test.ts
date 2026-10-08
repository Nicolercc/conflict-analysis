import { describe, expect, it } from "vitest";
import { ProgressHub } from "./progress-hub";

describe("ProgressHub", () => {
  it("delivers events to a listener that subscribed before the work started", () => {
    const hub = new ProgressHub<string>();
    const seen: string[] = [];
    hub.subscribe("k", (e) => seen.push(e));
    hub.open("k");
    hub.publish("k", "a");
    hub.publish("k", "b");
    expect(seen).toEqual(["a", "b"]);
  });

  it("replays what a late listener missed, then keeps delivering", () => {
    const hub = new ProgressHub<string>();
    hub.open("k");
    hub.publish("k", "a");
    const seen: string[] = [];
    hub.subscribe("k", (e) => seen.push(e));
    hub.publish("k", "b");
    expect(seen).toEqual(["a", "b"]);
  });

  it("stops delivering after unsubscribe and keeps keys apart", () => {
    const hub = new ProgressHub<string>();
    hub.open("k");
    const seen: string[] = [];
    const stop = hub.subscribe("k", (e) => seen.push(e));
    hub.publish("other", "x");
    stop();
    hub.publish("k", "a");
    expect(seen).toEqual([]);
  });

  it("leaves nothing behind once work settles or a cached answer needed no work", () => {
    const hub = new ProgressHub<string>();
    hub.subscribe("cached", () => {})();
    expect(hub.size).toBe(0);
    const stop = hub.subscribe("k", () => {});
    hub.open("k");
    hub.close("k");
    stop();
    expect(hub.size).toBe(0);
  });
});
