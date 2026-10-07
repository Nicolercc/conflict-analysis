import { describe, expect, it } from "vitest";
import {
	briefPath,
	looksLikeUrl,
	parseBriefRequest,
	validateBriefInput,
} from "./brief-request";

const search = (path: string) => path.slice(path.indexOf("?"));

describe("input modes", () => {
	it("accepts short country names as topics", () => {
		expect(validateBriefInput("topic", "Iran")).toBeNull();
		expect(validateBriefInput("topic", "Ukraine")).toBeNull();
	});

	it("rejects empty, tiny and oversized topics", () => {
		expect(validateBriefInput("topic", "  a ")).not.toBeNull();
		expect(validateBriefInput("topic", "x".repeat(241))).not.toBeNull();
	});

	it("recognises article links", () => {
		expect(looksLikeUrl("https://www.example.org/world/story-123")).toBe(true);
		expect(looksLikeUrl("Gaza ceasefire")).toBe(false);
		expect(looksLikeUrl("javascript:alert(1)")).toBe(false);
		expect(validateBriefInput("url", "example.org/story")).not.toBeNull();
	});

	it("enforces the pasted-text length the API accepts", () => {
		expect(validateBriefInput("article", "too short")).not.toBeNull();
		expect(validateBriefInput("article", "x".repeat(50))).toBeNull();
		expect(validateBriefInput("article", "x".repeat(20_001))).not.toBeNull();
	});
});

describe("routing", () => {
	it("round-trips a topic and a link through the URL", () => {
		expect(
			parseBriefRequest(search(briefPath({ kind: "topic", topic: "Sudan & Chad" }))),
		).toEqual({ kind: "topic", topic: "Sudan & Chad" });
		const url = "https://example.org/a?b=1&c=2";
		expect(parseBriefRequest(search(briefPath({ kind: "url", url })))).toEqual({
			kind: "url",
			url,
		});
	});

	it("keeps pasted text out of the URL", () => {
		const text = "Private pasted article text. ".repeat(5);
		const path = briefPath({ kind: "article", text });
		expect(path).not.toContain("Private");
		expect(parseBriefRequest(search(path))).toEqual({ kind: "article", text });
	});

	it("returns null for an unknown article id or a non-http link", () => {
		expect(parseBriefRequest("?article=missing")).toBeNull();
		expect(parseBriefRequest("?url=file:///etc/passwd")).toBeNull();
		expect(parseBriefRequest("")).toBeNull();
	});
});
