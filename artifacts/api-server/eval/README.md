# Evaluation

Two layers measure whether briefs can be trusted.

## 1. Labelled claim set (runs in CI, no key)

`claim-check-set.json` holds hand-labelled claims with the source text they cite.
`src/brief/claim-set.test.ts` runs the server's claim checks over it and asserts
the exact result: every supported claim kept, and how many unsupported claims
are caught. The ones the checks miss are listed as known gaps, so a change in
either direction fails the test and has to be acknowledged.

## 2. Recorded cases (run by hand, needs an API key)

```bash
pnpm --filter @workspace/api-server eval            # all 16 cases, writes REPORT.md
pnpm --filter @workspace/api-server eval --only sudan,gaza-ceasefire
pnpm --filter @workspace/api-server eval:record     # snapshot topics that have none
pnpm --filter @workspace/api-server eval:record --deepen   # keep each case's sources, re-read their articles in full
```

- `topics.ts` — 12 conflict topics and 4 that are out of scope, each with the
  region its main map pin must fall in.
- `cases/*.json` — the sources retrieval returned on the day they were recorded.
  A run replays them, so scores move only when the prompt, the model or the
  checks change. Re-record (`--force`) only on purpose: it resets the baseline.
- `expectations.ts` — facts each brief should carry. Drafted from headlines;
  see "Review by a person" below.
- `judge.ts` — a stronger model than the one that wrote or verified the brief
  grades each kept claim against the text it cites: supported, partly, or unsupported.
- `labelled.ts` — runs the verifier over the hand-labelled claims, the one place
  its accuracy is measured against answers a person wrote down.
- `REPORT.md` — the latest full run. `reports/` keeps each run's raw results.

## What a run costs, and whose credit it spends

A full run makes about 40 model calls (16 briefs, their verifier passes, and a grading call per in-scope case with a stronger model). Give the evaluation **its own API key with its own spending limit** and set it as `EVAL_ANTHROPIC_API_KEY`; the runner then uses it in place of the server's key. Without it the run spends from the same credit as the live site, and repeated runs can exhaust it — which takes the site down. That happened once during development.

## Reading the numbers

- The grader is a model. Treat its rates as estimates and read the failures it
  lists; they are quoted in full in the report.
- One run is one sample. The same case can score differently twice in a row, so
  compare changes over two or three runs before believing a small difference.
- A full run makes 16 brief calls and up to 12 grading calls.

## Limits

`thresholds.ts` holds the limits a full run must stay within: every brief produced, scope always right, at least 82% of kept claims fully supported, at most 3% unsupported, no main pin in the wrong region, and on the labelled set at most one unsupported claim past both checks. `pnpm eval -- --check` exits non-zero when any is exceeded. The `Evaluation` workflow runs that weekly, on demand, and on pull requests that touch the brief pipeline; it needs an `EVAL_ANTHROPIC_API_KEY` repository secret and skips itself without one.

## Review by a person

```bash
pnpm --filter @workspace/api-server eval:review
```

Shows each case's sources and expected facts and asks for approval. Approvals are recorded in `reviews.json` with who and when, and lapse if the case changes.

## History

| Date | Change | Fully supported | Partly | Unsupported | Expected facts | Main pin correct |
|---|---|---|---|---|---|---|
| 2026-10-08 | Baseline (two runs) | 54–66% | 28–40% | 6% | 68–95% | 67–92% |
| 2026-10-08 | Prompt: restate, one statement per claim, cite only sources that state it, no "frames/emphasises" (two runs) | 82–86% | 11–17% | 1–2% | 84–95% | 92–100% |

| 2026-10-08 | Quote-backed claims, second-model verifier that corrects or removes (three runs) | 87–89% | 11–13% | 0% | 63–84% | 83–100% |

On the hand-labelled set the quote checks stop 8 of 11 unsupported claims and the verifier deals with the other 3, with no supported claim removed.

| 2026-10-08 | Articles read in full for about 60% of news sources; quotes may elide with an ellipsis (one complete run) | 90% | 10% | 0% | 74% | 100% |

The earlier prompt change also stopped out-of-scope topics from occasionally being answered in prose instead of JSON (12 of 12 in three repeat runs).
