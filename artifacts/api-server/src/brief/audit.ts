import crypto from "node:crypto";
import type { SourceSnapshot, StoredBrief } from "../lib/brief-store";
import { quoteForm } from "./support";

type AuditedClaim = { text?: string; evidence?: Array<{ sourceId: string; quote: string }> };
type AuditedBrief = StoredBrief & {
  keyFacts?: AuditedClaim[];
  coverage?: { agreements?: AuditedClaim[]; differences?: AuditedClaim[] };
};

export type Audit = {
  id: string;
  generatedAt: string;
  /** True when every quote that can be checked is found, in text whose fingerprint matches. */
  intact: boolean;
  /** Why a brief cannot be fully audited, when it cannot. */
  notes: string[];
  sources: Array<{ id: string; publisher: string; url: string | null; textFrom: string; kept: boolean; fingerprintMatches: boolean | null; chars: number | null }>;
  claims: Array<{ section: string; text: string; quotes: Array<{ sourceId: string; status: "found" | "missing" | "not kept" | "no quote" }> }>;
};

const fingerprint = (text: string) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);

/** Replay the quote check for a saved brief against the source text saved with it. */
export function auditBrief(brief: AuditedBrief, snapshot: SourceSnapshot[] | null): Audit {
  const notes: string[] = [];
  if (!snapshot) notes.push("No source text was saved with this brief (it predates snapshots), so its quotes cannot be re-checked.");
  const byId = new Map((snapshot ?? []).map((s) => [s.id, s]));

  const sources = (snapshot ?? []).map((s) => ({
    id: s.id,
    publisher: s.publisher,
    url: s.url,
    textFrom: s.textFrom,
    kept: s.text !== null,
    fingerprintMatches: s.text === null ? null : fingerprint(s.text) === s.contentHash,
    chars: s.text?.length ?? null,
  }));
  if (sources.some((s) => !s.kept)) notes.push("Text the reader pasted is never stored; quotes from it cannot be re-checked.");

  const sections: Array<[string, AuditedClaim[]]> = [
    ["key fact", brief.keyFacts ?? []],
    ["agreement", brief.coverage?.agreements ?? []],
    ["difference", brief.coverage?.differences ?? []],
  ];
  const claims = sections.flatMap(([section, list]) =>
    list.map((claim) => ({
      section,
      text: claim.text ?? "",
      quotes: (claim.evidence ?? []).map((e) => {
        const source = byId.get(e.sourceId);
        const status: Audit["claims"][number]["quotes"][number]["status"] = !e.quote
          ? "no quote"
          : !source || source.text === null
            ? "not kept"
            : quoteForm(source.text).includes(quoteForm(e.quote))
              ? "found"
              : "missing";
        return { sourceId: e.sourceId, status };
      }),
    })),
  );

  const anyMissing = claims.some((c) => c.quotes.some((q) => q.status === "missing"));
  const anyTampered = sources.some((s) => s.fingerprintMatches === false);
  return { id: brief.id, generatedAt: brief.generatedAt, intact: Boolean(snapshot) && !anyMissing && !anyTampered, notes, sources, claims };
}
