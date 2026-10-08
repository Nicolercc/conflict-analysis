/**
 * The page a link-preview crawler is given for /brief/<id>. Crawlers do not
 * run the app's JavaScript, so without this every shared brief would preview
 * as a bare address. Nothing here touches the browser: it runs in a server
 * function and is covered by tests.
 */
export type PreviewBrief = {
	id: string;
	headline: string;
	summary: string;
	generatedAt: string;
	inScope?: boolean;
	location?: { city?: string; country?: string; region?: string };
	sources?: Array<{ kind?: string; publisher?: string }>;
};

export const SITE_NAME = "Vantage";
export const DEFAULT_TITLE = "Vantage — conflict, in context";
export const DEFAULT_DESCRIPTION =
	"Search a conflict or paste an article. Vantage retrieves current reporting and writes a brief whose key facts link back to their sources.";

export const isBriefId = (value: string) => /^[A-Za-z0-9_-]{10,32}$/.test(value);

/** Everything a brief says came from a model or the open web: escape all of it. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function clip(text: string, max: number): string {
	const clean = text.replace(/\s+/g, " ").trim();
	if (clean.length <= max) return clean;
	const cut = clean.slice(0, max - 1);
	return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[\s,;:.]+$/, "")}…`;
}

/** "9 articles from 7 outlets", or an honest line when nothing was retrieved. */
export function coverageLine(brief: PreviewBrief): string {
	const news = (brief.sources ?? []).filter((s) => s.kind === "news");
	if (news.length === 0) return "No recent coverage retrieved";
	const outlets = new Set(news.map((s) => s.publisher)).size;
	return `${news.length} ${news.length === 1 ? "article" : "articles"} from ${outlets} ${outlets === 1 ? "outlet" : "outlets"}`;
}

export function previewMeta(brief: PreviewBrief | null, origin: string, path: string) {
	const usable = brief && brief.inScope !== false && brief.headline?.trim();
	const title = usable ? `${clip(brief.headline, 90)} · ${SITE_NAME}` : DEFAULT_TITLE;
	const description = usable
		? clip(`AI-generated brief · ${coverageLine(brief)}. ${brief.summary}`, 200)
		: DEFAULT_DESCRIPTION;
	const image = usable ? `${origin}/api/og?id=${encodeURIComponent(brief.id)}` : `${origin}/og-default.png`;
	return { title, description, image, url: `${origin}${path}`, isBrief: Boolean(usable) };
}

/** A complete, script-free HTML page carrying the preview tags and a readable fallback. */
export function previewHtml(brief: PreviewBrief | null, origin: string, path: string): string {
	const m = previewMeta(brief, origin, path);
	const e = escapeHtml;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(m.title)}</title>
<meta name="description" content="${e(m.description)}">
<link rel="canonical" href="${e(m.url)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="${m.isBrief ? "article" : "website"}">
<meta property="og:title" content="${e(m.title)}">
<meta property="og:description" content="${e(m.description)}">
<meta property="og:url" content="${e(m.url)}">
<meta property="og:image" content="${e(m.image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${m.isBrief && brief ? `<meta property="article:published_time" content="${e(brief.generatedAt)}">\n` : ""}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(m.title)}">
<meta name="twitter:description" content="${e(m.description)}">
<meta name="twitter:image" content="${e(m.image)}">
</head>
<body>
<h1>${e(m.title)}</h1>
<p>${e(m.description)}</p>
<p><a href="${e(m.url)}">Open this brief on ${SITE_NAME}</a></p>
</body>
</html>
`;
}
