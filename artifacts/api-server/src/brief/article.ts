import { AppError } from "../lib/errors";
import { fetchPublicPage } from "../lib/safe-fetch";

/** Fetch a public article page and reduce it to readable text. */
export async function scrapeArticle(url: string): Promise<string> {
  const html = await fetchPublicPage(url);
  // Strip scripts, styles, nav, and extract text
  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length < 100) {
    throw new AppError(422, "FETCH_FAILED", "We couldn't find article text on that page. Try pasting the article text instead.");
  }
  return stripped.slice(0, 8000);
}

/**
 * Search terms for an article: the capitalised names that recur in it. Used
 * only to find related coverage; the article itself is analysed in full.
 */
export function articleSearchTopic(text: string): string {
  const counts = new Map<string, number>();
  // Skip sentence-initial words, which are capitalised whatever they are.
  for (const m of text.slice(0, 4000).matchAll(/(?<![.!?]\s)(?<=\s)([A-Z][\p{L}]{2,}(?:\s+[A-Z][\p{L}]{2,})?)/gu)) {
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  const names = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
  return names.length ? names.join(" ") : text.slice(0, 80);
}
