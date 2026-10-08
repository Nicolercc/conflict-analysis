import { isBriefId } from "./_preview.js";

/** Where the API lives. Set VITE_API_BASE_URL on the hosting project to change it. */
const API_BASE = (process.env.VITE_API_BASE_URL || "https://conflict-analysis.onrender.com").replace(/\/$/, "");

/**
 * A saved brief, or null when it does not exist or the API does not answer in time.
 * @param {string | null} id
 * @returns {Promise<import("./_preview.js").PreviewBrief | null>}
 */
export async function loadBrief(id) {
	if (!id || !isBriefId(id)) return null;
	try {
		const res = await fetch(`${API_BASE}/api/briefs/${id}`, { signal: AbortSignal.timeout(6_000) });
		if (!res.ok) return null;
		return await res.json();
	} catch {
		// A sleeping or unreachable API must not break the preview: fall back to the site's own.
		return null;
	}
}
