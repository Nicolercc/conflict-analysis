/**
 * What the reader asked for. Topics and links travel in the URL so a brief
 * can be shared or reloaded; pasted article text never does — it stays in
 * this tab and is looked up by a short id.
 */
export type BriefRequest =
	| { kind: "topic"; topic: string }
	| { kind: "url"; url: string }
	| { kind: "article"; text: string };

export const TOPIC_MAX = 240;
export const ARTICLE_MIN = 50;
export const ARTICLE_MAX = 20_000;

const STORE_PREFIX = "vantage:article:";
const memory = new Map<string, string>();

export function looksLikeUrl(value: string): boolean {
	return /^https?:\/\/\S+\.\S+/i.test(value.trim());
}

function stashArticle(text: string): string {
	const id = Math.random().toString(36).slice(2, 10);
	memory.set(id, text);
	try {
		sessionStorage.setItem(STORE_PREFIX + id, text);
	} catch {
		/* storage unavailable: the in-memory copy still serves this page load */
	}
	return id;
}

function readArticle(id: string): string | null {
	const held = memory.get(id);
	if (held) return held;
	try {
		return sessionStorage.getItem(STORE_PREFIX + id);
	} catch {
		return null;
	}
}

/** Path to the brief page for a request. */
export function briefPath(request: BriefRequest): string {
	if (request.kind === "topic") {
		return `/analysis?topic=${encodeURIComponent(request.topic)}`;
	}
	if (request.kind === "url") {
		return `/analysis?url=${encodeURIComponent(request.url)}`;
	}
	return `/analysis?article=${stashArticle(request.text)}`;
}

/** Null when the query string names nothing usable (including pasted text that is no longer in this tab). */
export function parseBriefRequest(search: string): BriefRequest | null {
	const params = new URLSearchParams(search);
	const topic = params.get("topic")?.trim();
	if (topic) return { kind: "topic", topic };
	const url = params.get("url")?.trim();
	if (url && looksLikeUrl(url)) return { kind: "url", url };
	const articleId = params.get("article");
	if (articleId) {
		const text = readArticle(articleId);
		if (text) return { kind: "article", text };
	}
	return null;
}

/** A human-readable problem with the input, or null when it can be sent. */
export function validateBriefInput(
	mode: BriefRequest["kind"],
	raw: string,
): string | null {
	const value = raw.trim();
	if (mode === "topic") {
		if (value.length < 3) return "Enter at least 3 characters.";
		if (value.length > TOPIC_MAX)
			return `Keep the topic under ${TOPIC_MAX} characters, or paste the full text instead.`;
		return null;
	}
	if (mode === "url") {
		if (!looksLikeUrl(value))
			return "Enter a full public link, such as https://example.com/article.";
		if (value.length > 2048) return "That link is too long.";
		return null;
	}
	if (value.length < ARTICLE_MIN)
		return `Paste at least ${ARTICLE_MIN} characters of the article.`;
	if (value.length > ARTICLE_MAX)
		return `That is ${value.length.toLocaleString()} characters. Trim it to ${ARTICLE_MAX.toLocaleString()} or fewer.`;
	return null;
}
