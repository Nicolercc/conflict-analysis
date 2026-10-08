import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { SourceRecord } from "./sources";
import { checkClaim } from "./support";

type Labelled = {
  label: "supported" | "unsupported";
  text: string;
  evidence: Array<{ sourceId: string; quote: string }>;
  note: string;
  caughtByChecks?: boolean;
};
const set = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../eval/claim-check-set.json"), "utf8")) as {
  sources: Record<string, { publisher: string; publishedAt: string | null; text: string }>;
  claims: Labelled[];
};

const byId = new Map<string, SourceRecord>(
  Object.entries(set.sources).map(([id, s]) => [
    id,
    { id, kind: "news", provider: "set", title: "", url: null, retrievedAt: "", language: "English", country: null, excerpt: null, textFrom: "summary", contentHash: "", ...s },
  ]),
);
const kept = (c: Labelled) => checkClaim({ text: c.text, evidence: c.evidence }, byId).ok;

describe("quote checks against the hand-labelled set", () => {
  const supported = set.claims.filter((c) => c.label === "supported");
  const unsupported = set.claims.filter((c) => c.label === "unsupported");

  it.each(supported)("keeps a supported claim: $text", (c) => {
    expect(kept(c)).toBe(true);
  });

  it.each(unsupported.filter((c) => c.caughtByChecks))("discards an unsupported claim: $text", (c) => {
    expect(kept(c)).toBe(false);
  });

  // These carry a real quote and share its words; only the meaning is wrong.
  // No rule about words can catch them — they are what the verifier is for,
  // and the evaluation measures how many of them it removes. If one starts
  // being caught here, flip its caughtByChecks and raise the number below.
  it.each(unsupported.filter((c) => !c.caughtByChecks))("left for the verifier: $text", (c) => {
    expect(kept(c)).toBe(true);
  });

  it("reports how much of the unsupported set the quote checks catch", () => {
    const caught = unsupported.filter((c) => !kept(c)).length;
    expect({ caught, of: unsupported.length, falseDrops: supported.filter((c) => !kept(c)).length }).toEqual({
      caught: 8,
      of: 11,
      falseDrops: 0,
    });
  });
});
