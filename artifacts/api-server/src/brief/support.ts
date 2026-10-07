import type { SourceRecord } from "./sources";

export type Claim = { text: string; sourceIds: string[] };

/**
 * Deterministic checks that a claim rests on the sources it cites. These
 * catch the cheap, common failures — an id that was never retrieved, a figure
 * that appears in no cited text, a claim sharing no vocabulary with its
 * source. They do not prove the claim is true or fairly summarised; that
 * needs the reviewed evaluation set.
 */

const STOP = new Set([
  "that", "this", "with", "from", "have", "has", "been", "were", "was", "will", "would", "their",
  "there", "which", "about", "after", "before", "while", "amid", "into", "over", "more", "than",
  "also", "said", "says", "according", "reported", "reports", "report", "sources", "source",
]);

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** Figures in a text, normalised so "1,200", "1 200" and "1200" compare equal. */
export function numbersIn(text: string): string[] {
  const found = digits(text).match(/\d[\d,. ]*\d|\d/g) ?? [];
  return found.map((n) => n.replace(/[, ]/g, "").replace(/\.$/, "")).filter(Boolean);
}

function contentWords(text: string): Set<string> {
  const words = text.toLowerCase().match(/[\p{L}]{4,}/gu) ?? [];
  return new Set(words.filter((w) => !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/u, "")));
}

export type ClaimCheck = { ok: true; claim: Claim } | { ok: false; reason: string };

export function checkClaim(raw: unknown, byId: Map<string, SourceRecord>): ClaimCheck {
  const candidate = raw as { text?: unknown; sourceIds?: unknown } | null;
  const text = typeof candidate?.text === "string" ? candidate.text.trim() : "";
  if (!text) return { ok: false, reason: "empty claim" };

  const ids = Array.isArray(candidate?.sourceIds)
    ? [...new Set(candidate.sourceIds.filter((id): id is string => typeof id === "string" && byId.has(id)))]
    : [];
  if (ids.length === 0) return { ok: false, reason: "cites no retrieved source" };

  const cited = ids.map((id) => byId.get(id)!);
  const citedText = digits(cited.map((s) => s.text).join(" \n "));

  const sourceNumbers = new Set(numbersIn(citedText));
  const missing = numbersIn(text).filter((n) => !sourceNumbers.has(n));
  if (missing.length > 0) {
    return { ok: false, reason: `figure not in cited sources: ${missing.join(", ")}` };
  }

  // Vocabulary overlap only means something when claim and source share a language.
  if (cited.every((s) => (s.language ?? "English") === "English")) {
    const sourceWords = contentWords(citedText);
    const shared = [...contentWords(text)].filter((w) => sourceWords.has(w));
    if (shared.length < 2) return { ok: false, reason: "shares no substance with cited sources" };
  }

  return { ok: true, claim: { text, sourceIds: ids } };
}

/** Keep the claims that pass; report why the rest were dropped. */
export function checkClaims(raw: unknown, sources: SourceRecord[], limit: number) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const kept: Claim[] = [];
  const dropped: string[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const result = checkClaim(item, byId);
    if (result.ok) {
      if (kept.length < limit) kept.push(result.claim);
    } else {
      dropped.push(result.reason);
    }
  }
  return { kept, dropped };
}
