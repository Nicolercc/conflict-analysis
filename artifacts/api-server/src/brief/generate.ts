import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ExploreConflictResponse } from "@workspace/api-zod";
import { newBriefId } from "../lib/brief-store";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { locateBrief } from "./geocode";
import { extractJSON, normalizeLatLng, tryExtractJsonFallback } from "./json";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { searchCoverage, type Coverage } from "./retrieval";
import { toPublicSource, type Candidate } from "./sources";
import { checkClaims } from "./support";

const BRIEF_MODEL = process.env["BRIEF_MODEL"] ?? "claude-haiku-4-5-20251001";
const MODEL_TIMEOUT_MS = Number(process.env["BRIEF_MODEL_TIMEOUT_MS"] ?? 60_000);
/** A provider error this soon is a refusal or a blip, not a slow answer, and is worth one more try. */
const QUICK_FAILURE_MS = 10_000;
/** One retry when the model's answer is unusable, or when the provider fails quickly. */
const MAX_GENERATION_ATTEMPTS = 2;

const providerUnavailable = (cause: unknown) =>
  new AppError(502, "PROVIDER_UNAVAILABLE", "The analysis service is unavailable right now. Please try again later.", { cause });

/** What the claim checks did to one model answer; the evaluation reads this. */
export type GenerationStats = {
  claimsProposed: number;
  claimsKept: number;
  /** Why each discarded claim was discarded. */
  dropped: string[];
  attempts: number;
  usage: { inputTokens: number; outputTokens: number };
};

/** One model call, parsed and checked against the evidence and the response contract. */
async function generateOnce(coverage: Coverage, userMessage: string) {
  let message;
  try {
    message = await anthropic.messages.create(
      {
        model: BRIEF_MODEL,
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      },
      // One attempt with a hard deadline: a reader should get an answer or a
      // "try again" within about a minute, never wait out silent retries.
      { timeout: MODEL_TIMEOUT_MS, maxRetries: 0, signal: AbortSignal.timeout(MODEL_TIMEOUT_MS + 2_000) },
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
  const claimsKept = keyFacts.kept.length + agreements.kept.length + differences.kept.length;

  // Provenance fields are set here and never by the model. The schema parse
  // strips anything outside the contract and rejects missing or mistyped fields.
  const candidate = {
    ...parsed,
    id: newBriefId(),
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
          place: str(ev?.["place"]).trim() || null,
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
  return {
    brief: checked.data,
    stats: {
      claimsProposed: claimsKept + dropped.length,
      claimsKept,
      dropped,
      usage: { inputTokens: message.usage?.input_tokens ?? 0, outputTokens: message.usage?.output_tokens ?? 0 },
    },
  };
}

/** What a brief is doing right now, for readers watching it being built. */
export type BriefProgress =
  | { type: "stage"; stage: "retrieving" | "writing" | "locating" }
  | { type: "sources"; sources: ReturnType<typeof toPublicSource>[]; retrieval: Coverage["retrieval"] };
export type OnProgress = (event: BriefProgress) => void;

export type BriefInput = {
  /** Search terms for retrieval. */
  topic: string;
  /** The article the reader supplied, when there is one. */
  article?: { text: string; url: string | null };
};

export async function buildBrief(input: BriefInput, onProgress: OnProgress = () => {}) {
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

  onProgress({ type: "stage", stage: "retrieving" });
  const coverage = await searchCoverage(input.topic, supplied);
  onProgress({ type: "sources", sources: coverage.sources.map(toPublicSource), retrieval: coverage.retrieval });
  const { brief } = await generateFromCoverage(coverage, { topic: input.topic, hasArticle: Boolean(supplied) }, onProgress);
  return brief;
}

/**
 * Brief a fixed set of sources. Retrieval is the caller's business, so the
 * evaluation can replay stored sources through exactly the production path.
 */
export async function generateFromCoverage(
  coverage: Coverage,
  request: { topic: string; hasArticle: boolean },
  onProgress: OnProgress = () => {},
) {
  const userMessage = buildUserMessage(coverage.sources, request);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const attemptStarted = Date.now();
    try {
      onProgress({ type: "stage", stage: "writing" });
      const { brief, stats } = await generateOnce(coverage, userMessage);
      onProgress({ type: "stage", stage: "locating" });
      logger.info({ sources: coverage.sources.length, attempt, ...stats.usage, claimsKept: stats.claimsKept }, "brief generated");
      // The model's coordinates are a guess; the map shows only looked-up places.
      return { brief: await locateBrief(brief), stats: { ...stats, attempts: attempt } satisfies GenerationStats };
    } catch (err) {
      if (err instanceof AppError) {
        const quick = Date.now() - attemptStarted < QUICK_FAILURE_MS;
        if (!quick || attempt === MAX_GENERATION_ATTEMPTS) throw err;
      }
      lastError = err;
    }
  }
  if (lastError instanceof AppError) throw lastError;
  throw new AppError(502, "MODEL_OUTPUT_INVALID", "The analysis came back incomplete. Please try again.", { cause: lastError });
}
