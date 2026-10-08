import type {
	ErrorResponse,
	IntelligenceBrief,
	RetrievalStatus,
	Source,
} from "@workspace/api-client-react";
import type { BriefRequest } from "./brief-request";

export type BriefStage = "retrieving" | "writing" | "locating";

export type BriefStreamEvent =
	| { type: "stage"; stage: BriefStage }
	| { type: "sources"; sources: Source[]; retrieval: RetrievalStatus[] }
	| { type: "brief"; brief: IntelligenceBrief };

/** A failure with wording that is safe to show the reader. */
export class BriefError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message);
		this.name = "BriefError";
	}
}

const FALLBACK = "We couldn't generate this brief. Please try again.";

function requestBody(request: BriefRequest) {
	if (request.kind === "topic") return { topic: request.topic };
	if (request.kind === "url") return { url: request.url };
	return { article: request.text };
}

/** Split a growing buffer into complete server-sent events; the tail is kept for the next chunk. */
export function takeEvents(buffer: string): {
	events: Array<{ event: string; data: string }>;
	rest: string;
} {
	const blocks = buffer.split("\n\n");
	const rest = blocks.pop() ?? "";
	const events: Array<{ event: string; data: string }> = [];
	for (const block of blocks) {
		let event = "";
		const data: string[] = [];
		for (const line of block.split("\n")) {
			if (line.startsWith("event:")) event = line.slice(6).trim();
			else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
			// lines starting with ":" are keep-alive comments
		}
		if (event && data.length > 0) events.push({ event, data: data.join("\n") });
	}
	return { events, rest };
}

function toEvent(event: string, data: string): BriefStreamEvent | BriefError | null {
	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(data);
	} catch {
		return null;
	}
	if (event === "stage") return { type: "stage", stage: parsed["stage"] as BriefStage };
	if (event === "sources") {
		return {
			type: "sources",
			sources: (parsed["sources"] ?? []) as Source[],
			retrieval: (parsed["retrieval"] ?? []) as RetrievalStatus[],
		};
	}
	if (event === "brief") return { type: "brief", brief: parsed as unknown as IntelligenceBrief };
	if (event === "error") {
		const err = parsed as Partial<ErrorResponse>;
		return new BriefError(err.message || FALLBACK, err.error || "INTERNAL");
	}
	return null;
}

/**
 * Ask for a brief and report progress as the server sends it. Resolves with
 * the brief; rejects with a BriefError whose message can be shown as is.
 */
export async function streamBrief(
	request: BriefRequest,
	onEvent: (event: BriefStreamEvent) => void,
	signal?: AbortSignal,
): Promise<IntelligenceBrief> {
	const base = import.meta.env.VITE_API_BASE_URL || "";
	let res: Response;
	try {
		res = await fetch(`${base}/api/intelligence/stream`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
			body: JSON.stringify(requestBody(request)),
			signal,
		});
	} catch (err) {
		if (signal?.aborted) throw err;
		throw new BriefError(
			"We couldn't reach the server. Check your connection and try again.",
			"NETWORK",
		);
	}

	if (!res.ok || !res.body) {
		// Refused before the stream started: the usual JSON error body.
		const body = (await res.json().catch(() => null)) as Partial<ErrorResponse> | null;
		throw new BriefError(body?.message || FALLBACK, body?.error || "INTERNAL");
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	for (;;) {
		const { done, value } = await reader.read();
		buffer += decoder.decode(value, { stream: !done });
		const { events, rest } = takeEvents(done ? `${buffer}\n\n` : buffer);
		buffer = rest;
		for (const raw of events) {
			const event = toEvent(raw.event, raw.data);
			if (event instanceof BriefError) throw event;
			if (!event) continue;
			onEvent(event);
			if (event.type === "brief") return event.brief;
		}
		if (done) break;
	}
	throw new BriefError("The connection closed before the brief arrived. Please try again.", "INCOMPLETE");
}
