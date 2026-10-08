# Brief evaluation

Run 2026-10-08 10:44 UTC · brief model `claude-haiku-4-5-20251001` · grader `claude-sonnet-5-5`

Each case replays sources recorded on one day through the production pipeline, so scores move only when the prompt, the model or the checks change. Claim support and expected facts are graded by a second model, not by a person.

## Headline numbers

| Measure | Result |
|---|---|
| Briefs produced | 100% (16/16) |
| In-scope / out-of-scope judged correctly | 100% (16/16) |
| Kept claims the grader found fully supported | 82% (64/78) |
| Kept claims partly supported | 17% (13/78) |
| Kept claims unsupported | 1% (1/78) |
| Claims the server's checks discarded | 4% (3/81) |
| Expected facts conveyed | 84% (16/19) |
| Main pin in the right region | 100% (12/12) |
| Main pin in the wrong region | 0% (0/12) |
| No main pin drawn | 0% (0/12) |
| Median seconds per brief | 22 |
| Tokens per brief (in / out, mean) | 2401 / 1613 |

Expected-fact lists reviewed by a person: 0 of 10 cases.

## By case

| Case | Sources | Scope | Claims kept / proposed | Supported / partly / unsupported | Expected facts | Main pin | Event pins | Seconds |
|---|---|---|---|---|---|---|---|---|
| sudan | 10 | correct | 7 / 7 | 7 / 0 / 0 | 3 / 3 | correct | 1 | 23 |
| gaza-ceasefire | 13 | correct | 10 / 10 | 7 / 3 / 0 | 2 / 3 | correct | 2 | 29 |
| ukraine-front-line | 13 | correct | 6 / 7 | 5 / 1 / 0 | 1 / 2 | correct | 2 | 21 |
| red-sea-shipping | 12 | correct | 8 / 8 | 4 / 3 / 1 | 2 / 2 | correct | 2 | 26 |
| myanmar | 10 | correct | 9 / 9 | 9 / 0 / 0 | 1 / 2 | correct | 3 | 29 |
| dr-congo-m23 | 4 | correct | 5 / 5 | 5 / 0 / 0 | 1 / 1 | correct | 3 | 22 |
| yemen-houthis | 12 | correct | 9 / 9 | 7 / 2 / 0 | 2 / 2 | correct | 1 | 21 |
| haiti-gangs | 5 | correct | 7 / 7 | 6 / 1 / 0 | 2 / 2 | correct | 3 | 25 |
| lebanon-israel | 4 | correct | 2 / 4 | 2 / 0 / 0 | 1 / 1 | correct | 1 | 23 |
| mali-sahel | 1 | correct | 4 / 4 | 4 / 0 / 0 | — | correct | 1 | 18 |
| taiwan-strait | 2 | correct | 4 / 4 | 3 / 1 / 0 | — | correct | 3 | 19 |
| south-sudan | 13 | correct | 7 / 7 | 5 / 2 / 0 | 1 / 1 | correct | 2 | 24 |
| oos-recipe | 5 | correct | 6 / 6 | 0 / 0 / 0 | — | n/a | 0 | 5 |
| oos-football | 7 | correct | 4 / 4 | 0 / 0 / 0 | — | n/a | 0 | 5 |
| oos-phone | 3 | correct | 5 / 5 | 0 / 0 / 0 | — | n/a | 0 | 5 |
| oos-python | 1 | correct | 3 / 3 | 0 / 0 / 0 | — | n/a | 0 | 4 |

## Why the server discarded claims

- shares no substance with cited sources: 3

## Kept claims the grader did not fully support

- **gaza-ceasefire** (partly, cites S8, S12): Palestinians in Gaza face ongoing humanitarian hardship including food and water shortages, displacement, and lack of aid.
  - S8 and S12 mention hunger, limited food and water, displacement and aid shortage; S12 snippet doesn't state water shortage or displacement, but S8 covers them; mostly supported though 'lack of aid' is slightly stronger than 'shortage'.
- **gaza-ceasefire** (partly, cites S3, S4): The October 7 anniversary marked three years since the initial Hamas attack and subsequent Israeli offensive.
  - Sources give the third anniversary of Oct 7 attack, but neither S3 nor S4 mentions an Israeli offensive following it, nor names Hamas as attacker.
- **gaza-ceasefire** (partly, cites S8, S12): HuffPost's headline describes Gaza's ceasefire as 'So-Called,' suggesting it is contested or incomplete; CBC.ca reports Palestinians 'continue to endure hunger, collapsing buildings and almost daily airstrikes — despite the year-old' ceasefire, similarly questioning its substance.
  - Quotes are accurate, but the interpretation that they suggest the ceasefire is contested or questioned in substance is an inference beyond the text.
- **ukraine-front-line** (partly, cites S2, S3): Russian forces are conducting sustained strikes on Ukrainian targets across multiple regions
  - Multiple regions are supported by S3, but 'sustained' strikes is a characterization not stated; S2 covers a single strike in Pryluky.
- **red-sea-shipping** (partly, cites S1): Yemeni military said it has 'secured' the Red Sea waterway, though Saudi-backed forces gave conflicting reports on whether they had seized the port city of Mokha near the Bab al-Mandab Strait.
  - S1 gives the 'secured' statement and the conflicting reports, but 'Yemeni military' is as stated; the claim is accurate, though it doesn't say which side's military, which is fine; essentially supported with minor ambiguity.
- **red-sea-shipping** (partly, cites S4): Global shipping avoids the Suez route due to war-risk insurance premiums, favoring the Cape of Good Hope route instead.
  - S4 snippet says shipping avoids Suez due to war-risk premiums and favors Cape of ..., but 'Good Hope' is truncated in the text.
- **red-sea-shipping** (unsupported, cites S1, S5): Houthi forces have taken control of strategic Red Sea territory in Yemen including the Mokha area.
  - Neither S1 nor S5 says the Houthis took Mokha; S1 describes conflicting reports about Saudi-backed forces seizing it.
- **red-sea-shipping** (partly, cites S1, S5): BBC News reports 'conflicting reports' from Saudi-backed forces on whether Mokha was seized; Moneycontrol describes the Houthi capture as a 'rapid offensive' that 'exposed divisions' within those same forces.
  - S1 gives the conflicting reports and S5 the rapid offensive and divisions, but the 'exposed divisions' quote is a paraphrase ('exposing divisions') and S1 doesn't say it's from BBC reporting of Mokha as stated here.
- **yemen-houthis** (partly, cites S1): Yemen's president announced all-out war to reclaim land from Houthis amid an exchange of strikes between the Houthis and the Saudi-led coalition.
  - Source says the Yemeni president announced all-out war amid an exchange of strikes, but the headline doesn't name the Saudi-led coalition's strikes as anything beyond that; actually it does mention it, so only minor wording differs.
- **yemen-houthis** (partly, cites S8): Saudi airports including Abha International Airport, near the Yemen border, and King Khalid International Airport in Riyadh have come under attack.
  - S8 says both airports came under attack per Saudi aviation authority, but 'including' implies others and the claim omits attribution.
- **haiti-gangs** (partly, cites S1, S4): Gang violence in Haiti has reached a critical level with significant loss of life and territorial control.
  - Sources describe casualties and expanding gangs, but 'critical level' and territorial control are not stated in S1/S4 excerpts.
- **taiwan-strait** (partly, cites S1): Taiwan has received US-made fighter jets.
  - S1 says reports indicate the island received two US-made items, but the text is truncated and does not say they are fighter jets, and it frames this as reports.
- **south-sudan** (partly, cites S1): South Sudan moved to dispel reports that foreigners have been given seven days to leave the country, with the government saying it remains open to legally resident foreigners but wants them to stay out of small-scale retail.
  - S1 attributes the statement to Juba County Caretaker Commissioner, not the national government, and 'government remains open' is stated, but 'South Sudan moved to dispel' is fine; the national-level attribution is a slight stretch.
- **south-sudan** (partly, cites S1, S11): Tuko News's headline says 'South Sudan Bans Foreigners From Retail Trade, Kenyan Traders at Risk of Closure'; AllAfrica's headline says 'South Sudan Rejects Claims of Foreigners' Expulsion Order' and quotes the government saying it 'remains open to legally resident foreigners but wants them to stay out of small-scale retail.'
  - Headlines are accurate, but the quote is paraphrased in S1 rather than a direct government quotation, and it is from a county commissioner.

## Expected facts not conveyed

- **gaza-ceasefire**: A UN agency reported a surge in violence against women in Gaza.
- **ukraine-front-line**: Zelenskyy said intelligence shows Russia is preparing a massive attack.
- **myanmar**: The Irrawaddy counted 383 civilians killed in 21 massacres in Rakhine.

