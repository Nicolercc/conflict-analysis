import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ExploreConflictResponse } from "@workspace/api-zod";
import { newBriefId, type SourceSnapshot } from "../lib/brief-store";
import { AppError } from "../lib/errors";
import { recordModelCall } from "../lib/ledger";
import { logger } from "../lib/logger";
import { locateBrief } from "./geocode";
import { extractJSON, normalizeLatLng, tryExtractJsonFallback } from "./json";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { searchCoverage, type Coverage } from "./retrieval";
import { toPublicSource, type Candidate, type SourceRecord } from "./sources";
import { checkClaims } from "./support";
import { verifyClaims } from "./verify";

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
  /** Why the quote checks discarded each claim they discarded. */
  dropped: string[];
  /** Claims the verifier removed after they had passed the quote checks. */
  rejected: Array<{ text: string; verdict: string; why: string }>;
  attempts: number;
  usage: { inputTokens: number; outputTokens: number };
  verifierUsage: { inputTokens: number; outputTokens: number };
};

/** One model call, parsed and checked against the evidence and the response contract. */
async function generateOnce(coverage: Coverage, userMessage: string, onProgress: OnProgress) {
  // The id exists before any model is called, so every call can be costed against its brief.
  const briefId = newBriefId();
  const started = Date.now();
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
    recordModelCall({ briefId, purpose: "writer", model: BRIEF_MODEL, inputTokens: 0, outputTokens: 0, ms: Date.now() - started, ok: false });
    throw providerUnavailable(err);
  }
  recordModelCall({
    briefId,
    purpose: "writer",
    model: BRIEF_MODEL,
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
    ms: Date.now() - started,
    ok: true,
  });

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

  // First check, no model: every quote is really in its source, and the claim's
  // figures are in its quotes. A comparison needs quotes from two sources.
  const quoted = {
    // More candidates than will be shown: some will not survive the second check.
    keyFacts: checkClaims(parsed["keyFacts"], coverage.sources, 9),
    agreements: checkClaims(rawCoverage["agreements"], coverage.sources, 3, 2),
    differences: checkClaims(rawCoverage["differences"], coverage.sources, 3, 2),
  };
  const dropped = [...quoted.keyFacts.dropped, ...quoted.agreements.dropped, ...quoted.differences.dropped];
  if (dropped.length > 0) logger.info({ dropped }, "claims failed the quote checks");

  const location = {
    city: str(rawLoc["city"]),
    country: str(rawLoc["country"]),
    region: str(rawLoc["region"]),
    ...normalizeLatLng(rawLoc["lat"], rawLoc["lng"]),
  };
  const events = Array.isArray(parsed["relatedEvents"])
    ? (parsed["relatedEvents"] as Array<Record<string, unknown>>).map((ev) => ({
        ...ev,
        ...normalizeLatLng(ev?.["lat"], ev?.["lng"]),
        place: str(ev?.["place"]).trim() || null,
        searchQuery: str(ev?.["searchQuery"]),
      }))
    : null;
  // Looking places up and verifying claims do not depend on each other, so the
  // map lookups start now and run while the verifier reads. The model's
  // coordinates are only a guess; the map shows looked-up places.
  const lookingUp = parsed["inScope"] === false ? null : locateBrief({ location, relatedEvents: events ?? [] });
  lookingUp?.catch(() => {});

  // Second check: another model reads each claim against its quotes.
  onProgress({ type: "stage", stage: "checking" });
  const verified = await verifyClaims([quoted.keyFacts.kept, quoted.agreements.kept, quoted.differences.kept], coverage.sources, briefId);
  if (verified.removed.length > 0) logger.info({ removed: verified.removed }, "claims removed by the verifier");
  // Pasted text is checked against but never sent back or stored, so a quote
  // from it is withheld. (An article supplied by link is public and is quoted.)
  const privateIds = new Set(coverage.sources.filter((src) => src.kind === "article" && src.url === null).map((src) => src.id));
  const LIMITS = [6, 3, 2];
  const [keyFacts = [], agreements = [], differences = []] = verified.groups.map((group, i) =>
    group.slice(0, LIMITS[i]).map((claim) => ({
      ...claim,
      evidence: claim.evidence.map((e) => (privateIds.has(e.sourceId) ? { ...e, quote: "" } : e)),
    })),
  );
  const claimsKept = keyFacts.length + agreements.length + differences.length;
  onProgress({ type: "stage", stage: "locating" });
  const located = lookingUp ? await lookingUp : null;

  // An out-of-scope topic has no risk level, parties or timeline. The model
  // sometimes says so with "N/A" or by leaving fields out, which would fail the
  // contract and surface as an error. The reader is only ever shown a notice
  // for such a brief, so the unused fields are given neutral values.
  const outOfScope = parsed["inScope"] === false;
  const neutral = outOfScope
    ? {
        headline: str(parsed["headline"]) || "Outside scope",
        summary: str(parsed["summary"]) || "This topic is not a conflict, humanitarian crisis or geopolitical tension.",
        actors: [],
        perspectives: [],
        relatedEvents: [],
        escalationRisk: "Low",
        escalationReason: "",
        historicalContext: "",
        affectedPopulation: "",
        keyQuestion: "",
        casualtyData: { description: "", civilianImpact: "", allSides: "" },
      }
    : {};

  // Provenance fields are set here and never by the model. The schema parse
  // strips anything outside the contract and rejects missing or mistyped fields.
  const candidate = {
    ...parsed,
    id: briefId,
    generatedAt: new Date().toISOString(),
    inScope: parsed["inScope"] !== false,
    location: located?.location ?? { ...location, lat: null, lng: null },
    relatedEvents: events ? (located?.relatedEvents ?? events.map((ev) => ({ ...ev, lat: null, lng: null }))) : parsed["relatedEvents"],
    ...neutral,
    keyFacts,
    coverage: { agreements, differences },
    verification: verified.verification,
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
      claimsProposed: claimsKept + dropped.length + verified.removed.length,
      claimsKept,
      dropped,
      rejected: verified.removed,
      verifierUsage: verified.usage,
      usage: { inputTokens: message.usage?.input_tokens ?? 0, outputTokens: message.usage?.output_tokens ?? 0 },
    },
  };
}

/** The text each source contributed, for keeping. Pasted text is not kept: only its fingerprint is. */
export function snapshotOf(sources: SourceRecord[]): SourceSnapshot[] {
  return sources.map((s) => ({
    id: s.id,
    publisher: s.publisher,
    url: s.url,
    textFrom: s.textFrom,
    retrievedAt: s.retrievedAt,
    contentHash: s.contentHash,
    text: s.kind === "article" && s.url === null ? null : s.text,
  }));
}

/** What a brief is doing right now, for readers watching it being built. */
export type BriefProgress =
  | { type: "stage"; stage: "retrieving" | "writing" | "checking" | "locating" }
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
  return { brief, snapshot: snapshotOf(coverage.sources) };
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
      const { brief, stats } = await generateOnce(coverage, userMessage, onProgress);
      logger.info({ sources: coverage.sources.length, attempt, ...stats.usage, claimsKept: stats.claimsKept }, "brief generated");
      return { brief, stats: { ...stats, attempts: attempt } satisfies GenerationStats };
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
