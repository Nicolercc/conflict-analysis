import { ImageResponse } from "@vercel/og";
import { clip, coverageLine, SITE_NAME, type PreviewBrief } from "../src/lib/brief-preview";
import { loadBrief } from "./_brief";

export const config = { runtime: "edge" };

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
	type,
	props: { style: { display: "flex", ...style }, children },
});

/** The card shown when a brief's link is shared: its headline, where and when, and what it rests on. */
function card(brief: PreviewBrief | null): Node {
	const usable = brief && brief.inScope !== false && brief.headline?.trim();
	const place = usable ? [brief.location?.city, brief.location?.country].filter(Boolean).join(", ") : "";
	const date = usable ? new Date(brief.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
	return el(
		"div",
		{ width: "100%", height: "100%", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#f6f3ee", color: "#14181f", fontFamily: "sans-serif" },
		[
			el("div", { alignItems: "baseline", justifyContent: "space-between" }, [
				el("div", { fontSize: 38, fontWeight: 700, letterSpacing: "-0.01em" }, SITE_NAME),
				el("div", { fontSize: 22, color: "#6b6561", letterSpacing: "0.12em" }, "CONFLICT, IN CONTEXT"),
			]),
			el("div", { flexDirection: "column" }, [
				usable && place ? el("div", { fontSize: 24, color: "#2b4c7e", letterSpacing: "0.1em", marginBottom: 18 }, place.toUpperCase()) : null,
				el(
					"div",
					{ fontSize: usable && brief.headline.length > 70 ? 54 : 64, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.02em" },
					usable ? clip(brief.headline, 120) : "See the full story behind the headline.",
				),
			]),
			el("div", { alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #d9d3ca", paddingTop: 24, fontSize: 24, color: "#4a4540" }, [
				el("div", {}, usable ? `AI-generated brief · ${coverageLine(brief)}` : "Briefs whose key facts link back to their sources"),
				el("div", { color: "#6b6561" }, date),
			]),
		],
	);
}

export default async function handler(request: Request): Promise<Response> {
	const brief = await loadBrief(new URL(request.url).searchParams.get("id"));
	return new ImageResponse(card(brief) as never, {
		width: 1200,
		height: 630,
		headers: { "Cache-Control": brief ? "public, max-age=86400, s-maxage=604800, immutable" : "public, max-age=300" },
	});
}
