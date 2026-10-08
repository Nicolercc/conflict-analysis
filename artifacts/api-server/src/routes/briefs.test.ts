import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { modelBrief, modelText, resetBriefState, stubRetrieval } from "../test/harness";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@workspace/integrations-anthropic-ai", () => ({
  anthropic: { messages: { create } },
}));

import app from "../app";

const ARTICLE =
  "Fighting continued around El Fasher on Monday. Aid agencies in Sudan said twelve trucks were turned back and residents described shortages of food and medicine across the city.";

type Event = { event: string; data: Record<string, unknown> };

/** Read a whole event stream into its events. */
function parseEvents(text: string): Event[] {
  return text
    .split("\n\n")
    .map((block) => {
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      return event && data ? { event, data: JSON.parse(data) } : null;
    })
    .filter((e): e is Event => e !== null);
}

const stream = (body: unknown) => request(app).post("/api/intelligence/stream").send(body as object);

beforeEach(() => {
  create.mockReset();
  resetBriefState(app);
  stubRetrieval();
  create.mockImplementation(async () => modelText(JSON.stringify(modelBrief())));
});

describe("stored briefs", () => {
  it("gives every brief an id and returns the same brief by that id", async () => {
    const made = await request(app).post("/api/intelligence/explore").send({ topic: "Sudan humanitarian access" });
    expect(made.status).toBe(200);
    expect(made.body.id).toMatch(/^[A-Za-z0-9_-]{12}$/);

    const read = await request(app).get(`/api/briefs/${made.body.id}`);
    expect(read.status).toBe(200);
    expect(read.body).toEqual(made.body);
    expect(read.headers["cache-control"]).toMatch(/max-age=300/);
    // reading a brief never calls the model
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("ignores an id the model writes", async () => {
    create.mockImplementation(async () => modelText(JSON.stringify({ ...modelBrief(), id: "chosen-by-model" })));
    const made = await request(app).post("/api/intelligence/explore").send({ topic: "Sudan humanitarian access" });
    expect(made.body.id).not.toBe("chosen-by-model");
  });

  it("answers 404 for an unknown or malformed id", async () => {
    for (const id of ["AAAAAAAAAAAA", "short", "..%2F..%2Fetc%2Fpasswd", "a".repeat(64)]) {
      const res = await request(app).get(`/api/briefs/${id}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    }
  });

  it("serves the stored brief after this process's cache is emptied", async () => {
    const first = await request(app).post("/api/intelligence/explore").send({ topic: "Sudan humanitarian access" });
    (app.locals["briefs"] as { cache: { reset: () => void } }).cache.reset();
    const second = await request(app).post("/api/intelligence/explore").send({ topic: "Sudan humanitarian access" });
    expect(second.body.id).toBe(first.body.id);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("does not store the reader's pasted text with the brief", async () => {
    const made = await request(app).post("/api/intelligence/analyze").send({ article: ARTICLE });
    const read = await request(app).get(`/api/briefs/${made.body.id}`);
    expect(JSON.stringify(read.body)).not.toContain("twelve trucks were turned back");
  });
});

describe("POST /api/intelligence/stream", () => {
  it("reports stages and sources, then the brief", async () => {
    const res = await stream({ topic: "Sudan humanitarian access" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    const events = parseEvents(res.text);
    expect(events.map((e) => (e.event === "stage" ? `stage:${e.data["stage"]}` : e.event))).toEqual([
      "stage:retrieving",
      "sources",
      "stage:writing",
      "stage:locating",
      "brief",
    ]);
    const sources = events[1]!.data["sources"] as Array<Record<string, unknown>>;
    expect(sources.length).toBeGreaterThan(0);
    // the server-only text never leaves the server
    expect(sources.every((s) => !("text" in s))).toBe(true);
    const brief = events.at(-1)!.data;
    expect(brief["id"]).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect((await request(app).get(`/api/briefs/${brief["id"]}`)).body).toEqual(brief);
  });

  it("sends a cached brief as a single event without calling the model again", async () => {
    await stream({ topic: "Sudan humanitarian access" });
    const again = await stream({ topic: "Sudan humanitarian access" });
    expect(parseEvents(again.text).map((e) => e.event)).toEqual(["brief"]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("accepts pasted article text", async () => {
    const res = await stream({ article: ARTICLE });
    const events = parseEvents(res.text);
    expect(events.at(-1)?.event).toBe("brief");
  });

  it("refuses bad input before the stream starts, as ordinary JSON", async () => {
    for (const body of [{}, { topic: "ab" }, { topic: "Sudan", url: "https://example.org/a" }, { url: "ftp://example.org/a" }]) {
      const res = await stream(body);
      expect(res.status).toBe(400);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body.error).toBe("INVALID_INPUT");
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("ends with an error event when generation fails after the stream has started", async () => {
    create.mockImplementation(async () => {
      throw new Error('400 {"error":{"message":"This organization has been disabled."},"request_id":"req_secret"}');
    });
    const res = await stream({ topic: "Sudan humanitarian access" });
    expect(res.status).toBe(200);
    const last = parseEvents(res.text).at(-1)!;
    expect(last.event).toBe("error");
    expect(last.data["error"]).toBe("PROVIDER_UNAVAILABLE");
    expect(typeof last.data["requestId"]).toBe("string");
    expect(res.text).not.toMatch(/organization|req_secret/);
  });

  it("lets two readers of the same brief share one generation, and both see the sources", async () => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    create.mockImplementation(async () => {
      await held;
      return modelText(JSON.stringify(modelBrief()));
    });
    const first = stream({ topic: "Sudan humanitarian access" }).then((r) => r);
    await new Promise((r) => setTimeout(r, 60));
    const second = stream({ topic: "Sudan humanitarian access" }).then((r) => r);
    await new Promise((r) => setTimeout(r, 60));
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(create).toHaveBeenCalledTimes(1);
    for (const res of [a, b]) {
      const names = parseEvents(res.text).map((e) => e.event);
      expect(names).toContain("sources");
      expect(names.at(-1)).toBe("brief");
    }
    expect(parseEvents(a.text).at(-1)!.data["id"]).toBe(parseEvents(b.text).at(-1)!.data["id"]);
  });

  it("counts against the rate limit", async () => {
    // The limit is taken before the body is read, so refused requests count too.
    for (let i = 0; i < 20; i++) await stream({});
    const res = await stream({ topic: "Sudan humanitarian access" });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("RATE_LIMITED");
    expect(create).not.toHaveBeenCalled();
  });
});
