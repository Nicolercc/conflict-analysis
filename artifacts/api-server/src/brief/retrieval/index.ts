import { selectNews, toRecords, type Candidate, type ProviderResult, type SourceRecord } from "../sources";
import { searchNews } from "./news-search";
import { FEEDS, searchFeed } from "./rss";
import { searchWikipedia } from "./wikipedia";

export type Coverage = {
  sources: SourceRecord[];
  retrieval: Array<{ provider: string; status: ProviderResult["status"]; count: number }>;
};

/**
 * Query every provider at once. A slow or failed provider never blocks or
 * hides the others; each one's outcome is reported.
 */
export async function searchCoverage(topic: string, supplied?: Candidate): Promise<Coverage> {
  const [search, wiki, ...feeds] = await Promise.all([
    searchNews(topic),
    searchWikipedia(topic),
    ...FEEDS.map((feed) => searchFeed(feed, topic)),
  ]);

  // Feeds first: their outlet and country are known, which the comparison relies on.
  const news = selectNews([...feeds.flatMap((f) => f.candidates), ...search.candidates]);
  const ordered = [...(supplied ? [supplied] : []), ...news, ...wiki.candidates];
  const sources = toRecords(ordered);

  const selectedByProvider = (provider: string) => sources.filter((s) => s.provider === provider).length;
  const retrieval = [search, ...feeds, wiki].map((r) => ({
    provider: r.provider,
    status: r.status,
    count: selectedByProvider(r.provider),
  }));

  return { sources, retrieval };
}
