import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractArticleText } from "./extract";
import { aboutTopic, parseRobots, pathAllowed, readFullText, resetFullTextCache, type PageFetcher } from "./retrieval/full-text";
import type { Candidate } from "./sources";

const P1 = "Aid agencies said on Monday that twelve trucks carrying food were turned back at a checkpoint outside El Fasher, the last major city in Darfur outside paramilitary control.";
const P2 = "Residents described shortages of medicine and clean water, and said shelling had resumed in the northern districts after a pause of several days.";
const P3 = "The army did not respond to a request for comment. A spokesman for the paramilitary force denied that its fighters had blocked the convoy.";
const page = (inner: string) => `<html><head><title>x</title></head><body>${inner}</body></html>`;

describe("article extraction", () => {
  it("prefers the article body from structured data", () => {
    const html = page(
      `<script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": "NewsArticle", articleBody: `${P1} ${P2} ${P3}` }] })}</script>
       <article><p>${"Unrelated teaser paragraph that is long enough to count as text. ".repeat(8)}</p></article>`,
    );
    const out = extractArticleText(html);
    expect(out.method).toBe("structured-data");
    expect(out.text).toContain("twelve trucks carrying food");
    expect(out.text).not.toContain("Unrelated teaser");
  });

  it("falls back to the paragraphs inside the article element, without navigation or boilerplate", () => {
    const html = page(
      `<nav><p>${"Home World Africa Middle East Business Culture Sport Weather ".repeat(3)}</p></nav>
       <article><h1>Headline</h1><p>By A Reporter</p><p>${P1}</p><figure><figcaption><p>Photo: a very long caption describing the scene at the checkpoint near the city</p></figcaption></figure>
       <p>${P2}</p><p>Read more: another story about something else entirely that is quite long</p><p>${P3}</p><p>${P3}</p></article>
       <footer><p>Copyright 2026 Example News. All rights reserved. Terms of use and privacy policy apply to this site.</p></footer>
       <script>var tracking = "<p>${"not text ".repeat(20)}</p>";</script>`,
    );
    const out = extractArticleText(html);
    expect(out.method).toBe("article-element");
    expect(out.text.split("\n")).toEqual([P1, P2, P3]);
  });

  it("uses the page's paragraphs when there is no article element, and survives broken structured data", () => {
    const html = page(`<script type="application/ld+json">{ not json </script><div><p>${P1}</p><p>${P2}</p><p>${P3}</p></div>`);
    expect(extractArticleText(html)).toMatchObject({ method: "paragraphs" });
  });

  it("reports nothing when the page has no article text (a consent wall, a video page)", () => {
    expect(extractArticleText(page("<p>We use cookies to improve your experience on this site and to show relevant advertising.</p>"))).toEqual({ text: "", method: "none" });
  });

  it("cuts very long text at a word boundary", () => {
    const out = extractArticleText(page(`<article>${`<p>${P1}</p><p>${P2}</p>`.repeat(40)}</article>`), 1000);
    expect(out.text.length).toBeLessThanOrEqual(1000);
    expect(out.text.endsWith(" ")).toBe(false);
  });
});

describe("robots.txt", () => {
  it("applies the group that names us, otherwise the general one", () => {
    const text = "User-agent: *\nDisallow: /private/\n\nUser-agent: VantageBot\nDisallow: /\n";
    expect(pathAllowed(parseRobots(text), "/news/a")).toBe(false);
    expect(pathAllowed(parseRobots("User-agent: *\nDisallow: /private/\n"), "/news/a")).toBe(true);
    expect(pathAllowed(parseRobots("User-agent: *\nDisallow: /private/\n"), "/private/a")).toBe(false);
  });

  it("lets the longest rule win, honours wildcards, and treats an empty file as permission", () => {
    const rules = parseRobots("# comment\nUser-agent: GoogleBot\nUser-agent: *\nDisallow: /news/\nAllow: /news/world/\nDisallow: /*.pdf$\n");
    expect(pathAllowed(rules, "/news/local/a")).toBe(false);
    expect(pathAllowed(rules, "/news/world/a")).toBe(true);
    expect(pathAllowed(rules, "/files/report.pdf")).toBe(false);
    expect(pathAllowed(rules, "/files/report.pdf?x=1")).toBe(true);
    expect(pathAllowed(parseRobots(""), "/anything")).toBe(true);
    expect(pathAllowed(parseRobots("User-agent: *\nDisallow:\n"), "/anything")).toBe(true);
  });
});

describe("reading the articles behind the headlines", () => {
  const news = (over: Partial<Candidate> = {}): Candidate => ({
    kind: "news", provider: "Example RSS", publisher: "Example News", title: "Aid trucks turned back outside El Fasher",
    url: "https://news.example/sudan/aid-trucks", publishedAt: null, language: "English", country: null, excerpt: "Agencies say trucks were refused.", ...over,
  });
  const article = page(`<article><p>${P1}</p><p>${P2}</p><p>${P3}</p></article>`);
  const serve = (pages: Record<string, string>, log: string[] = []): PageFetcher => async (url) => {
    log.push(url);
    if (!(url in pages)) throw new Error("404");
    return pages[url]!;
  };

  beforeEach(() => {
    process.env["FULL_TEXT"] = "on";
    resetFullTextCache();
  });
  afterEach(() => {
    process.env["FULL_TEXT"] = "off";
  });

  it("replaces a summary with the article's text", async () => {
    const [read] = await readFullText([news()], serve({ "https://news.example/sudan/aid-trucks": article }));
    expect(read).toMatchObject({ textFrom: "article" });
    expect(read!.text).toContain("twelve trucks carrying food");
    // what the reader is shown is still the publisher's own summary
    expect(read!.excerpt).toBe("Agencies say trucks were refused.");
  });

  it("does not fetch a page the site's robots.txt forbids, and asks for robots.txt once per site", async () => {
    const log: string[] = [];
    const fetchPage = serve(
      { "https://news.example/robots.txt": "User-agent: *\nDisallow: /sudan/\n", "https://news.example/sudan/aid-trucks": article, "https://news.example/world/b": article },
      log,
    );
    const read = await readFullText([news(), news({ url: "https://news.example/world/b" })], fetchPage);
    expect(read.map((c) => c.textFrom)).toEqual(["summary", "article"]);
    expect(log).not.toContain("https://news.example/sudan/aid-trucks");
    expect(log.filter((u) => u.endsWith("/robots.txt"))).toHaveLength(1);
  });

  it("keeps the summary when the page fails, has no article, or is about something else", async () => {
    const other = page(`<article>${`<p>${"Markets rallied on Tuesday as investors welcomed lower inflation figures across the eurozone. ".repeat(2)}</p>`.repeat(4)}</article>`);
    const read = await readFullText(
      [news({ url: "https://a.example/missing" }), news({ url: "https://b.example/wall" }), news({ url: "https://c.example/other" })],
      serve({ "https://b.example/wall": page("<p>Please accept cookies to continue.</p>"), "https://c.example/other": other }),
    );
    expect(read.map((c) => c.textFrom)).toEqual(["summary", "summary", "summary"]);
    expect(read.every((c) => c.text === undefined)).toBe(true);
  });

  it("gives up on slow pages when the time budget runs out, without failing", async () => {
    process.env["FULL_TEXT_BUDGET_MS"] = "50";
    vi.resetModules();
    const { readFullText: readWithBudget } = await import("./retrieval/full-text");
    const slow: PageFetcher = (url) => new Promise((resolve) => setTimeout(() => resolve(url.endsWith("robots.txt") ? "" : article), 400));
    const started = Date.now();
    const read = await readWithBudget([news()], slow);
    expect(read[0]!.textFrom).toBe("summary");
    expect(Date.now() - started).toBeLessThan(350);
    delete process.env["FULL_TEXT_BUDGET_MS"];
    vi.resetModules();
  });

  it("starts at the paragraph the publisher's summary came from, dropping teasers above it", () => {
    const teaser = "Saudi nursery hit by debris as attackers target the capital's airport in a new wave of overnight strikes on the kingdom.";
    const html = page(`<article><p>${teaser}</p><p>${P1}</p><p>${P2}</p><p>${P3}</p></article>`);
    const out = extractArticleText(html, 8000, "Aid agencies said twelve trucks carrying food were turned back at a checkpoint outside El Fasher.");
    expect(out.text.startsWith("Aid agencies said on Monday")).toBe(true);
    expect(out.text).not.toContain("Saudi nursery");
    // with no summary to go by, nothing is dropped
    expect(extractArticleText(html).text).toContain("Saudi nursery");
  });

  it("leaves out a run of headlines for other stories", () => {
    const headlines = "Saudi nursery hit by debris as attackers target airport A new civil society alliance is testing the limits of dissent Markets slide";
    const out = extractArticleText(page(`<article><p>${headlines}</p><p>${P1}</p><p>${P2}</p><p>${P3}</p></article>`));
    expect(out.text.split("\n")).toEqual([P1, P2, P3]);
  });

  it("drops a source whose article only mentions the topic in passing", () => {
    const concert = news({ textFrom: "article", text: "A band will play a free show on Saturday to raise funds for Sudan. Tickets are free. The band formed in 2010 and has toured widely." });
    const report = news({ textFrom: "article", text: "Fighting in Sudan continued. Sudan's army said it had retaken a bridge. Aid agencies in Sudan warned of famine." });
    expect(aboutTopic(concert, ["sudan"])).toBe(false);
    expect(aboutTopic(report, ["sudan"])).toBe(true);
    // a source still on its summary cannot be judged this way
    expect(aboutTopic(news({ textFrom: "summary" }), ["sudan"])).toBe(true);
  });

  it("leaves references and the reader's own article alone", async () => {
    const log: string[] = [];
    await readFullText([news({ kind: "reference", url: "https://en.wikipedia.org/wiki/X" }), news({ kind: "article", url: null })], serve({}, log));
    expect(log).toEqual([]);
  });
});
