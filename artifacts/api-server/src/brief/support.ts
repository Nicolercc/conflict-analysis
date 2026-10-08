import type { SourceRecord } from "./sources";

/** A sentence or phrase copied from a source, offered as the basis for a claim. */
export type Evidence = { sourceId: string; quote: string };
export type Claim = {
  text: string;
  sourceIds: string[];
  evidence: Evidence[];
  /** "verified" once the second-model check has passed it; "unverified" when that check did not run. */
  support: "verified" | "unverified";
};

/**
 * Deterministic checks that a claim rests on the sources it cites.
 *
 * The model must copy, for every claim, the words in each cited source that
 * the claim rests on. The server then checks, without a model:
 *   1. every quote really is in the source it names (so it cannot be invented),
 *   2. every figure in the claim appears in those quotes (or is the source's
 *      publication date),
 *   3. the claim shares vocabulary with its quotes.
 * A claim that fails is dropped. These checks pin a claim to specific words;
 * whether those words mean what the claim says is the verifier's job.
 */

const STOP = new Set([
  "that", "this", "with", "from", "have", "has", "been", "were", "was", "will", "would", "their",
  "there", "which", "about", "after", "before", "while", "amid", "into", "over", "more", "than",
  "also", "said", "says", "according", "reported", "reports", "report", "sources", "source",
]);

const MIN_QUOTE_CHARS = 12;
const MAX_QUOTE_CHARS = 320;

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** Figures in a text, normalised so "1,200", "1 200" and "1200" compare equal.
 * Separators join digits only in groups of three, so "October 7, 2026" is the
 * two figures 7 and 2026 and not one.
 */
export function numbersIn(text: string): string[] {
  const found = digits(text).match(/\d{1,3}(?:[, ]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) ?? [];
  return found.map((n) => n.replace(/[, ]/g, "")).filter(Boolean);
}

/** The day, month and year a source was published: a claim may date an event by them. */
function dateFigures(source: SourceRecord): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(source.publishedAt ?? "");
  return m ? [m[1]!, String(Number(m[2])), String(Number(m[3]))] : [];
}

function contentWords(text: string): Set<string> {
  const words = text.toLowerCase().match(/[\p{L}]{4,}/gu) ?? [];
  return new Set(words.filter((w) => !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/u, "")));
}

/**
 * Text as compared for quoting: case, spacing and the typographic variants of
 * quotes, dashes and ellipses do not count as differences; anything else does.
 */
export function quoteForm(text: string): string {
  return digits(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‚‛′`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/** The quote, if it is long enough and really appears in the source; otherwise null. */
export function verifyQuote(quote: unknown, source: SourceRecord): string | null {
  if (typeof quote !== "string") return null;
  // A model sometimes wraps what it copied in quotation marks or trails off with an ellipsis.
  const trimmed = quote.trim().replace(/^["'“‘]+|["'”’]+$/g, "").replace(/(\.\.\.|…)$/, "").trim();
  if (trimmed.length < MIN_QUOTE_CHARS || trimmed.length > MAX_QUOTE_CHARS) return null;
  return quoteForm(source.text).includes(quoteForm(trimmed)) ? trimmed : null;
}

export type ClaimCheck = { ok: true; claim: Claim } | { ok: false; reason: string };

export function checkClaim(raw: unknown, byId: Map<string, SourceRecord>, minSources = 1): ClaimCheck {
  const candidate = raw as { text?: unknown; evidence?: unknown } | null;
  const text = typeof candidate?.text === "string" ? candidate.text.trim() : "";
  if (!text) return { ok: false, reason: "empty claim" };

  const offered = Array.isArray(candidate?.evidence) ? (candidate.evidence as Array<{ sourceId?: unknown; quote?: unknown }>) : [];
  if (offered.length === 0) return { ok: false, reason: "offers no quote" };

  const evidence: Evidence[] = [];
  let unknownSource = 0;
  for (const item of offered) {
    const source = typeof item?.sourceId === "string" ? byId.get(item.sourceId) : undefined;
    if (!source) {
      unknownSource += 1;
      continue;
    }
    const quote = verifyQuote(item.quote, source);
    // One quote per source is enough to show; a second from the same source adds nothing to check.
    if (quote && !evidence.some((e) => e.sourceId === source.id)) evidence.push({ sourceId: source.id, quote });
  }
  if (evidence.length === 0) {
    return { ok: false, reason: unknownSource === offered.length ? "cites no retrieved source" : "quote not found in the cited source" };
  }
  if (evidence.length < minSources) {
    return { ok: false, reason: `needs quotes from ${minSources} sources, has ${evidence.length}` };
  }

  const cited = evidence.map((e) => byId.get(e.sourceId)!);
  const quoted = digits(evidence.map((e) => e.quote).join(" \n "));

  const allowed = new Set([...numbersIn(quoted), ...cited.flatMap(dateFigures)]);
  const missing = numbersIn(text).filter((n) => !allowed.has(n));
  if (missing.length > 0) {
    return { ok: false, reason: `figure not in the quoted text: ${missing.join(", ")}` };
  }

  // Vocabulary overlap only means something when claim and source share a language.
  if (cited.every((s) => (s.language ?? "English") === "English")) {
    const quoteWords = contentWords(quoted);
    const shared = [...contentWords(text)].filter((w) => quoteWords.has(w));
    if (shared.length < 2) return { ok: false, reason: "shares no substance with its quotes" };
  }

  return { ok: true, claim: { text, sourceIds: evidence.map((e) => e.sourceId), evidence, support: "unverified" } };
}

/** Keep the claims that pass; report why the rest were dropped. */
export function checkClaims(raw: unknown, sources: SourceRecord[], limit: number, minSources = 1) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const kept: Claim[] = [];
  const dropped: string[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const result = checkClaim(item, byId, minSources);
    if (result.ok) {
      if (kept.length < limit) kept.push(result.claim);
    } else {
      dropped.push(result.reason);
    }
  }
  return { kept, dropped };
}
