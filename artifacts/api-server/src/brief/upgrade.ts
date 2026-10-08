import type { StoredBrief } from "../lib/brief-store";

type AnyClaim = { text?: unknown; sourceIds?: unknown; evidence?: unknown; support?: unknown };

function upgradeClaim(claim: AnyClaim) {
  const sourceIds = Array.isArray(claim.sourceIds) ? (claim.sourceIds as string[]) : [];
  return {
    ...claim,
    sourceIds,
    // Briefs saved before quotes were required have none to show.
    evidence: Array.isArray(claim.evidence) ? claim.evidence : sourceIds.map((sourceId) => ({ sourceId, quote: "" })),
    support: claim.support === "verified" ? "verified" : "unverified",
  };
}

/**
 * A saved brief is never rewritten, so one saved by an older version of the
 * server can lack fields the current contract requires. They are filled in
 * here, on the way out, with values that claim nothing the brief did not earn:
 * no quotes, not verified.
 */
export function upgradeStoredBrief<T extends StoredBrief>(brief: T): T {
  const b = brief as T & {
    keyFacts?: AnyClaim[];
    coverage?: { agreements?: AnyClaim[]; differences?: AnyClaim[] };
    verification?: unknown;
    sources?: Array<Record<string, unknown>>;
  };
  return {
    ...b,
    keyFacts: (b.keyFacts ?? []).map(upgradeClaim),
    coverage: {
      agreements: (b.coverage?.agreements ?? []).map(upgradeClaim),
      differences: (b.coverage?.differences ?? []).map(upgradeClaim),
    },
    verification: b.verification ?? { status: "skipped", checked: 0, removed: 0, corrected: 0 },
    // Before articles were read in full, every source was a summary.
    sources: (b.sources ?? []).map((s) => ({ ...s, textFrom: s["textFrom"] ?? "summary", contentHash: s["contentHash"] ?? "" })),
  };
}
