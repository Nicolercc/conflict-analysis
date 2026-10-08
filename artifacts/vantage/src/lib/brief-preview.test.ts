import { describe, expect, it } from "vitest";
import { clip, coverageLine, escapeHtml, isBriefId, previewHtml, previewMeta, type PreviewBrief } from "./brief-preview";

const ORIGIN = "https://vantage.example";
const brief = (over: Partial<PreviewBrief> = {}): PreviewBrief => ({
	id: "abcDEF123_-x",
	headline: "Aid access to El Fasher remains blocked amid fighting",
	summary: "Fighting continues around El Fasher. Aid agencies report deliveries turned back.",
	generatedAt: "2026-10-08T10:00:00.000Z",
	inScope: true,
	sources: [
		{ kind: "news", publisher: "UN News" },
		{ kind: "news", publisher: "UN News" },
		{ kind: "news", publisher: "Al Jazeera" },
		{ kind: "reference", publisher: "Wikipedia" },
	],
	...over,
});

describe("preview for a shared brief", () => {
	it("uses the brief's headline, a labelled description and its own image", () => {
		const m = previewMeta(brief(), ORIGIN, "/brief/abcDEF123_-x");
		expect(m.title).toBe("Aid access to El Fasher remains blocked amid fighting · Vantage");
		expect(m.description).toMatch(/^AI-generated brief · 3 articles from 2 outlets\. Fighting continues/);
		expect(m.image).toBe("https://vantage.example/api/og?id=abcDEF123_-x");
		expect(m.url).toBe("https://vantage.example/brief/abcDEF123_-x");
	});

	it("says so when nothing was retrieved", () => {
		expect(coverageLine(brief({ sources: [{ kind: "reference", publisher: "Wikipedia" }] }))).toBe("No recent coverage retrieved");
		expect(coverageLine(brief({ sources: [{ kind: "news", publisher: "BBC News" }] }))).toBe("1 article from 1 outlet");
	});

	it("falls back to the site's own preview when the brief is missing or out of scope", () => {
		for (const b of [null, brief({ inScope: false }), brief({ headline: "  " })]) {
			const m = previewMeta(b, ORIGIN, "/brief/x");
			expect(m.title).toBe("Vantage — conflict, in context");
			expect(m.image).toBe("https://vantage.example/og-default.png");
		}
	});

	it("keeps long text within what preview cards show", () => {
		const long = brief({ headline: "Word ".repeat(60), summary: "Sentence here. ".repeat(60) });
		const m = previewMeta(long, ORIGIN, "/brief/x");
		expect(m.title.length).toBeLessThanOrEqual(100);
		expect(m.description.length).toBeLessThanOrEqual(200);
		expect(clip("short", 20)).toBe("short");
		expect(clip("one two three four five", 12)).toMatch(/…$/);
	});

	it("escapes model-written text so it cannot inject markup", () => {
		const html = previewHtml(
			brief({ headline: `"><script>alert(1)</script>`, summary: `</title><img src=x onerror=alert(1)> & 'quotes'` }),
			ORIGIN,
			"/brief/abcDEF123_-x",
		);
		expect(html).not.toMatch(/<script|<img|onerror=alert\(1\)>/);
		expect(html).toContain("&lt;script&gt;");
		expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
	});

	it("produces a page with the tags crawlers read and no script", () => {
		const html = previewHtml(brief(), ORIGIN, "/brief/abcDEF123_-x");
		for (const tag of ['property="og:title"', 'property="og:description"', 'property="og:image"', 'property="og:url"', 'name="twitter:card" content="summary_large_image"', 'rel="canonical"', 'property="article:published_time"']) {
			expect(html).toContain(tag);
		}
		expect(html).not.toContain("<script");
	});

	it("accepts only well-formed brief ids", () => {
		expect(isBriefId("abcDEF123_-x")).toBe(true);
		for (const bad of ["short", "../../etc/passwd", "a".repeat(40), "has space 12", ""]) expect(isBriefId(bad)).toBe(false);
	});
});
