/**
 * The evaluation's fixed topics. `region` is a latitude/longitude box the
 * brief's main pin must fall inside; a pin outside it is a wrong location.
 * Out-of-scope topics check that the brief is flagged, not written.
 */
export type EvalTopic = {
  id: string;
  topic: string;
  inScope: boolean;
  region?: { name: string; lat: [number, number]; lng: [number, number] };
};

export const TOPICS: EvalTopic[] = [
  { id: "sudan", topic: "Sudan", inScope: true, region: { name: "Sudan", lat: [8.5, 22.5], lng: [21.5, 39] } },
  { id: "gaza-ceasefire", topic: "Gaza ceasefire", inScope: true, region: { name: "Gaza Strip", lat: [31.2, 31.62], lng: [34.2, 34.6] } },
  { id: "ukraine-front-line", topic: "Ukraine front-line updates", inScope: true, region: { name: "Ukraine", lat: [44, 52.5], lng: [22, 40.5] } },
  { id: "red-sea-shipping", topic: "Red Sea shipping tensions", inScope: true, region: { name: "Red Sea and its coasts", lat: [11, 30], lng: [32, 46] } },
  { id: "myanmar", topic: "Myanmar civil war", inScope: true, region: { name: "Myanmar", lat: [9.5, 28.6], lng: [92, 101.5] } },
  { id: "dr-congo-m23", topic: "DR Congo M23", inScope: true, region: { name: "DR Congo and Rwanda border", lat: [-13.5, 5.5], lng: [12, 31.5] } },
  { id: "yemen-houthis", topic: "Yemen Houthis", inScope: true, region: { name: "Yemen", lat: [12, 19], lng: [42, 54.5] } },
  { id: "haiti-gangs", topic: "Haiti gangs", inScope: true, region: { name: "Haiti", lat: [18, 20.1], lng: [-74.5, -71.6] } },
  { id: "lebanon-israel", topic: "Lebanon Israel border", inScope: true, region: { name: "Lebanon and northern Israel", lat: [32.3, 34.7], lng: [34.8, 36.7] } },
  { id: "mali-sahel", topic: "Mali jihadists", inScope: true, region: { name: "Mali", lat: [10, 25], lng: [-12.5, 4.5] } },
  { id: "taiwan-strait", topic: "Taiwan Strait tensions", inScope: true, region: { name: "Taiwan and the strait", lat: [21.5, 26.5], lng: [117, 122.5] } },
  { id: "south-sudan", topic: "South Sudan", inScope: true, region: { name: "South Sudan", lat: [3.4, 12.3], lng: [23.4, 36] } },
  { id: "oos-recipe", topic: "banana bread recipe", inScope: false },
  { id: "oos-football", topic: "Premier League transfer news", inScope: false },
  { id: "oos-phone", topic: "best phone camera review", inScope: false },
  { id: "oos-python", topic: "how to learn Python programming", inScope: false },
];
