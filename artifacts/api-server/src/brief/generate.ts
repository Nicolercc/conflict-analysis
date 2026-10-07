import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ExploreConflictResponse } from "@workspace/api-zod";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { extractJSON, normalizeLatLng, tryExtractJsonFallback } from "./json";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { searchCoverage, type Coverage } from "./retrieval";
import { toPublicSource, type Candidate } from "./sources";
import { checkClaims } from "./support";

const BRIEF_MODEL = process.env["BRIEF_MODEL"] ?? "claude-haiku-4-5-20251001";
/** One retry when the model's answer is unusable; provider errors are not retried here. */
const MAX_GENERATION_ATTEMPTS = 2;

const providerUnavailable = (cause: unknown) =>
  new AppError(502, "PROVIDER_UNAVAILABLE", "The analysis service is unavailable right now. Please try again later.", { cause });

/** One model call, parsed and checked against the evidence and the response contract. */
async function generateOnce(coverage: Coverage, userMessage: string): Promise<object> {
  let message;
  try {
    message = await anthropic.messages.create(
      {
        model: BRIEF_MODEL,
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      },
      { timeout: 60_000, maxRetries: 1 },
    );
  } catch (err) {
    throw providerUnavailable(err);
  }

  const block = message.content[0];
  if (!block || block.type !== "text") throw new Error("model returned no text");

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJSON(block.text) as typeof parsed;
  } catch (parseErr) {
    // Sometimes the model wraps JSON in extra prose — take last ```json block or last { ... }
    const fallback = tryExtractJsonFallback(block.text);
    if (!fallback) throw parseErr;
    parsed = fallback as typeof parsed;
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const rawLoc = (parsed["location"] && typeof parsed["location"] === "object" ? parsed["location"] : {}) as Record<string, unknown>;
  const rawCoverage = (parsed["coverage"] && typeof parsed["coverage"] === "object" ? parsed["coverage"] : {}) as Record<string, unknown>;

  // Claims survive only if every cited id was retrieved and the cited text carries them.
  const keyFacts = checkClaims(parsed["keyFacts"], coverage.sources, 6);
  const agreements = checkClaims(rawCoverage["agreements"], coverage.sources, 3);
  const differences = checkClaims(rawCoverage["differences"], coverage.sources, 3);
  const dropped = [...keyFacts.dropped, ...agreements.dropped, ...differences.dropped];
  if (dropped.length > 0) logger.info({ dropped }, "unsupported claims removed");

  // Provenance fields are set here and never by the model. The schema parse
  // strips anything outside the contract and rejects missing or mistyped fields.
  const candidate = {
    ...parsed,
    generatedAt: new Date().toISOString(),
    inScope: parsed["inScope"] !== false,
    location: {
      city: str(rawLoc["city"]),
      country: str(rawLoc["country"]),
      region: str(rawLoc["region"]),
      ...normalizeLatLng(rawLoc["lat"], rawLoc["lng"]),
    },
    relatedEvents: Array.isArray(parsed["relatedEvents"])
      ? (parsed["relatedEvents"] as Array<Record<string, unknown>>).map((ev) => ({
          ...ev,
          ...normalizeLatLng(ev?.["lat"], ev?.["lng"]),
          searchQuery: str(ev?.["searchQuery"]),
        }))
      : parsed["relatedEvents"],
    keyFacts: keyFacts.kept,
    coverage: { agreements: agreements.kept, differences: differences.kept },
    sources: coverage.sources.map(toPublicSource),
    retrieval: coverage.retrieval,
  };

  const checked = ExploreConflictResponse.safeParse(candidate);
  if (!checked.success) {
    throw new Error(`brief failed contract: ${checked.error.issues.slice(0, 5).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  if (!checked.data.headline.trim() || !checked.data.summary.trim()) {
    throw new Error("brief has an empty headline or summary");
  }
  return checked.data;
}

export type BriefInput = {
  /** Search terms for retrieval. */
  topic: string;
  /** The article the reader supplied, when there is one. */
  article?: { text: string; url: string | null };
};

export async function buildBrief(input: BriefInput): Promise<object> {
  const supplied: Candidate | undefined = input.article && {
    kind: "article",
    provider: "Reader",
    publisher: input.article.url ? new URL(input.article.url).hostname.replace(/^www\./, "") : "Pasted text",
    title: input.article.url ? "Article supplied by link" : "Article supplied as text",
    url: input.article.url,
    publishedAt: null,
    language: null,
    country: null,
    // The reader's text is not echoed back; it is only used for analysis and support checks.
    excerpt: null,
    text: input.article.text,
  };

  const coverage = await searchCoverage(input.topic, supplied);
  const userMessage = buildUserMessage(coverage.sources, { topic: input.topic, hasArticle: Boolean(supplied) });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      return await generateOnce(coverage, userMessage);
    } catch (err) {
      if (err instanceof AppError) throw err;
      lastError = err;
    }
  }
  throw new AppError(502, "MODEL_OUTPUT_INVALID", "The analysis came back incomplete. Please try again.", { cause: lastError });
}
