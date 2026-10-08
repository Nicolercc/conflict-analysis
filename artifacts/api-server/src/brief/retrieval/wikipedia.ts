import { truncate, type ProviderResult } from "../sources";

const PROVIDER = "Wikipedia";
const TIMEOUT_MS = 6_000;
// Wikimedia asks every client to identify itself and throttles those that do not.
const HEADERS = { "User-Agent": process.env["GEOCODER_USER_AGENT"] ?? "Vantage/1.0 (+https://conflict-analysis-vantage.vercel.app)" };

/** Background reference: the lead extract of the best-matching article. */
export async function searchWikipedia(topic: string): Promise<ProviderResult> {
  const failed: ProviderResult = { provider: PROVIDER, status: "failed", candidates: [] };
  const empty: ProviderResult = { provider: PROVIDER, status: "empty", candidates: [] };
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=1`;
    const searchRes = await fetch(searchUrl, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!searchRes.ok) return failed;
    const searchData = (await searchRes.json()) as { query?: { search?: Array<{ title?: string }> } };
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return empty;

    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!summaryRes.ok) return failed;
    const data = (await summaryRes.json()) as {
      extract?: string;
      timestamp?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    const extract = data.extract?.slice(0, 2000).trim();
    if (!extract) return empty;
    return {
      provider: PROVIDER,
      status: "ok",
      candidates: [
        {
          kind: "reference",
          provider: PROVIDER,
          publisher: "Wikipedia",
          title,
          url:
            data.content_urls?.desktop?.page ??
            `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
          // Wikipedia reports when the page was last edited, not when it was published.
          publishedAt: null,
          language: "English",
          country: null,
          excerpt: truncate(extract, 320),
          text: extract,
        },
      ],
    };
  } catch {
    return failed;
  }
}
