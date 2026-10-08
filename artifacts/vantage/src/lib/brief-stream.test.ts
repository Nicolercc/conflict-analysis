import { afterEach, describe, expect, it, vi } from "vitest";
import { BriefError, streamBrief, takeEvents, type BriefStreamEvent } from "./brief-stream";

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** A response whose body arrives in the given chunks. */
function streamed(chunks: string[], init: ResponseInit = { status: 200 }) {
	const encoder = new TextEncoder();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
	return new Response(body, init);
}

afterEach(() => vi.unstubAllGlobals());

describe("takeEvents", () => {
	it("returns complete events and keeps an unfinished one for later", () => {
		const { events, rest } = takeEvents(`${sse("stage", { stage: "writing" })}: waiting\n\nevent: brief\ndata: {"id"`);
		expect(events).toEqual([{ event: "stage", data: '{"stage":"writing"}' }]);
		expect(rest).toBe('event: brief\ndata: {"id"');
	});
});

describe("streamBrief", () => {
	it("reports progress in order and resolves with the brief, even when events are split across chunks", async () => {
		const whole =
			sse("stage", { stage: "retrieving" }) +
			sse("sources", { sources: [{ id: "S1", publisher: "UN News" }], retrieval: [] }) +
			sse("stage", { stage: "writing" }) +
			sse("brief", { id: "abcdefghijkl", headline: "H" });
		const cut = Math.floor(whole.length / 2);
		const fetchMock = vi.fn(async () => streamed([whole.slice(0, 7), whole.slice(7, cut), whole.slice(cut)]));
		vi.stubGlobal("fetch", fetchMock);

		const seen: BriefStreamEvent[] = [];
		const brief = await streamBrief({ kind: "topic", topic: "Sudan" }, (e) => seen.push(e));
		expect(brief.id).toBe("abcdefghijkl");
		expect(seen.map((e) => (e.type === "stage" ? e.stage : e.type))).toEqual(["retrieving", "sources", "writing", "brief"]);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("/api/intelligence/stream");
		expect(JSON.parse(String(init.body))).toEqual({ topic: "Sudan" });
	});

	it("sends a link or pasted text under the right field", async () => {
		const fetchMock = vi.fn(async () => streamed([sse("brief", { id: "abcdefghijkl" })]));
		vi.stubGlobal("fetch", fetchMock);
		await streamBrief({ kind: "url", url: "https://example.org/a" }, () => {});
		await streamBrief({ kind: "article", text: "pasted" }, () => {});
		const bodies = fetchMock.mock.calls.map((c) => JSON.parse(String((c as unknown as [string, RequestInit])[1].body)));
		expect(bodies).toEqual([{ url: "https://example.org/a" }, { article: "pasted" }]);
	});

	it("rejects with the server's wording when the request is refused before streaming", async () => {
		vi.stubGlobal("fetch", vi.fn(async () =>
			new Response(JSON.stringify({ error: "RATE_LIMITED", message: "Too many requests." }), { status: 429, headers: { "content-type": "application/json" } }),
		));
		await expect(streamBrief({ kind: "topic", topic: "Sudan" }, () => {})).rejects.toMatchObject({ message: "Too many requests.", code: "RATE_LIMITED" });
	});

	it("rejects with the server's wording when generation fails mid-stream", async () => {
		vi.stubGlobal("fetch", vi.fn(async () =>
			streamed([sse("stage", { stage: "writing" }), sse("error", { error: "PROVIDER_UNAVAILABLE", message: "Unavailable right now." })]),
		));
		await expect(streamBrief({ kind: "topic", topic: "Sudan" }, () => {})).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE", message: "Unavailable right now." });
	});

	it("says so when the connection drops before the brief, or never opens", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => streamed([sse("stage", { stage: "writing" })])));
		await expect(streamBrief({ kind: "topic", topic: "Sudan" }, () => {})).rejects.toBeInstanceOf(BriefError);
		vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
		await expect(streamBrief({ kind: "topic", topic: "Sudan" }, () => {})).rejects.toMatchObject({ code: "NETWORK" });
	});
});
