import { previewHtml } from "./_preview.js";
import { loadBrief } from "./_brief.js";

export const config = { runtime: "edge" };

/**
 * /brief/<id> as link-preview crawlers see it (vercel.json sends only them
 * here). People get the app itself; this page has the same address, the
 * brief's headline and summary as preview tags, and no script.
 * @param {Request} request
 */
export default async function handler(request) {
	const url = new URL(request.url);
	const id = url.searchParams.get("id");
	const brief = await loadBrief(id);
	const path = id ? `/brief/${encodeURIComponent(id)}` : "/";
	return new Response(previewHtml(brief, url.origin, path), {
		status: 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			// A saved brief never changes; a miss is retried sooner in case the API was asleep.
			"Cache-Control": brief ? "public, max-age=3600, s-maxage=86400" : "public, max-age=60",
		},
	});
}
