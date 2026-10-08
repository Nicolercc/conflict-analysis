import { fetchPublicPage } from "../../lib/safe-fetch";
import { logger } from "../../lib/logger";
import { extractArticleText } from "../extract";
import type { Candidate } from "../sources";

/**
 * Read the articles behind the selected headlines, so claims are quoted from
 * and checked against what the article says and not only its one-line summary.
 *
 * Reading is polite and bounded: the site's robots.txt is honoured, every page
 * is fetched once through the guarded fetcher with a short deadline, and the
 * whole step has a time budget. A page that cannot be read, is refused by
 * robots.txt, or does not look like the article it should be, leaves the
 * source on its summary — nothing is lost, the brief is just shallower there.
 * The text is used for checking and quoting; only the publisher's own summary
 * and short quotes are ever shown.
 */
export const fullTextEnabled = () => (process.env["FULL_TEXT"] ?? "on") !== "off";

const PAGE_DEADLINE_MS = 4_500;
const BUDGET_MS = Number(process.env["FULL_TEXT_BUDGET_MS"] ?? 6_000);
const MAX_CHARS = 6_000;
const ROBOTS_TTL_MS = 60 * 60_000;
const AGENT = "vantagebot";

export type PageFetcher = (url: string, deadlineMs: number) => Promise<string>;
const defaultFetcher: PageFetcher = (url, deadlineMs) => fetchPublicPage(url, { deadlineMs });

type Rules = { allow: string[]; disallow: string[] };
const robotsCache = new Map<string, { at: number; rules: Promise<Rules> }>();

export function resetFullTextCache() {
  robotsCache.clear();
}

/** The rules that apply to us: our own group if the site names us, otherwise the "*" group. */
export function parseRobots(text: string): Rules {
  const groups = new Map<string, Rules>();
  let agents: string[] = [];
  let collecting = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (field === "user-agent") {
      if (collecting) agents = [];
      collecting = false;
      agents.push(value.toLowerCase());
      if (!groups.has(value.toLowerCase())) groups.set(value.toLowerCase(), { allow: [], disallow: [] });
    } else if (field === "allow" || field === "disallow") {
      collecting = true;
      for (const agent of agents) if (value) groups.get(agent)![field].push(value);
    }
  }
  return groups.get(AGENT) ?? groups.get("*") ?? { allow: [], disallow: [] };
}

/** Longest matching rule wins; Allow wins a tie. "*" and a trailing "$" are honoured. */
export function pathAllowed(rules: Rules, path: string): boolean {
  const matchLength = (pattern: string) => {
    const anchored = pattern.endsWith("$");
    const body = (anchored ? pattern.slice(0, -1) : pattern).split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path) ? pattern.length : -1;
  };
  const best = (patterns: string[]) => Math.max(-1, ...patterns.map(matchLength));
  return best(rules.allow) >= best(rules.disallow);
}

async function robotsAllow(url: URL, fetchPage: PageFetcher): Promise<boolean> {
  let entry = robotsCache.get(url.origin);
  if (!entry || Date.now() - entry.at >= ROBOTS_TTL_MS) {
    // The pending request is cached, so several articles from one site ask only once.
    entry = {
      at: Date.now(),
      rules: fetchPage(`${url.origin}/robots.txt`, 2_500).then(
        parseRobots,
        // No robots.txt, or none we could read: there is nothing forbidding the page.
        () => ({ allow: [], disallow: [] }),
      ),
    };
    robotsCache.set(url.origin, entry);
  }
  return pathAllowed(await entry.rules, url.pathname + url.search);
}

const words = (text: string) => new Set(text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []);

/** A consent wall or an index page is not the article: the text must echo its own headline. */
function looksLikeTheArticle(text: string, title: string): boolean {
  const inTitle = [...words(title)];
  if (inTitle.length === 0) return true;
  const inText = words(text);
  const shared = inTitle.filter((w) => inText.has(w)).length;
  return shared >= Math.min(3, Math.ceil(inTitle.length / 2));
}

async function readOne(candidate: Candidate, fetchPage: PageFetcher): Promise<Candidate> {
  const summaryOnly: Candidate = { ...candidate, textFrom: "summary" };
  if (candidate.kind !== "news" || !candidate.url) return summaryOnly;
  try {
    const url = new URL(candidate.url);
    if (!(await robotsAllow(url, fetchPage))) return summaryOnly;
    const { text, method } = extractArticleText(await fetchPage(candidate.url, PAGE_DEADLINE_MS), MAX_CHARS, candidate.excerpt ?? undefined);
    if (method === "none" || !looksLikeTheArticle(text, candidate.title)) return summaryOnly;
    return { ...candidate, text, textFrom: "article" };
  } catch {
    return summaryOnly;
  }
}

/**
 * With the article in hand, a headline that only name-drops the topic can be
 * told apart from a story about it: a benefit concert "for Sudan" mentions the
 * place once, a report on the war many times. Sources still on a summary are
 * given the benefit of the doubt.
 */
export function aboutTopic(candidate: Candidate, anchors: string[]): boolean {
  if (candidate.textFrom !== "article" || !candidate.text || anchors.length === 0) return true;
  const text = ` ${(candidate.text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).join(" ")} `;
  return anchors.every((a) => text.split(` ${a}`).length - 1 >= 3);
}

/** The same candidates, each with its article text where it could be read in time. */
export async function readFullText(candidates: Candidate[], fetchPage: PageFetcher = defaultFetcher): Promise<Candidate[]> {
  if (!fullTextEnabled()) return candidates;
  const started = Date.now();
  const late = new Promise<null>((r) => setTimeout(() => r(null), BUDGET_MS).unref());
  const read = await Promise.all(
    candidates.map(async (c) => (await Promise.race([readOne(c, fetchPage), late])) ?? ({ ...c, textFrom: "summary" } satisfies Candidate)),
  );
  const news = read.filter((c) => c.kind === "news");
  logger.info(
    { read: news.filter((c) => c.textFrom === "article").length, of: news.length, ms: Date.now() - started },
    "article text read",
  );
  return read;
}
