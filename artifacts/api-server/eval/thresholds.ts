import type { CaseResult } from "./run";

/**
 * The limits a full evaluation run must stay within. A change that pushes any
 * measure past its limit fails the scheduled evaluation. Tighten a limit when
 * the measure has stayed comfortably inside it for several runs; do not loosen
 * one to make a run pass.
 */
export const LIMITS = {
  /** Every case must produce a brief. */
  minBriefsProduced: 1,
  /** Every case must be judged in or out of scope correctly. */
  minScopeCorrect: 1,
  /** Share of kept claims the grader finds fully supported. Three runs after quotes and the verifier landed gave 87–89%. */
  minFullySupported: 0.82,
  /** Share of kept claims the grader finds unsupported. */
  maxUnsupported: 0.03,
  /** A main pin in the wrong region is never acceptable; no pin is. */
  maxWrongPins: 0,
  /** Share of expected facts the briefs convey. */
  minExpectedFacts: 0.6,
  /** On the labelled set: unsupported claims that get past both checks. */
  maxLabelledUnsupportedPassed: 1,
  /** On the labelled set: supported claims the verifier wrongly removes. */
  maxLabelledSupportedRemoved: 2,
};

type Run = {
  results: CaseResult[];
  labelled: null | { ran: boolean; supportedRemoved: number; unsupportedReachingVerifier: number; unsupportedRemoved: number };
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** One line per measure that is past its limit; empty when the run passes. */
export function checkThresholds(run: Run, limits = LIMITS): string[] {
  const all = run.results;
  const inScope = all.filter((r) => r.scope.expected);
  const sum = (f: (r: CaseResult) => number) => inScope.reduce((a, r) => a + f(r), 0);
  const judged = sum((r) => r.judged.supported + r.judged.partly + r.judged.unsupported);
  const expected = sum((r) => r.expected.total);
  const failures: string[] = [];
  const need = (ok: boolean, line: string) => {
    if (!ok) failures.push(line);
  };

  const produced = all.filter((r) => r.ok).length / Math.max(1, all.length);
  need(produced >= limits.minBriefsProduced, `briefs produced ${pct(produced)}, needs ${pct(limits.minBriefsProduced)}`);
  const scope = all.filter((r) => r.scope.correct).length / Math.max(1, all.length);
  need(scope >= limits.minScopeCorrect, `scope judged correctly ${pct(scope)}, needs ${pct(limits.minScopeCorrect)}`);
  if (judged > 0) {
    const supported = sum((r) => r.judged.supported) / judged;
    need(supported >= limits.minFullySupported, `fully supported claims ${pct(supported)}, needs at least ${pct(limits.minFullySupported)}`);
    const unsupported = sum((r) => r.judged.unsupported) / judged;
    need(unsupported <= limits.maxUnsupported, `unsupported claims ${pct(unsupported)}, limit ${pct(limits.maxUnsupported)}`);
  } else {
    failures.push("no claims were graded");
  }
  const wrongPins = inScope.filter((r) => r.pin === "wrong").length;
  need(wrongPins <= limits.maxWrongPins, `${wrongPins} main pin(s) in the wrong region, limit ${limits.maxWrongPins}`);
  if (expected > 0) {
    const conveyed = sum((r) => r.expected.conveyed) / expected;
    need(conveyed >= limits.minExpectedFacts, `expected facts conveyed ${pct(conveyed)}, needs at least ${pct(limits.minExpectedFacts)}`);
  }
  if (run.labelled) {
    need(run.labelled.ran, "the verifier did not run on the labelled set");
    const passed = run.labelled.unsupportedReachingVerifier - run.labelled.unsupportedRemoved;
    need(passed <= limits.maxLabelledUnsupportedPassed, `${passed} labelled unsupported claim(s) passed both checks, limit ${limits.maxLabelledUnsupportedPassed}`);
    need(run.labelled.supportedRemoved <= limits.maxLabelledSupportedRemoved, `${run.labelled.supportedRemoved} labelled supported claim(s) wrongly removed, limit ${limits.maxLabelledSupportedRemoved}`);
  }
  return failures;
}
