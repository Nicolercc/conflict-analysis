# Brief evaluation

Run 2026-10-08 22:32 UTC · writer `claude-haiku-4-5-20251001` · verifier `claude-haiku-4-5-20251001` · grader `claude-sonnet-5-5`

Each case replays sources recorded on one day through the production pipeline, so scores move only when the prompt, the model or the checks change. Claim support and expected facts are graded by a second model, not by a person.

**Result: every measure is within its limit.**

## Headline numbers

| Measure | Result |
|---|---|
| Briefs produced | 100% (16/16) |
| In-scope / out-of-scope judged correctly | 100% (16/16) |
| Kept claims the grader found fully supported | 90% (66/73) |
| Kept claims partly supported | 10% (7/73) |
| Kept claims unsupported | 0% (0/73) |
| Claims discarded by the quote checks | 23% (23/101) |
| Claims then removed by the verifier | 5% (5/101) |
| Briefs where the verifier ran | 100% (12/12) |
| Expected facts conveyed | 74% (14/19) |
| Main pin in the right region | 100% (12/12) |
| Main pin in the wrong region | 0% (0/12) |
| No main pin drawn | 0% (0/12) |
| Median seconds per brief | 36 |
| Tokens per brief (in / out, mean) | 5156 / 2683 |

Expected-fact lists reviewed by a person: 0 of 10 cases.

## By case

| Case | Sources | Scope | Claims kept / proposed | Supported / partly / unsupported | Expected facts | Main pin | Event pins | Seconds |
|---|---|---|---|---|---|---|---|---|
| sudan | 10 | correct | 7 / 10 | 7 / 0 / 0 | 3 / 3 | correct | 3 | 39 |
| gaza-ceasefire | 13 | correct | 8 / 11 | 7 / 1 / 0 | 1 / 3 | correct | 1 | 43 |
| ukraine-front-line | 13 | correct | 5 / 9 | 4 / 1 / 0 | 1 / 2 | correct | 0 | 42 |
| red-sea-shipping | 12 | correct | 6 / 9 | 6 / 0 / 0 | 1 / 2 | correct | 1 | 38 |
| myanmar | 10 | correct | 8 / 10 | 6 / 2 / 0 | 2 / 2 | correct | 1 | 42 |
| dr-congo-m23 | 4 | correct | 4 / 8 | 4 / 0 / 0 | 1 / 1 | correct | 3 | 36 |
| yemen-houthis | 12 | correct | 9 / 10 | 6 / 3 / 0 | 1 / 2 | correct | 1 | 49 |
| haiti-gangs | 5 | correct | 7 / 8 | 7 / 0 / 0 | 2 / 2 | correct | 3 | 30 |
| lebanon-israel | 4 | correct | 6 / 8 | 6 / 0 / 0 | 1 / 1 | correct | 2 | 34 |
| mali-sahel | 1 | correct | 3 / 3 | 3 / 0 / 0 | — | correct | 1 | 22 |
| taiwan-strait | 2 | correct | 4 / 6 | 4 / 0 / 0 | — | correct | 2 | 28 |
| south-sudan | 13 | correct | 6 / 9 | 6 / 0 / 0 | 1 / 1 | correct | 1 | 42 |
| oos-recipe | 5 | correct | 2 / 2 | 0 / 0 / 0 | — | n/a | 0 | 6 |
| oos-football | 7 | correct | 0 / 0 | 0 / 0 / 0 | — | n/a | 0 | 4 |
| oos-phone | 3 | correct | 0 / 0 | 0 / 0 / 0 | — | n/a | 0 | 3 |
| oos-python | 1 | correct | 0 / 0 | 0 / 0 / 0 | — | n/a | 0 | 3 |

## Against hand-labelled claims

These claims have a right answer written down by a person, so this is a measurement and not a model's opinion.

| Measure | Result |
|---|---|
| Unsupported claims stopped by the quote checks | 8 of 11 |
| Of the rest, removed by the verifier | 3 of 3 |
| Unsupported claims that passed both checks | 0 of 11 |
| Supported claims the verifier wrongly removed | 0 of 9 |

## Why the quote checks discarded claims

- figure not in the quoted text: 10
- quote not found in the cited source: 9
- needs quotes from 2 sources, has 1: 4

## Kept claims the grader did not fully support

- **gaza-ceasefire** (partly, cites S3, S4): Hundreds of thousands of displaced people in Gaza live in tent cities and makeshift shelters.
  - S3 supports hundreds of thousands in tent cities and shelters; S4 only says most live in squalid tent camps, and the phrase is attributed mainly to S3.
- **ukraine-front-line** (partly, cites S1, S4): Russian strikes on Ukrainian infrastructure have targeted apartment buildings, schools, medical centres, railways and shops.
  - S4 lists apartment buildings, schools, medical centres, railways and shops as hit; S1 only covers railways, and S4 does not say the strikes were on infrastructure per se.
- **myanmar** (partly, cites S7): Myanmar's military has killed 383 civilians in 21 massacres in Rakhine State.
  - S7 headline gives 383 civilians in 21 Rakhine massacres as an Irrawaddy tally, but the claim states it as fact without attribution, and S7 ties it to roughly three years of fighting, not stated in the claim.
- **myanmar** (partly, cites S3): Myanmar's military-backed leader arrived in Malaysia on Wednesday for talks with the two nations working to repatriate thousands of Myanmar nationals.
  - S3 says he arrived Wednesday for talks as the nations work on repatriation, but the claim doesn't name him or say the talks are with Malaysia's PM (Thursday); it's essentially stated, though garbled.
- **yemen-houthis** (partly, cites S1): The Houthis cut a vital supply route linking Taiz with Aden, effectively encircling the key city of Taiz held by government forces.
  - S1 says the Houthis cut the route and, per AFP, effectively encircled Taiz, but it is an AFP report citing military sources; the claim states it as fact and Taiz is not fully taken.
- **yemen-houthis** (partly, cites S3, S9): Fighting has intensified around the Bab el-Mandeb Strait and the strategic town of Mocha/Mokha.
  - S3 and S9 describe fighting near Bab el-Mandeb and around Mocha/Dhubab, but S3 says the Mocha claim was premature, and S9 centers fighting at Dhubab, so intensification around Mocha is not directly stated.
- **yemen-houthis** (partly, cites S2, S9): The Hindu reports the Houthis claimed they targeted Abha airport and King Khalid Air Base with claims of hitting targets accurately, whereas NBC News reports Houthi spokesman Yahya Saree said the rebels launched attacks targeting these sites but did not provide evidence.
  - S2 mentions Abha airport and King Khalid Air Base (Khamis Mushait) with 'hit their targets accurately' and S9 says no evidence was provided, but S9 doesn't use King Khalid Air Base, and the claim's contrast is the grader's framing.

## Expected facts not conveyed

- **gaza-ceasefire**: Israeli strikes on Gaza on the October 7 anniversary killed three people.
- **gaza-ceasefire**: The WHO appealed for a large increase in aid to Gaza before winter.
- **ukraine-front-line**: Zelenskyy said intelligence shows Russia is preparing a massive attack.
- **red-sea-shipping**: A product tanker was attacked in the Red Sea.
- **yemen-houthis**: The Houthis attacked Aden airport.

