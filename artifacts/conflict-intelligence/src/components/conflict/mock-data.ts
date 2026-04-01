import type { ConflictAnalysis } from "./types";

export const IRAN_US_ANALYSIS: ConflictAnalysis = {
  title: "US-Israel Strikes on Iran: Nuclear Sites Destroyed, Khamenei Dead",
  location: "Tehran, Iran",
  region: "Middle East · Tehran",
  publishedAt: "2026-02-28T00:00:00Z",
  summary:
    "In a coordinated overnight operation, the United States and Israel conducted airstrikes on Iran\u2019s nuclear facilities and senior leadership, killing Supreme Leader Ali Khamenei. The strikes targeted at least a dozen sites across Iran, including Natanz, Fordow, and Isfahan. Iran has vowed severe retaliation, and proxy forces in Lebanon, Yemen, and Iraq have begun mobilizing. International observers and unverified reports indicate civilian casualties in the thousands, though independent confirmation remains limited.",
  keyQuestion:
    "Will Iran\u2019s Revolutionary Guard command structure survive to mount a coordinated multi-front retaliation, or will the succession vacuum fragment its proxy network?",
  credibilityScore: 72,
  credibilityTag: "Medium \u2014 limited on-ground verification",
  escalationLevel: "High",
  escalationTag: "Succession vacuum \u00b7 proxy actors",
  displacedCount: "500k+",
  displacedCountries: 4,
  parties: [
    { name: "United States", color: "#3B78D4" },
    { name: "Israel (IDF)", color: "#4A9B8B" },
    { name: "Iran (IRGC)", color: "#C2536A" },
    { name: "Hezbollah", color: "#E07B39" },
    { name: "Houthi Movement", color: "#9B7BC8" },
    { name: "Iraqi Militias", color: "#888888" },
  ],
  timeline: [
    {
      date: "Oct 2023",
      type: "escalation",
      title: "Hamas attack triggers regional escalation",
      subtitle: "Iran-backed axis activates across multiple fronts",
      detail:
        "The October 7 Hamas attack on Israel triggered cascading escalation involving Hezbollah rocket fire, Houthi Red Sea attacks, and Iraqi militia strikes on US bases \u2014 all coordinated within Iran\u2019s \u201caxis of resistance\u201d framework.",
      lat: 31.7683,
      lng: 35.2137,
    },
    {
      date: "Apr 2024",
      type: "strike",
      title: "Iran\u2019s first direct strike on Israel",
      subtitle: "300+ drones and missiles intercepted",
      detail:
        "Iran launched an unprecedented direct strike on Israel using over 300 drones, cruise missiles, and ballistic missiles. Over 99% were intercepted by the US, UK, France, Jordan, and Israel. Iran framed it as a proportional response to the Israeli airstrike on its Damascus consulate.",
      lat: 32.0853,
      lng: 34.7818,
    },
    {
      date: "Feb 2026",
      type: "now",
      title: "US-Israel airstrikes kill Khamenei",
      subtitle: "Nuclear program eliminated; succession crisis begins",
      detail:
        "A joint US-Israeli operation destroyed Iran\u2019s key nuclear facilities and killed Supreme Leader Ali Khamenei. The strikes represent the most significant military escalation in the Middle East in decades, triggering immediate proxy responses from Hezbollah, Hamas, and Houthi forces.",
      lat: 35.6892,
      lng: 51.389,
    },
  ],
  perspectives: [
    {
      label: "US Gov",
      actor: "Trump Administration",
      color: "#3B78D4",
      quote:
        "The strikes eliminated a decades-long nuclear threat and decapitated a regime that has destabilized the entire Middle East.",
      interest:
        "Frames the operation as decisive counter-proliferation and regional stabilization, pre-empting domestic and allied criticism.",
    },
    {
      label: "Iran Gov",
      actor: "IRGC Command",
      color: "#C2536A",
      quote:
        "The Islamic Republic will exact a devastating response. Every American and Zionist asset in the region is now a legitimate target.",
      interest:
        "Must project strength to prevent internal collapse and maintain proxy network loyalty after leadership decapitation.",
    },
    {
      label: "Gulf States",
      actor: "Saudi Arabia / UAE",
      color: "#E07B39",
      quote:
        "We call for immediate de-escalation and protection of civilian populations across the region.",
      interest:
        "Privately welcome Iranian nuclear elimination but fear oil infrastructure attacks and spillover instability.",
    },
    {
      label: "Civilians",
      actor: "Iranian Civilians",
      color: "#9B7BC8",
      quote:
        "We did not choose this war. Our hospitals are overwhelmed and we cannot leave.",
      interest:
        "Bearing the humanitarian cost of a conflict driven by state actors; seeking safety, medical access, and an end to hostilities.",
    },
    {
      label: "Intl Press",
      actor: "Al Jazeera / Global South",
      color: "#4A9B8B",
      quote:
        "The strikes constitute a flagrant violation of international law and will set a precedent for unilateral military action against sovereign states.",
      interest:
        "Represents a broad coalition of non-Western states and international legal opinion critical of unilateral US-Israeli action.",
    },
  ],
  sources: [
    {
      name: "Al Jazeera",
      flag: "\uD83C\uDDF6\uD83C\uDDE6",
      region: "Middle East",
      summary:
        "Focuses on civilian casualties and regional displacement. Leads with international law violations and the humanitarian corridor breakdown in Tehran.",
    },
    {
      name: "Middle East Eye",
      flag: "\uD83C\uDF10",
      region: "Middle East",
      summary:
        "Provides ground-level reporting on IRGC command succession and Hezbollah mobilization along the Lebanese border.",
    },
    {
      name: "teleSUR",
      flag: "\uD83C\uDDFB\uD83C\uDDEA",
      region: "Latin America",
      summary:
        "Frames the strikes as US imperialist intervention, centering Global South condemnation in the UN Security Council.",
    },
    {
      name: "The Hindu",
      flag: "\uD83C\uDDEE\uD83C\uDDF3",
      region: "Asia",
      summary:
        "Covers impact on oil markets and shipping lanes affecting India\u2019s energy imports. Reports on Indian nationals evacuating from Iran.",
    },
    {
      name: "Dawn",
      flag: "\uD83C\uDDF5\uD83C\uDDF0",
      region: "Asia",
      summary:
        "Leads with Sunni-Shia sectarian dynamics and Pakistan\u2019s position of non-involvement while calling for UN intervention.",
    },
    {
      name: "Africa Report",
      flag: "\uD83C\uDF0D",
      region: "Africa",
      summary:
        "Analyzes impact on African oil-importing nations and the risk of wider conflict drawing in global powers through proxy networks.",
    },
  ],
  mapEvents: [
    { lat: 35.6892, lng: 51.389, type: "strike", name: "Tehran", desc: "US-Israel airstrike \u2014 Khamenei killed Feb 28, 2026" },
    { lat: 32.4279, lng: 53.688, type: "strike", name: "Isfahan", desc: "Iranian military infrastructure targeted" },
    { lat: 33.5138, lng: 36.2765, type: "strike", name: "Damascus", desc: "Iranian ally positions struck" },
    { lat: 33.8938, lng: 35.5018, type: "strike", name: "Beirut", desc: "Hezbollah infrastructure \u2014 50+ sites" },
    { lat: 31.7683, lng: 35.2137, type: "city", name: "Jerusalem", desc: "Iranian retaliatory missile and drone strikes" },
    { lat: 32.0853, lng: 34.7818, type: "city", name: "Tel Aviv", desc: "Direct strikes \u2014 air defense engaged" },
    { lat: 33.3152, lng: 44.3661, type: "city", name: "Baghdad", desc: "Proxy sites struck; civilian displacement" },
    { lat: 15.3694, lng: 44.191, type: "strike", name: "Sanaa", desc: "Houthi capabilities \u2014 independent escalation vectors" },
    { lat: 30.0444, lng: 31.2357, type: "talks", name: "Cairo", desc: "Arab League emergency session; UN mediation hub" },
    { lat: 25.2048, lng: 55.2708, type: "talks", name: "Dubai", desc: "Abraham Accords signatories coordinating" },
    { lat: 41.0082, lng: 28.9784, type: "talks", name: "Istanbul", desc: "Proposed neutral ground for direct negotiations" },
  ],
  consensus: {
    agree:
      "International sources broadly agree that the strikes have eliminated Iran\u2019s near-term nuclear capability and killed Supreme Leader Khamenei, fundamentally altering the regional power structure.",
    diverge:
      "Western outlets frame the strikes as defensive counter-proliferation; regional and Global South outlets condemn them as illegal unilateral aggression setting a dangerous international precedent.",
  },
  historicalContext:
    "The US-Iran confrontation is rooted in the 1979 Islamic Revolution and the subsequent hostage crisis, which ended diplomatic relations. Decades of US sanctions, Iran\u2019s proxy network expansion across Lebanon, Syria, Iraq, and Yemen, and Iran\u2019s incremental nuclear program created a long-term confrontation trajectory. The 2018 US withdrawal from the JCPOA accelerated Iran\u2019s nuclear timeline. The 2020 assassination of IRGC General Qasem Soleimani by the US established precedent for direct leadership targeting.",
  credit: "Claude (Anthropic) + GDELT Live News",
};
