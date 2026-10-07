import { topicTerms, type Candidate, type ProviderResult } from "../sources";

const PROVIDER = "GDELT";
// GDELT asks for at most one request every five seconds and answers 429 otherwise.
const MIN_GAP_MS = Number(process.env["GDELT_MIN_GAP_MS"] ?? 5_500);
const MAX_QUEUE_WAIT_MS = 6_000;
const TIMEOUT_MS = 10_000;
// After a failure, stop asking for a while: a throttled GDELT takes ~10 s to say no,
// and every brief would otherwise wait on it.
const COOL_OFF_MS = 5 * 60_000;

let nextSlot = 0;
let coolOffUntil = 0;

/** Reserve the next request slot, or return null when the queue is already too long. */
function reserveSlot(now: number): number | null {
  const start = Math.max(now, nextSlot);
  if (start - now > MAX_QUEUE_WAIT_MS) return null;
  nextSlot = start + MIN_GAP_MS;
  return start - now;
}

export function resetGdeltThrottle() {
  nextSlot = 0;
  coolOffUntil = 0;
}

/** "20260910T120000Z" → ISO, or null when the provider's date is unusable. */
export function parseGdeltDate(seen: string | undefined): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(seen ?? "");
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type GdeltArticle = {
  title?: string;
  domain?: string;
  url?: string;
  seendate?: string;
  language?: string;
  sourcecountry?: string;
};

/** Recent coverage in any language, with the outlet's country when GDELT knows it. */
export async function searchGdelt(topic: string): Promise<ProviderResult> {
  const failed: ProviderResult = { provider: PROVIDER, status: "failed", candidates: [] };
  const fail = () => {
    coolOffUntil = Date.now() + COOL_OFF_MS;
    return failed;
  };
  if (Date.now() < coolOffUntil) return failed;
  const terms = topicTerms(topic);
  if (terms.length === 0) return { provider: PROVIDER, status: "empty", candidates: [] };

  const wait = reserveSlot(Date.now());
  if (wait === null) return failed;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  try {
    const query = encodeURIComponent(terms.join(" "));
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=40&format=json&sort=datedesc&timespan=14d`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return fail();
    // GDELT reports query problems as plain text with a 200.
    let data: { articles?: GdeltArticle[] };
    try {
      data = JSON.parse(await res.text());
    } catch {
      return fail();
    }
    const candidates: Candidate[] = (data.articles ?? [])
      .filter((a) => /^https?:\/\//i.test(a.url ?? "") && (a.title ?? "").trim())
      .map((a) => ({
        kind: "news" as const,
        provider: PROVIDER,
        publisher: a.domain || "Unknown outlet",
        title: (a.title ?? "").trim(),
        url: a.url ?? null,
        publishedAt: parseGdeltDate(a.seendate),
        language: a.language || null,
        country: a.sourcecountry || null,
        // GDELT's article list carries headlines only.
        excerpt: null,
      }));
    return { provider: PROVIDER, status: candidates.length ? "ok" : "empty", candidates };
  } catch {
    return fail();
  }
}
