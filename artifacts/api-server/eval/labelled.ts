import { readFileSync } from "node:fs";
import path from "node:path";
import type { SourceRecord } from "../src/brief/sources";
import { checkClaim, type Claim } from "../src/brief/support";
import { verifyClaims } from "../src/brief/verify";

type Labelled = { label: "supported" | "unsupported"; text: string; evidence: Array<{ sourceId: string; quote: string }> };

/**
 * Run the verifier over the hand-labelled claims that get past the quote
 * checks. This is the one place its accuracy is measured against answers a
 * person wrote down, rather than against another model's opinion.
 */
export async function measureVerifier() {
  const set = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "claim-check-set.json"), "utf8")) as {
    sources: Record<string, { publisher: string; publishedAt: string | null; text: string }>;
    claims: Labelled[];
  };
  const sources: SourceRecord[] = Object.entries(set.sources).map(([id, s]) => ({
    id, kind: "news", provider: "set", title: "", url: null, retrievedAt: "", language: "English", country: null, excerpt: null, ...s,
  }));
  const byId = new Map(sources.map((s) => [s.id, s]));

  const reaching: Array<{ label: Labelled["label"]; claim: Claim }> = [];
  for (const c of set.claims) {
    const checked = checkClaim({ text: c.text, evidence: c.evidence }, byId);
    if (checked.ok) reaching.push({ label: c.label, claim: checked.claim });
  }
  const { groups, verification, removed } = await verifyClaims([reaching.map((r) => r.claim)], sources);
  // A claim the verifier cut back to its quote was kept, in other words; only outright removals count.
  const removedTexts = new Set(removed.map((r) => r.text));
  const kept = groups[0] ?? [];
  const of = (label: Labelled["label"]) => reaching.filter((r) => r.label === label);
  return {
    ran: verification.status === "verified",
    supported: of("supported").length,
    supportedRemoved: of("supported").filter((r) => removedTexts.has(r.claim.text)).length,
    supportedReworded: of("supported").filter((r) => !removedTexts.has(r.claim.text) && !kept.some((k) => k.text === r.claim.text)).length,
    unsupportedTotal: set.claims.filter((c) => c.label === "unsupported").length,
    unsupportedReachingVerifier: of("unsupported").length,
    // An unsupported claim is dealt with if it was removed or rewritten to drop the false part.
    unsupportedRemoved: of("unsupported").filter((r) => !kept.some((k) => k.text === r.claim.text)).length,
    unsupportedReworded: of("unsupported")
      .filter((r) => !removedTexts.has(r.claim.text) && !kept.some((k) => k.text === r.claim.text))
      .map((r) => ({ from: r.claim.text, to: kept.find((k) => k.evidence[0]?.quote === r.claim.evidence[0]?.quote)?.text ?? "" })),
    removed,
  };
}
