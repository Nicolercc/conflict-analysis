/**
 * Replay every recorded case through the production brief pipeline and score
 * the result. Needs an API key; costs one brief and one grading call per case.
 * Run: pnpm --filter @workspace/api-server eval [-- --only sudan,gaza-ceasefire]
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateFromCoverage } from "../src/brief/generate";
import { VERIFIER_MODEL } from "../src/brief/verify";
import type { Coverage } from "../src/brief/retrieval";
import { EXPECTATIONS } from "./expectations";
import { judge, JUDGE_MODEL, type Judgement } from "./judge";
import { measureVerifier } from "./labelled";
import { renderReport } from "./report";
import { checkThresholds } from "./thresholds";
import { TOPICS, type EvalTopic } from "./topics";

const here = import.meta.dirname;
const onlyArg = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? process.argv[process.argv.indexOf("--only") + 1];
const only = process.argv.includes("--only") || process.argv.some((a) => a.startsWith("--only=")) ? new Set((onlyArg ?? "").split(",")) : null;

export type CaseResult = {
  id: string;
  topic: string;
  sources: number;
  ok: boolean;
  error?: string;
  seconds: number;
  scope: { expected: boolean; got: boolean | null; correct: boolean };
  /** "correct" inside the expected region, "none" when no pin was drawn, "wrong" outside it. */
  pin: "correct" | "none" | "wrong" | "n/a";
  pinDetail?: string;
  eventPins: number;
  claims: { proposed: number; kept: number; dropped: string[]; rejectedByVerifier: number };
  verification: "verified" | "skipped" | "n/a";
  judged: { supported: number; partly: number; unsupported: number };
  failures: Array<{ claim: string; cites: string[]; verdict: string; why: string }>;
  expected: { total: number; conveyed: number; missed: string[]; reviewed: boolean };
  usage: { inputTokens: number; outputTokens: number };
};

/** A person approved this case's expected facts, and nothing has changed since. */
function isReviewed(id: string): boolean {
  const reviews = JSON.parse(readFileSync(path.join(here, "reviews.json"), "utf8")) as Record<string, { fingerprint: string }>;
  if (!reviews[id] || !EXPECTATIONS[id]) return false;
  const recorded = readFileSync(path.join(here, "cases", `${id}.json`), "utf8");
  const facts = EXPECTATIONS[id].facts.map((f) => `${f.fact}|${f.evidence}`).join("\n");
  return createHash("sha256").update(recorded).update(facts).digest("hex").slice(0, 16) === reviews[id].fingerprint;
}

function loadCase(t: EvalTopic): Coverage & { recordedAt: string } {
  return JSON.parse(readFileSync(path.join(here, "cases", `${t.id}.json`), "utf8"));
}

function pinVerdict(t: EvalTopic, loc: { lat: number | null; lng: number | null; city: string }): Pick<CaseResult, "pin" | "pinDetail"> {
  if (!t.region) return { pin: "n/a" };
  if (loc.lat === null || loc.lng === null) return { pin: "none", pinDetail: loc.city || "no city named" };
  const inside = loc.lat >= t.region.lat[0] && loc.lat <= t.region.lat[1] && loc.lng >= t.region.lng[0] && loc.lng <= t.region.lng[1];
  return { pin: inside ? "correct" : "wrong", pinDetail: `${loc.city} (${loc.lat.toFixed(2)}, ${loc.lng.toFixed(2)}) vs ${t.region.name}` };
}

async function runCase(t: EvalTopic): Promise<CaseResult> {
  const recorded = loadCase(t);
  const expectation = t.inScope ? EXPECTATIONS[t.id] : undefined;
  const corpus = recorded.sources.map((s) => `${s.title}. ${s.text}`).join("\n");
  for (const f of expectation?.facts ?? []) {
    if (!f.evidence.test(corpus)) throw new Error(`${t.id}: expected fact has no evidence in the snapshot — "${f.fact}"`);
  }

  const base = {
    id: t.id,
    topic: t.topic,
    sources: recorded.sources.length,
    eventPins: 0,
    claims: { proposed: 0, kept: 0, dropped: [] as string[], rejectedByVerifier: 0 },
    verification: "n/a" as CaseResult["verification"],
    judged: { supported: 0, partly: 0, unsupported: 0 },
    failures: [] as CaseResult["failures"],
    expected: { total: expectation?.facts.length ?? 0, conveyed: 0, missed: [] as string[], reviewed: isReviewed(t.id) },
    usage: { inputTokens: 0, outputTokens: 0 },
  };
  const started = Date.now();
  try {
    const { brief, stats } = await generateFromCoverage(recorded, { topic: t.topic, hasArticle: false });
    const seconds = (Date.now() - started) / 1000;
    const kept = t.inScope ? [...brief.keyFacts, ...brief.coverage.agreements, ...brief.coverage.differences] : [];
    let graded: Judgement = { claims: [], expected: [] };
    if (t.inScope && brief.inScope) {
      graded = await judge({
        sources: recorded.sources,
        claims: kept,
        summary: brief.summary,
        expectedFacts: (expectation?.facts ?? []).map((f) => f.fact),
      });
    }
    const count = (v: string) => graded.claims.filter((c) => c.verdict === v).length;
    return {
      ...base,
      ok: true,
      seconds,
      scope: { expected: t.inScope, got: brief.inScope, correct: brief.inScope === t.inScope },
      ...pinVerdict(t, brief.location),
      eventPins: brief.relatedEvents.filter((e) => e.lat !== null).length,
      claims: { proposed: stats.claimsProposed, kept: stats.claimsKept, dropped: stats.dropped, rejectedByVerifier: stats.rejected.length },
      verification: brief.verification.status,
      judged: { supported: count("supported"), partly: count("partly"), unsupported: count("unsupported") },
      failures: graded.claims
        .filter((c) => c.verdict !== "supported")
        .map((c) => ({ claim: c.text, cites: c.sourceIds, verdict: c.verdict, why: c.why })),
      expected: {
        ...base.expected,
        conveyed: graded.expected.filter((e) => e.conveyed).length,
        missed: graded.expected.filter((e) => !e.conveyed).map((e) => e.fact),
      },
      usage: {
        inputTokens: stats.usage.inputTokens + stats.verifierUsage.inputTokens,
        outputTokens: stats.usage.outputTokens + stats.verifierUsage.outputTokens,
      },
    };
  } catch (err) {
    return {
      ...base,
      ok: false,
      error: err instanceof Error ? `${err.message}${err.cause instanceof Error ? ` (${err.cause.message})` : ""}` : String(err),
      seconds: (Date.now() - started) / 1000,
      scope: { expected: t.inScope, got: null, correct: false },
      pin: t.region ? "none" : "n/a",
    };
  }
}

const topics = TOPICS.filter((t) => !only || only.has(t.id));
const results: CaseResult[] = [];
// Two at a time: quick enough, and gentle on the geocoder's one-request-a-second limit.
for (let i = 0; i < topics.length; i += 2) {
  const batch = await Promise.all(topics.slice(i, i + 2).map(runCase));
  for (const r of batch) {
    results.push(r);
    console.log(
      `${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(20)} ${r.seconds.toFixed(0).padStart(3)}s  claims ${r.claims.kept}/${r.claims.proposed}  judged ${r.judged.supported}/${r.judged.partly}/${r.judged.unsupported}  facts ${r.expected.conveyed}/${r.expected.total}  pin ${r.pin}${r.error ? `  ${r.error}` : ""}`,
    );
  }
}

// The verifier on its own, against claims whose right answer is known.
const labelled = only ? null : await measureVerifier();
if (labelled) {
  console.log(
    `\nverifier on the labelled set: removed ${labelled.unsupportedRemoved}/${labelled.unsupportedReachingVerifier} unsupported claims the quote checks let through, wrongly removed ${labelled.supportedRemoved}/${labelled.supported} supported claims`,
  );
}

const run = {
  ranAt: new Date().toISOString(),
  briefModel: process.env["BRIEF_MODEL"] ?? "claude-haiku-4-5-20251001",
  verifierModel: VERIFIER_MODEL,
  judgeModel: JUDGE_MODEL,
  labelled,
  results,
};
if (!only) {
  mkdirSync(path.join(here, "reports"), { recursive: true });
  const stamp = run.ranAt.slice(0, 16).replace(/[:T]/g, "-");
  writeFileSync(path.join(here, "reports", `${stamp}.json`), `${JSON.stringify(run, null, 2)}\n`);
  writeFileSync(path.join(here, "REPORT.md"), renderReport(run));
  console.log(`\nWrote eval/REPORT.md and eval/reports/${stamp}.json`);
  // --check: fail the run when a measure is past its limit (used by the scheduled workflow).
  const failures = checkThresholds(run);
  if (failures.length > 0) {
    console.log(`\n${failures.length} measure(s) past their limit:\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    if (process.argv.includes("--check")) process.exit(1);
  } else {
    console.log("\nEvery measure is within its limit.");
  }
} else {
  console.log("\n(partial run: report files not written)");
}
