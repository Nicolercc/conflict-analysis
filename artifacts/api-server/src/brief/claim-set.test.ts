import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { SourceRecord } from "./sources";
import { checkClaim } from "./support";

type Labelled = { label: "supported" | "unsupported"; text: string; cites: string[]; note: string; caughtToday?: boolean };
const set = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../eval/claim-check-set.json"), "utf8")) as {
  sources: Record<string, { publisher: string; publishedAt: string | null; text: string }>;
  claims: Labelled[];
};

const byId = new Map<string, SourceRecord>(
  Object.entries(set.sources).map(([id, s]) => [
    id,
    { id, kind: "news", provider: "set", title: "", url: null, retrievedAt: "", language: "English", country: null, excerpt: null, ...s },
  ]),
);
const kept = (c: Labelled) => checkClaim({ text: c.text, sourceIds: c.cites }, byId).ok;

describe("claim checks against the hand-labelled set", () => {
  const supported = set.claims.filter((c) => c.label === "supported");
  const unsupported = set.claims.filter((c) => c.label === "unsupported");

  it.each(supported)("keeps a supported claim: $text", (c) => {
    expect(kept(c)).toBe(true);
  });

  it.each(unsupported.filter((c) => c.caughtToday))("discards an unsupported claim: $text", (c) => {
    expect(kept(c)).toBe(false);
  });

  // These pass the lexical checks: the words match, the meaning does not. They
  // are the measured limit of the current checks. If one starts being caught,
  // this fails — flip its caughtToday and raise the number below.
  it.each(unsupported.filter((c) => !c.caughtToday))("known gap, still kept: $text", (c) => {
    expect(kept(c)).toBe(true);
  });

  it("reports how much of the unsupported set the checks catch", () => {
    const caught = unsupported.filter((c) => !kept(c)).length;
    expect({ caught, of: unsupported.length, falseDrops: supported.filter((c) => !kept(c)).length }).toEqual({
      caught: 6,
      of: 10,
      falseDrops: 0,
    });
  });
});
