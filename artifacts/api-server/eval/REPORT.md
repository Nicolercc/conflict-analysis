# Brief evaluation

Run 2026-10-08 03:13 UTC · brief model `claude-haiku-4-5-20251001` · grader `claude-sonnet-5-5`

Each case replays sources recorded on one day through the production pipeline, so scores move only when the prompt, the model or the checks change. Claim support and expected facts are graded by a second model, not by a person.

## Headline numbers

| Measure | Result |
|---|---|
| Briefs produced | 100% (16/16) |
| In-scope / out-of-scope judged correctly | 100% (16/16) |
| Kept claims the grader found fully supported | 54% (49/90) |
| Kept claims partly supported | 40% (36/90) |
| Kept claims unsupported | 6% (5/90) |
| Claims the server's checks discarded | 9% (9/99) |
| Expected facts conveyed | 95% (18/19) |
| Main pin in the right region | 92% (11/12) |
| Main pin in the wrong region | 0% (0/12) |
| No main pin drawn | 8% (1/12) |
| Median seconds per brief | 26 |
| Tokens per brief (in / out, mean) | 2117 / 1840 |

Expected-fact lists reviewed by a person: 0 of 10 cases.

## By case

| Case | Sources | Scope | Claims kept / proposed | Supported / partly / unsupported | Expected facts | Main pin | Event pins | Seconds |
|---|---|---|---|---|---|---|---|---|
| sudan | 10 | correct | 9 / 10 | 5 / 3 / 1 | 3 / 3 | correct | 2 | 27 |
| gaza-ceasefire | 13 | correct | 8 / 9 | 3 / 5 / 0 | 3 / 3 | correct | 2 | 32 |
| ukraine-front-line | 13 | correct | 9 / 11 | 4 / 3 / 2 | 2 / 2 | none | 1 | 26 |
| red-sea-shipping | 12 | correct | 9 / 11 | 7 / 2 / 0 | 2 / 2 | correct | 1 | 30 |
| myanmar | 10 | correct | 11 / 11 | 7 / 4 / 0 | 2 / 2 | correct | 0 | 32 |
| dr-congo-m23 | 4 | correct | 6 / 6 | 1 / 5 / 0 | 1 / 1 | correct | 2 | 26 |
| yemen-houthis | 12 | correct | 11 / 11 | 5 / 4 / 2 | 2 / 2 | correct | 0 | 28 |
| haiti-gangs | 5 | correct | 8 / 8 | 3 / 5 / 0 | 2 / 2 | correct | 3 | 24 |
| lebanon-israel | 4 | correct | 3 / 4 | 2 / 1 / 0 | 1 / 1 | correct | 2 | 23 |
| mali-sahel | 1 | correct | 4 / 4 | 4 / 0 / 0 | — | correct | 1 | 19 |
| taiwan-strait | 2 | correct | 5 / 5 | 3 / 2 / 0 | — | correct | 3 | 22 |
| south-sudan | 13 | correct | 7 / 9 | 5 / 2 / 0 | 0 / 1 | correct | 1 | 29 |
| oos-recipe | 5 | correct | 6 / 6 | 0 / 0 / 0 | — | n/a | 0 | 6 |
| oos-football | 7 | correct | 4 / 4 | 0 / 0 / 0 | — | n/a | 3 | 15 |
| oos-phone | 3 | correct | 3 / 3 | 0 / 0 / 0 | — | n/a | 0 | 5 |
| oos-python | 1 | correct | 3 / 3 | 0 / 0 / 0 | — | n/a | 0 | 7 |

## Why the server discarded claims

- figure not in cited sources: 5
- shares no substance with cited sources: 4

## Kept claims the grader did not fully support

- **sudan** (partly, cites S8): Sudan's gold exports earned US$2.29 billion from January to September 2026, while US sanctions target gold linked to the war.
  - S8 gives the figure, but only says Jan to September without a year stated; the year is inferable from the publication date, and the sanctions point is stated, so the minor addition is the year.
- **sudan** (partly, cites S5, S7): Multiple sources report that Sudan's military leadership has rejected negotiations and vowed to continue military operations against the RSF.
  - S5 and S7 both support rejecting talks and vowing to retake territory, but 'continue military operations' is a mild paraphrase; S5 snippet's rejection is truncated, S7 headline states rejection.
- **sudan** (unsupported, cites S2, S5): Associated Press emphasizes paramilitary RSF responsibility for specific drone strikes on civilian areas, while broader coverage frames the conflict as a two-sided war without attributing every incident.
  - The cited S2 and S5 do not discuss AP's framing versus broader coverage; this is an editorial characterization not in the sources.
- **sudan** (partly, cites S9, S3): La Civiltà Cattolica frames the situation through humanitarian and religious appeals for ceasefire, while other sources focus on military positions and diplomatic stalling.
  - S9 mentions Pope Leo XIV's call for ceasefire and humanitarian corridors, but 'religious appeals' framing and S3's description as focused on military positions is not stated; S3 does cover diplomacy, not stalling.
- **gaza-ceasefire** (partly, cites S13): A peace plan negotiated by the United States was announced on September 29, 2025, signed on October 9, and came into effect the following day, with UN Security Council endorsement on November 17.
  - Dates and UNSC endorsement are stated, but S13 says it was negotiated by Israel/Hamas in consultation with Arab states and led by Trump; 'negotiated by the United States' is a slight mischaracterization, though broadly consistent with 'Led by US'.
- **gaza-ceasefire** (partly, cites S3): Israel struck Gaza on October 7 with at least three reported dead, with strikes audible from the Nova festival memorial site where families gathered to mourn more than 300 revellers killed three years earlier.
  - Headline gives three dead and Nova mourning with bangs audible, but 'at least' and 'strikes audible' (bangs across the border) are close; however 'Israel struck' is supported; minor embellishment of 'at least'.
- **gaza-ceasefire** (partly, cites S4, S10, S12): Almost two million people live in ruins in Gaza, with the territory described as neither at war nor at peace, marked by disease, despair and collapsing buildings.
  - Almost two million living in ruins (S4), 'neither war nor peace', disease and despair (S10), and collapsing buildings (S12) are given, but the claim merges them and the 'neither at war nor at peace' framing is a quote not a description of the territory in all sources.
- **gaza-ceasefire** (partly, cites S8, S10, S12): Multiple sources report that Palestinians in Gaza continue to endure airstrikes, limited humanitarian access, disease, malnutrition, displacement and devastated infrastructure despite the year-old ceasefire.
  - Airstrikes, hunger, collapsing buildings, disease and ruins are covered, but malnutrition, limited humanitarian access and displacement are only partially supported across the cited sources (displacement and aid shortage in S8; hunger in S12).
- **gaza-ceasefire** (partly, cites S3, S4): Israeli and Palestinian positions on the October 7 anniversary are starkly divergent: Israelis commemorate the attack and remember hostages, while Palestinians mark the event amid ongoing ruins and strikes.
  - Israelis commemorating and Palestinians in ruins are stated, but hostages are mentioned only as taken, and 'starkly divergent positions' is an interpretation not stated by the sources.
- **ukraine-front-line** (partly, cites S3): Russia carried out multiple overnight strikes on Ukrainian military-industrial enterprises in several regions, including the Flamingo Missile Facilities.
  - S3 says strikes hit military-industrial enterprises in several regions, and the headline mentions Flamingo missile facilities, but the claim's 'including' link to the overnight strikes is not stated in the text.
- **ukraine-front-line** (partly, cites S2): Children were among heavy casualties in Ukraine after Russian strikes in Pryluky, in the Chernigiv region, with buildings reduced to charred concrete and twisted metal.
  - S2 supports children among heavy casualties and the Pryluky blast, but it describes one half of a single five-storey building, not 'buildings'.
- **ukraine-front-line** (partly, cites S1, S2, S3): Multiple sources report Russian strikes on Ukrainian targets, including civilian areas and military infrastructure.
  - S2 and S3 show strikes on civilian and military targets, and S1 mentions attacks on rail passengers, but the cited text is thin.
- **ukraine-front-line** (unsupported, cites S1, S2, S3): BBC News emphasizes civilian disruption to rail travel, while The Hindu and Russian sources focus on military strikes and casualty figures respectively.
  - The sources do not support the characterisation that The Hindu focuses on military strikes and 'Russian sources' on casualty figures; S2 is about casualties and S3 about military strikes, which reverses the claim.
- **ukraine-front-line** (unsupported, cites S3, S5, S8, S10): teleSUR frames Russian military actions in operational context, while Western sources (NPR, Newsweek) emphasize drone dominance and Ukrainian tactical gains.
  - The cited texts do not discuss source framing; S8 and S10 are about Ukrainian gains and Russian losses, and the claim about 'Western sources' framing is an unsupported editorial characterisation.
- **red-sea-shipping** (partly, cites S1, S2, S5): Multiple sources report that Houthis have seized control of Yemen's Red Sea coast, including or approaching the port city of Mokha
  - S2 and S5 say the Houthis took the Red Sea coast, but S1 reports Yemeni military securing the waterway and conflicting Mokha reports, not a Houthi seizure.
- **red-sea-shipping** (partly, cites S2, S5): Saudi-backed forces are mounting a military response, including aerial bombing campaigns
  - S2 supports Saudi aerial bombing, but S5 does not mention a Saudi-backed military response.
- **myanmar** (partly, cites S7): Airstrikes and ground raids have killed hundreds and wounded 393 civilians since major fighting resumed in Rakhine nearly three years ago, with the military regime responsible for 383 civilian deaths in 21 massacres in that state.
  - S7 gives 393 wounded and 383 killed in 21 massacres in the headline, but the cited text does not clearly link 'hundreds killed' to the regime and the 393 is stated as wounded; the combination is mostly there but the attribution is slightly merged.
- **myanmar** (partly, cites S2, S3): Multiple sources confirm that Min Aung Hlaing visited Malaysia in early October 2026 for diplomatic talks.
  - Sources confirm the visit and talks, but the early October 2026 date is only implied by publication dates; S2 and S3 give Oct 7 so this is fine, though 'diplomatic talks' is accurate; minor inference.
- **myanmar** (partly, cites S2, S3): Reuters frames Min Aung Hlaing's Malaysia visit as a diplomatic breakthrough ('red carpet welcome'), while WWLP situates it within criticism of concurrent repatriations, emphasizing human rights concerns rather than diplomatic gains.
  - 'Red carpet welcome' is in S2's headline and S3 mentions criticism of repatriations, but 'diplomatic breakthrough' and the emphasis contrast are the brief's interpretation.
- **myanmar** (partly, cites S5, S7, S8): The Irrawaddy documents specific casualty figures and military command shifts as evidence of intensifying conflict, while The Diplomat focuses on the junta's economic interests in reviving the Dawei special economic zone project, implying the regime's capacity for strategic planning despite war.
  - S7 and S8 give casualty figures and command shift, but S5 does not mention the junta's economic interests or imply strategic planning capacity; that is interpretation.
- **dr-congo-m23** (partly, cites S1): African Union mediators met with Rwandan President Paul Kagame and M23 representatives on 7 October 2026 to address the peace process in eastern DRC.
  - S1 (published 7 Oct, says 'On Wednesday') supports the meeting, but the exact date 7 October isn't stated and Wednesday inference is not explicit; also 'AU delegation' matches.
- **dr-congo-m23** (partly, cites S2): Six Ebola cases were reported in M23-controlled eastern Congo in October 2026, with all cases linked to a transmission chain originating in government-held Butembo.
  - S2 supports six cases and the Butembo chain, published 1 Oct, but 'October 2026' is fine; however the source says 'all linked' which matches; the minor gap is that four died before testing is omitted, not a problem—core is supported.
- **dr-congo-m23** (partly, cites S4): M23 reignited conflict in late 2021 after a period of relative quiet following a 2013 peace agreement, and has since rapidly expanded control over vast regions of North Kivu.
  - S4 gives the 2013 agreement, 2021 reignition and expansion, but does not say there was 'relative quiet' in between, and the 2021 attack is said to have failed.
- **dr-congo-m23** (partly, cites S1, S3): Multiple sources confirm M23 is Rwanda-backed and controls territory in eastern DRC where they exercise authority over populations and economic activity.
  - S3 says Rwanda-backed and describes control over miners and trafficking, but S1 excerpt does not say Rwanda-backed or describe territorial control; 'multiple sources confirm' overstates.
- **dr-congo-m23** (partly, cites S1, S3): teleSUR frames the current situation as an 'escalating conflict' requiring AU mediation, while Impact Newswire emphasises the 'war economy' dimension and mineral trafficking as M23's primary strategic interest.
  - S1 does say 'Conflict Escalates' and S3 says 'war economy', but the claim that mineral trafficking is M23's 'primary strategic interest' is not stated.
- **yemen-houthis** (partly, cites S8): Houthis claimed new attacks on Saudi airports including Abha International Airport near the Yemen border and King Khalid International Airport in Riyadh
  - S8 says the airports came under attack per Saudi aviation authority; the claim says Houthis 'claimed' them, which S8's snippet doesn't state.
- **yemen-houthis** (partly, cites S1, S9): Multiple outlets report that Yemen's government has launched a major military operation against the Houthis in early October 2026
  - S1 and S9 report an announced war and a major offensive, but S9 attributes it to Saudi and allied forces; 'Yemen's government launched' and 'early October' are loosely drawn from the dates.
- **yemen-houthis** (partly, cites S2, S3, S8): Both regional and Western outlets confirm that Houthis attacked targets including Aden airport and Saudi airports
  - S2, S3 and S8 report attacks on Aden and Saudi airports, but 'regional and Western outlets confirm' is characterization, and S2 only reports Houthi claims.
- **yemen-houthis** (partly, cites S4, S9): Sources report that the conflict centers on control of the Red Sea coast and Bab el-Mandeb Strait, with implications for oil prices and shipping
  - S9 gives the Red Sea coast and Bab el-Mandeb focus, and S4 mentions oil prices and Red Sea shipping lanes, but S4 says oil prices eased and doesn't state the conflict 'centers on' these.
- **yemen-houthis** (unsupported, cites S1, S2, S3, S8, S9): Western outlets (BBC, CNN, NBC) emphasize Saudi-led coalition operations and security threats to regional infrastructure, while South China Morning Post and The Hindu provide more detail on Houthi tactical operations and claims
  - The cited snippets don't show the outlets' editorial emphases; this comparative characterization is not stated in the sources.
- **yemen-houthis** (unsupported, cites S4, S10): CBS News frames the conflict in terms of global energy markets and oil prices, while other outlets focus on military operations and humanitarian impact
  - The sources do not describe how outlets frame the conflict; CBS's oil price angle is visible but the comparison with others is not supported.
- **haiti-gangs** (partly, cites S5): Armed gangs have controlled up to 90% of Port-au-Prince by 2023.
  - S5 says gangs were 'speculated' to control up to 90%, but the claim states it as established fact.
- **haiti-gangs** (partly, cites S5): In February 2024, two rival gang coalitions united in a coalition called Viv Ansanm, formed to oppose the government and the UN mission.
  - S5 says two rival groups united in Feb 2024 as Viv Ansanm, but not that they were 'gang coalitions'; the core is stated.
- **haiti-gangs** (partly, cites S3, S4): A UN-backed international security mission has been deployed to Haiti to combat gang violence.
  - S3 says the mission is supported/reauthorized, and S4 mentions a UN-backed Gang Suppression Force, but neither states it has been deployed.
- **haiti-gangs** (partly, cites S1, S4): Gang violence in Haiti has reached critical levels, with gangs controlling significant portions of the capital.
  - S1 gives continued expansion and threat to stability, and S4 mentions gangs taking Port-au-Prince, but 'critical levels' and 'significant portions' are not stated in the cited text.
- **haiti-gangs** (partly, cites S1, S2): The BBC frames the crisis primarily through gang expansion and threat to state stability, while the Miami Herald emphasises institutional corruption as a root cause alongside gang violence.
  - S1 and S2 headlines support the differing emphases, but 'primarily' and 'root cause' framing is interpretive and not stated.
- **lebanon-israel** (partly, cites S2): The incident was described as 'unacceptable' by UNIFIL
  - S2's headline calls the shots 'unacceptable' but the cited text does not say UNIFIL used that word, so attributing it to UNIFIL goes beyond the text.
- **taiwan-strait** (partly, cites S1): Taiwan has received two US-made fighter jets.
  - S1 says reports the island received two US-made ... (truncated); 'fighter jets' is not confirmed and it is only reported.
- **taiwan-strait** (partly, cites S1, S2): Both sources acknowledge that the Taiwan Strait remains a zone of political and military tension between China and Taiwan.
  - S1 mentions heightened tensions, but S2 only describes relations and status controversy, not military tension; 'both sources acknowledge' overreaches.
- **south-sudan** (partly, cites S4, S8, S10): Multiple sources confirm South Sudan is preparing for a December 2026 election while facing significant obstacles including insecurity and governance challenges.
  - S4, S8 and S10 support the election and S4 the insecurity, but none mentions governance challenges. S10 names only a caretaker government and S8 cites repression, which is not the same thing.
- **south-sudan** (partly, cites S11, S1): South Sudan has implemented or is enforcing restrictions on foreign participation in retail trade, affecting traders from neighboring countries.
  - S11 supports the ban on foreigners in retail affecting Kenyan traders. S1 only has the government saying foreigners should stay out of small-scale retail while denying an expulsion order, so it doesn't confirm enforcement.

## Expected facts not conveyed

- **south-sudan**: South Sudan rejected claims that it had ordered foreigners to leave.

## Main pins that were wrong or missing

- **ukraine-front-line**: none — Ukraine (multiple locations)

