import crypto from "node:crypto";

/**
 * Evidence records. A SourceRecord is created by retrieval (or from what the
 * reader supplied) and is the only place a URL, publisher or date can come
 * from. `text` is what claims are checked against; it stays on the server.
 */
export type SourceKind = "news" | "reference" | "article";

export type SourceRecord = {
  id: string;
  kind: SourceKind;
  provider: string;
  publisher: string;
  title: string;
  url: string | null;
  publishedAt: string | null;
  retrievedAt: string;
  language: string | null;
  country: string | null;
  excerpt: string | null;
  /** Whether claims were checked against the article itself or only a summary of it. */
  textFrom: "article" | "summary";
  /** Fingerprint of the exact text the brief was written and checked against. */
  contentHash: string;
  /** Server-only: the full text available for support checks and the prompt. */
  text: string;
};

/** A record before it has been selected and given an id. */
export type Candidate = Omit<SourceRecord, "id" | "retrievedAt" | "text" | "textFrom" | "contentHash"> & {
  text?: string;
  textFrom?: SourceRecord["textFrom"];
};

export type ProviderResult = {
  provider: string;
  status: "ok" | "empty" | "failed";
  candidates: Candidate[];
};

const TRACKING_PARAM = /^(utm_|at_|traffic_source$|fbclid$|gclid$|ref$|cmp$)/i;

/** Same article, different tracking parameters or trailing slash. */
export function canonicalUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.replace(/^www\./, "");
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d",
  laquo: "\u00ab", raquo: "\u00bb", bull: "\u2022", middot: "\u00b7", euro: "\u20ac", pound: "\u00a3", copy: "\u00a9",
  reg: "\u00ae", trade: "\u2122", deg: "\u00b0",
};

const titleKey = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export const cleanText = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;|&gt;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&(mdash|ndash|hellip|lsquo|rsquo|ldquo|rdquo|laquo|raquo|bull|middot|euro|pound|copy|reg|trade|deg);/g, (_m, name: string) => NAMED_ENTITIES[name] ?? " ")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Shorten at a word boundary and mark the cut. */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40)).replace(/[\s,;:.]+$/, "")}…`;
}

/**
 * Deduplicate, keep any one outlet from crowding out the rest, and spread the
 * selection across countries so the comparison has something to compare.
 */
export function selectNews(candidates: Candidate[], limit = 12, perPublisher = 2): Candidate[] {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const perOutlet = new Map<string, number>();
  const unique: Candidate[] = [];
  for (const c of candidates) {
    const url = c.url ? canonicalUrl(c.url) : null;
    if (!url || !c.title.trim()) continue;
    const tKey = titleKey(c.title);
    // Wire copy is republished under many mastheads; one headline counts once.
    if (seenUrl.has(url) || seenTitle.has(tKey)) continue;
    const outlet = c.publisher.toLowerCase();
    if ((perOutlet.get(outlet) ?? 0) >= perPublisher) continue;
    seenUrl.add(url);
    seenTitle.add(tKey);
    perOutlet.set(outlet, (perOutlet.get(outlet) ?? 0) + 1);
    unique.push({ ...c, url });
  }

  // Round-robin by country, preserving each country's original (recency) order.
  const byCountry = new Map<string, Candidate[]>();
  for (const c of unique) {
    const key = c.country ?? "unknown";
    byCountry.set(key, [...(byCountry.get(key) ?? []), c]);
  }
  const picked: Candidate[] = [];
  while (picked.length < limit) {
    let took = false;
    for (const queue of byCountry.values()) {
      const next = queue.shift();
      if (!next) continue;
      picked.push(next);
      took = true;
      if (picked.length >= limit) break;
    }
    if (!took) break;
  }
  return picked;
}

/** Give selected records their ids and server timestamps. */
export function toRecords(candidates: Candidate[], now = new Date()): SourceRecord[] {
  const retrievedAt = now.toISOString();
  return candidates.map((c, i) => {
    const text = cleanText(`${c.title}. ${c.text ?? c.excerpt ?? ""}`);
    return {
      ...c,
      id: `S${i + 1}`,
      retrievedAt,
      // What the reader supplied is the article; everything else is a summary unless the article was read.
      textFrom: c.textFrom ?? (c.kind === "article" ? "article" : "summary"),
      contentHash: crypto.createHash("sha256").update(text).digest("hex").slice(0, 16),
      text,
    };
  });
}

/** What the client receives: everything except the server-only text. */
export function toPublicSource({ text: _text, ...rest }: SourceRecord) {
  return rest;
}

const GENERIC = new Set([
  "the", "and", "for", "with", "from", "into", "over", "amid", "about",
  "news", "latest", "update", "updates", "reporting", "report", "reports",
  "analysis", "situation", "coverage",
]);

/** Search terms from a reader's topic: lowercased words of 3+ letters minus filler. */
export function topicTerms(topic: string): string[] {
  const words = topic.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  return [...new Set(words.filter((w) => !GENERIC.has(w)))].slice(0, 8);
}

/**
 * Words that describe conflicts in general. They help a search engine but
 * cannot decide whether a headline is about the reader's topic: "humanitarian
 * access" appears in stories about every crisis.
 */
const CONFLICT_VOCABULARY = new Set([
  "war", "wars", "conflict", "conflicts", "crisis", "crises", "tension", "tensions", "ceasefire",
  "truce", "peace", "talks", "negotiation", "negotiations", "humanitarian", "access", "aid",
  "attack", "attacks", "strike", "strikes", "airstrike", "airstrikes", "offensive", "front",
  "line", "frontline", "military", "army", "forces", "troops", "civil", "civilian", "civilians",
  "refugee", "refugees", "displacement", "shipping", "sanctions", "border", "invasion", "siege",
  "fighting", "violence", "protest", "protests", "coup", "election", "elections", "deal",
]);

/**
 * Places whose name contains another place's name. "South Sudan" is not
 * "Sudan": unless the reader asked for the longer name, it is removed from a
 * headline before matching so it cannot stand in for the shorter one.
 */
const COMPOUND_PLACES = [
  "south sudan", "south africa", "central african republic", "north korea", "south korea",
  "northern ireland", "new guinea", "equatorial guinea", "guinea bissau", "new mexico",
  "new zealand", "western sahara", "west bank", "east timor", "south ossetia", "north macedonia",
  "dominican republic", "new caledonia", "south china sea", "east china sea", "red sea",
  "black sea", "nagorno karabakh", "democratic republic of congo", "dr congo", "congo brazzaville",
];

/** Digests list several unrelated stories under one headline; none of them is the subject. */
const ROUNDUP = /\b(news in brief|in brief:|round-?up|daily digest|weekly digest|newsletter|top stories|week in review|this week in|what to know today)/i;

const normalise = (s: string) =>
  ` ${(s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).join(" ").replace(/'s\b/g, "")} `;

/**
 * Decide whether a headline is about the topic. Whole words only ("red" must
 * not match "secured"), and the topic's distinctive words — usually its place
 * or actor names — must all be present. A topic with no distinctive words has
 * to match in full. A longer place name that merely contains the topic's
 * ("South Sudan" for "Sudan") does not count, and neither does a mention in a
 * multi-story digest.
 */
/** The topic's distinctive words — usually its place or actor names. */
export function topicAnchors(topic: string): string[] {
  return topicTerms(topic).filter((t) => !CONFLICT_VOCABULARY.has(t)).slice(0, 3);
}

export function topicMatcher(topic: string): (text: string) => boolean {
  const terms = topicTerms(topic);
  if (terms.length === 0) return () => false;
  const anchors = topicAnchors(topic);
  const required = anchors.length > 0 ? anchors : terms;
  const topicText = normalise(topic);
  const otherPlaces = COMPOUND_PLACES.filter((p) => !topicText.includes(` ${p} `));
  // A compound name the reader did ask for has to appear as that phrase:
  // "Sudan … South Kordofan" is not about South Sudan.
  // (Headlines shorten the Congo's long names to "Congo", so those are exempt.)
  const askedPlaces = COMPOUND_PLACES.filter((p) => !p.includes("congo") && topicText.includes(` ${p} `));
  return (text) => {
    if (ROUNDUP.test(text)) return false;
    let haystack = normalise(text);
    if (!askedPlaces.every((p) => haystack.includes(` ${p} `))) return false;
    for (const place of otherPlaces) haystack = haystack.replace(new RegExp(`(?<= )${place}(?= )`, "g"), "|");
    const words = new Set(haystack.split(" "));
    return required.every((t) => words.has(t) || words.has(`${t}s`));
  };
}
