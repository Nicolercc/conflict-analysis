import { describe, expect, it } from "vitest";
import { articleSearchTopic } from "./article";
import { parseGdeltDate } from "./retrieval/gdelt";
import { canonicalUrl, cleanText, selectNews, topicMatcher, topicTerms, type Candidate } from "./sources";
import { numbersIn } from "./support";

const news = (over: Partial<Candidate>): Candidate => ({
  kind: "news", provider: "GDELT", publisher: "x.example", title: "t", url: "https://x.example/1",
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

  it("parses GDELT dates and leaves unusable ones unknown", () => {
    expect(parseGdeltDate("20260910T120000Z")).toBe("2026-09-10T12:00:00.000Z");
    expect(parseGdeltDate("")).toBeNull();
    expect(parseGdeltDate("recently")).toBeNull();
  });

  it("normalises figures for comparison", () => {
    expect(numbersIn("1,200 people and 3.5 million, in ١٢ towns.")).toEqual(["1200", "3.5", "12"]);
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
