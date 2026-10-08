# Brief evaluation

Run 2026-10-08 21:51 UTC · writer `claude-haiku-4-5-20251001` · verifier `claude-haiku-4-5-20251001` · grader `claude-sonnet-5-5`

Each case replays sources recorded on one day through the production pipeline, so scores move only when the prompt, the model or the checks change. Claim support and expected facts are graded by a second model, not by a person.

**Result: every measure is within its limit.**

## Headline numbers

| Measure | Result |
|---|---|
| Briefs produced | 100% (16/16) |
| In-scope / out-of-scope judged correctly | 100% (16/16) |
| Kept claims the grader found fully supported | 87% (61/70) |
| Kept claims partly supported | 13% (9/70) |
| Kept claims unsupported | 0% (0/70) |
| Claims discarded by the quote checks | 10% (8/82) |
| Claims then removed by the verifier | 5% (4/82) |
| Briefs where the verifier ran | 100% (12/12) |
| Expected facts conveyed | 74% (14/19) |
| Main pin in the right region | 92% (11/12) |
| Main pin in the wrong region | 0% (0/12) |
| No main pin drawn | 8% (1/12) |
| Median seconds per brief | 27 |
| Tokens per brief (in / out, mean) | 3428 / 2324 |

Expected-fact lists reviewed by a person: 0 of 10 cases.

## By case

| Case | Sources | Scope | Claims kept / proposed | Supported / partly / unsupported | Expected facts | Main pin | Event pins | Seconds |
|---|---|---|---|---|---|---|---|---|
| sudan | 10 | correct | 7 / 7 | 5 / 2 / 0 | 3 / 3 | correct | 1 | 26 |
| gaza-ceasefire | 13 | correct | 6 / 8 | 5 / 1 / 0 | 1 / 3 | correct | 2 | 32 |
| ukraine-front-line | 13 | correct | 7 / 8 | 6 / 1 / 0 | 1 / 2 | correct | 2 | 31 |
| red-sea-shipping | 12 | correct | 7 / 9 | 6 / 1 / 0 | 2 / 2 | correct | 1 | 43 |
| myanmar | 10 | correct | 8 / 10 | 7 / 1 / 0 | 1 / 2 | correct | 1 | 37 |
| dr-congo-m23 | 4 | correct | 4 / 4 | 3 / 1 / 0 | 1 / 1 | correct | 2 | 26 |
| yemen-houthis | 12 | correct | 9 / 9 | 8 / 1 / 0 | 2 / 2 | correct | 1 | 33 |
| haiti-gangs | 5 | correct | 6 / 6 | 6 / 0 / 0 | 2 / 2 | correct | 3 | 53 |
| lebanon-israel | 4 | correct | 4 / 6 | 4 / 0 / 0 | 1 / 1 | correct | 0 | 27 |
| mali-sahel | 1 | correct | 4 / 4 | 4 / 0 / 0 | — | correct | 0 | 23 |
| taiwan-strait | 2 | correct | 3 / 3 | 2 / 1 / 0 | — | none | 2 | 18 |
| south-sudan | 13 | correct | 5 / 8 | 5 / 0 / 0 | 0 / 1 | correct | 2 | 35 |
| oos-recipe | 5 | correct | 4 / 5 | 0 / 0 / 0 | — | n/a | 0 | 9 |
| oos-football | 7 | correct | 1 / 4 | 0 / 0 / 0 | — | n/a | 0 | 7 |
| oos-phone | 3 | correct | 3 / 3 | 0 / 0 / 0 | — | n/a | 0 | 8 |
| oos-python | 1 | correct | 3 / 3 | 0 / 0 / 0 | — | n/a | 0 | 6 |

## Against hand-labelled claims

These claims have a right answer written down by a person, so this is a measurement and not a model's opinion.

| Measure | Result |
|---|---|
| Unsupported claims stopped by the quote checks | 8 of 11 |
| Of the rest, removed by the verifier | 3 of 3 |
| Unsupported claims that passed both checks | 0 of 11 |
| Supported claims the verifier wrongly removed | 0 of 9 |

## Why the quote checks discarded claims

- figure not in the quoted text: 5
- shares no substance with its quotes: 2
- needs quotes from 2 sources, has 1: 1

## Kept claims the grader did not fully support

- **sudan** (partly, cites S5): Sudan's military chief rejected talks and vowed to take territory from the Rapid Support Forces.
  - S5 says al-Burhan vowed to take every inch of RSF territory while 'rejecting ...' (truncated), so rejecting talks is not stated in S5's text.
- **sudan** (partly, cites S5, S7): Sudan's military leader rejected ceasefire talks and committed to military victory over the Rapid Support Forces.
  - S7's headline says al-Burhan rejects talks and vows to retake territory, but 'ceasefire' talks specifically and 'military victory' are not stated.
- **gaza-ceasefire** (partly, cites S4): Almost two million people live in ruins across Gaza.
  - S4 says almost two million people live in ruins, but not 'across Gaza' specifically; it says 'the territory's' population, which is close, though minor wording difference.
- **ukraine-front-line** (partly, cites S2): Civilians, including children, have been killed in Russian strikes, with buildings reduced to ruins.
  - S2's headline says children were among heavy casualties and a building was reduced to rubble, but the text does not explicitly say civilians were killed.
- **red-sea-shipping** (partly, cites S1, S5): An Iran-allied militia captured strategically important Red Sea territory, though Saudi-backed forces gave conflicting reports on whether they seized Mokha port.
  - S5 gives the militia capture, S1 the conflicting Mokha reports, but S1 does not say who captured what; the combination is loosely consistent, yet the sources are conflated (S1 says Yemeni military secured waterway, not that Houthis captured it).
- **myanmar** (partly, cites S1, S4): Humanitarian and rights organizations have raised concerns about the safety of repatriated migrants.
  - S1 gives rights monitors and S4 gives UNHCR, but 'humanitarian organizations' broadly is slightly generalized; core is supported.
- **dr-congo-m23** (partly, cites S3): M23 fighters have killed, tortured and forcibly recruited artisanal miners in eastern Democratic Republic of Congo and helped traffic gold and coltan into Rwanda.
  - S3 gives these allegations, but as Amnesty International's findings about Rwanda-backed M23; the claim states them as established fact without attribution.
- **yemen-houthis** (partly, cites S1, S9): BBC News's headline frames the escalation as government-initiated action ('announces all-out war'); NBC News's framing emphasizes the Saudi-led coalition's response to Houthi territorial control ('have launched a major offensive to retake territory').
  - The headline and subheading wording matches, but the claim that BBC frames it as government-initiated and NBC emphasizes the coalition response is interpretive characterization not in the cited text.
- **taiwan-strait** (partly, cites S1): Taiwan's proposed military spending increase could heighten tensions across the Taiwan Strait.
  - S1 says China warned the spending increase could heighten tensions; the claim states this as fact rather than as China's warning.

## Expected facts not conveyed

- **gaza-ceasefire**: Israeli strikes on Gaza on the October 7 anniversary killed three people.
- **gaza-ceasefire**: The WHO appealed for a large increase in aid to Gaza before winter.
- **ukraine-front-line**: Zelenskyy said intelligence shows Russia is preparing a massive attack.
- **myanmar**: The Irrawaddy counted 383 civilians killed in 21 massacres in Rakhine.
- **south-sudan**: South Sudan rejected claims that it had ordered foreigners to leave.

## Main pins that were wrong or missing

- **taiwan-strait**: none — no city named

