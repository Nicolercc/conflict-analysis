import { describe, expect, it } from "vitest";
import { articleSearchTopic } from "./article";
import { distanceKm } from "./geocode";
import { articleUrl, parseNewsSearch } from "./retrieval/news-search";
import { canonicalUrl, cleanText, selectNews, topicMatcher, topicTerms, type Candidate } from "./sources";
import { numbersIn } from "./support";

const news = (over: Partial<Candidate>): Candidate => ({
  kind: "news", provider: "Bing News search", publisher: "x.example", title: "t", url: "https://x.example/1",
  publishedAt: null, language: "English", country: null, excerpt: null, ...over,
});

describe("source helpers", () => {
  it("canonicalises urls and rejects non-http schemes", () => {
    expect(canonicalUrl("https://www.Example.org/a/?utm_source=x&id=7#frag")).toBe("https://example.org/a/?id=7");
    expect(canonicalUrl("https://example.org/a/")).toBe("https://example.org/a");
    expect(canonicalUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalUrl("not a url")).toBeNull();
  });

  it("drops filler and short words from a topic", () => {
    expect(topicTerms("The latest Gaza ceasefire reporting in El Arish")).toEqual(["gaza", "ceasefire", "arish"]);
  });

  it("matches headlines on the topic's distinctive words, as whole words", () => {
    const redSea = topicMatcher("Red Sea shipping tensions");
    expect(redSea("Yemeni military says it has 'secured' Red Sea waterway")).toBe(true);
    expect(redSea("How Russia responded after plague researcher death")).toBe(false);
    expect(redSea("Police secured the area after tensions rose")).toBe(false);

    const sudan = topicMatcher("Sudan humanitarian access");
    expect(sudan("Sudan's army retakes key bridge")).toBe(true);
    expect(sudan("DR Congo Ebola emergency: calls grow for humanitarian access")).toBe(false);

    // nothing distinctive: every word must be there
    const generic = topicMatcher("humanitarian crisis");
    expect(generic("A humanitarian crisis is unfolding")).toBe(true);
    expect(generic("Humanitarian convoy arrives")).toBe(false);
  });

  it("spreads the selection across countries", () => {
    const picked = selectNews(
      [
        news({ title: "a1", url: "https://a.example/1", publisher: "a", country: "Kenya" }),
        news({ title: "a2", url: "https://a2.example/1", publisher: "a2", country: "Kenya" }),
        news({ title: "a3", url: "https://a3.example/1", publisher: "a3", country: "Kenya" }),
        news({ title: "b1", url: "https://b.example/1", publisher: "b", country: "India" }),
        news({ title: "c1", url: "https://c.example/1", publisher: "c", country: "Brazil" }),
      ],
      3,
    );
    expect(picked.map((p) => p.country)).toEqual(["Kenya", "India", "Brazil"]);
  });

  it("decodes entities and strips markup from feed text", () => {
    expect(cleanText("Ukraine&#8217;s <b>Flamingo</b> &amp; more&nbsp;")).toBe("Ukraine’s Flamingo & more");
  });

  it("does not let a longer place name stand in for the topic's", () => {
    const sudan = topicMatcher("Sudan");
    expect(sudan("South Sudan rejects claims of foreigners' expulsion order")).toBe(false);
    expect(sudan("South Sudan: South Sudan Rejects Claims")).toBe(false);
    expect(sudan("Sudan and South Sudan reopen border crossing")).toBe(true);
    // asking for the longer name still works
    expect(topicMatcher("South Sudan floods")("South Sudan floods displace thousands")).toBe(true);
    expect(topicMatcher("Korea")("North Korea tests missile")).toBe(false);
    expect(topicMatcher("Guinea coup")("Papua New Guinea votes")).toBe(false);
  });

  it("does not count a mention inside a multi-story digest", () => {
    const sudan = topicMatcher("Sudan humanitarian access");
    expect(sudan("World News in Brief: West Bank demolitions accelerate, urgent support for Sudan, Haiti displacement")).toBe(false);
    expect(sudan("Africa weekly round-up: Sudan, Mali and Kenya")).toBe(false);
    expect(sudan("UN Security Council briefing hears Sudan aid warning")).toBe(true);
  });

  it("reads the article's own address out of a search click-through link", () => {
    expect(articleUrl("http://www.bing.com/news/apiclick.aspx?ref=FexRss&url=https%3a%2f%2fapnews.com%2farticle%2fx&c=1")).toBe("https://apnews.com/article/x");
    expect(articleUrl("http://www.bing.com/news/apiclick.aspx?url=javascript%3aalert(1)")).toBeNull();
    expect(articleUrl("http://www.bing.com/news/apiclick.aspx?ref=FexRss")).toBeNull();
    expect(articleUrl("https://example.org/story")).toBe("https://example.org/story");
    expect(articleUrl("nonsense")).toBeNull();
  });

  it("keeps search results that name the topic and takes the outlet from the feed", () => {
    const item = (title: string, description: string, url: string, source = "") =>
      `<item><title>${title}</title><link>http://www.bing.com/news/apiclick.aspx?url=${encodeURIComponent(url)}</link><description>${description}</description><pubDate>Wed, 07 Oct 2026 08:20:00 GMT</pubDate>${source ? `<News:Source>${source}</News:Source>` : ""}</item>`;
    const xml = `<rss><channel>${[
      item("Drone strike kills 4 women in Sudan's Blue Nile state", "A strike hit homes.", "https://apnews.com/a", "Associated Press News on MSN"),
      item("South Sudan's aid crisis deepens", "Funding shrinks as arrivals from Sudan continue.", "https://example.org/b", "Example"),
      item("Markets rally on rate hopes", "Nothing about the topic.", "https://example.org/c", "Example"),
      item("Sudan's army chief vows to retake territory", "", "https://www.outlookindia.com/d"),
    ].join("")}</channel></rss>`;
    const found = parseNewsSearch(xml, "Sudan");
    expect(found.map((c) => c.url)).toEqual(["https://apnews.com/a", "https://www.outlookindia.com/d"]);
    expect(found[0]).toMatchObject({ publisher: "Associated Press News", publishedAt: "2026-10-07T08:20:00.000Z", country: null });
    expect(found[1]?.publisher).toBe("outlookindia.com");
  });

  it("measures the distance between two points", () => {
    // Gaza City to Ramallah is about 80 km; Gaza City to Khartoum about 1,800 km.
    expect(distanceKm({ lat: 31.5, lng: 34.47 }, { lat: 31.9, lng: 35.2 })).toBeGreaterThan(60);
    expect(distanceKm({ lat: 31.5, lng: 34.47 }, { lat: 31.9, lng: 35.2 })).toBeLessThan(100);
    expect(distanceKm({ lat: 31.5, lng: 34.47 }, { lat: 15.5, lng: 32.56 })).toBeGreaterThan(1500);
  });

  it("normalises figures for comparison", () => {
    expect(numbersIn("1,200 people and 3.5 million, in ١٢ towns.")).toEqual(["1200", "3.5", "12"]);
    expect(numbersIn("25 000 displaced; 1,234,567 in need.")).toEqual(["25000", "1234567"]);
    // a date is a day and a year, not one figure
    expect(numbersIn("On October 7, 2026, three people died.")).toEqual(["7", "2026"]);
  });

  it("derives search terms for an article from the names that recur in it", () => {
    const text =
      "Fighting continued on Monday. Officials in Khartoum said aid was blocked. Residents of El Fasher and Khartoum described shortages. The United Nations called for access to El Fasher.";
    const topic = articleSearchTopic(text);
    expect(topic).toMatch(/Khartoum/);
    expect(topic).toMatch(/Fasher/);
    expect(topic).not.toMatch(/Fighting|Officials|Residents/);
  });
});
