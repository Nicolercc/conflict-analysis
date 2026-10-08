import { cleanText } from "./sources";

/**
 * Pull the article out of a news page. Publishers mark it up in a few common
 * ways; each is tried in turn, from the most reliable to the least:
 *   1. structured data (JSON-LD "articleBody"), which is the article and nothing else;
 *   2. the paragraphs inside <article> or <main>;
 *   3. the paragraphs of the whole page.
 * Navigation, captions, cookie notices and "read more" lines are left out.
 */
export type Extracted = { text: string; method: "structured-data" | "article-element" | "paragraphs" | "none" };

const BOILERPLATE =
  /^(advertisement|read more|related:|see also|share this|follow us|sign up|sign in|log in|subscribe|newsletter|copyright|©|all rights reserved|cookies?\b|we use cookies|photo:|image:|file photo|listen to this article|click here|watch:|recommended|already a subscriber|account subscription)|accept (all )?cookies|privacy policy|terms of (use|service)|enable javascript|premium stories|subscription benefits|unlock (this|these)|to continue reading/i;

function articleBodies(node: unknown, found: string[] = [], depth = 0): string[] {
  if (depth > 8 || node === null || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    for (const item of node) articleBodies(item, found, depth + 1);
    return found;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj["articleBody"] === "string") found.push(obj["articleBody"]);
  for (const value of Object.values(obj)) if (typeof value === "object") articleBodies(value, found, depth + 1);
  return found;
}

function fromStructuredData(html: string): string {
  let best = "";
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      for (const body of articleBodies(JSON.parse(m[1]!.trim()))) {
        const text = cleanText(body);
        if (text.length > best.length) best = text;
      }
    } catch {
      /* publishers' JSON-LD is often malformed; the next method still applies */
    }
  }
  return best;
}

const wordsOf = (text: string) => new Set(text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []);

/**
 * Pages often open with teasers for other stories. When the publisher's own
 * summary of this article is known, the article is taken to start at the
 * paragraph that summary was written from, and anything before it is dropped.
 */
function startAtSummary(paras: string[], summary: string | undefined): string[] {
  const wanted = [...wordsOf(summary ?? "")];
  if (wanted.length < 5) return paras;
  let best = { index: 0, share: 0 };
  paras.slice(0, 12).forEach((p, index) => {
    const have = wordsOf(p);
    const share = wanted.filter((w) => have.has(w)).length / wanted.length;
    if (share > best.share) best = { index, share };
  });
  return best.share >= 0.6 ? paras.slice(best.index) : paras;
}

function paragraphs(html: string, summary?: string): string {
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = cleanText(m[1]!);
    // Short lines are bylines, captions and buttons; a repeated one is a template;
    // and prose has sentences — a run of headlines for other stories has no full stop.
    if (text.length < 60 || BOILERPLATE.test(text) || seen.has(text) || !/[.!?\u3002]["'\u201d\u2019)]?(\s|$)/.test(text)) continue;
    seen.add(text);
    kept.push(text);
  }
  return startAtSummary(kept, summary).join("\n");
}

const strip = (html: string, tag: string) => html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");

export function extractArticleText(html: string, maxChars = 8_000, summary?: string): Extracted {
  const cut = (text: string) => (text.length <= maxChars ? text : text.slice(0, text.lastIndexOf(" ", maxChars)));

  const structured = fromStructuredData(html);
  if (structured.length >= 400) return { text: cut(structured), method: "structured-data" };

  let body = html;
  for (const tag of ["script", "style", "noscript", "nav", "header", "footer", "aside", "form", "figure", "svg"]) body = strip(body, tag);

  const container = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(body)?.[1] ?? /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(body)?.[1];
  if (container) {
    const text = paragraphs(container, summary);
    if (text.length >= 400) return { text: cut(text), method: "article-element" };
  }
  const text = paragraphs(body, summary);
  if (text.length >= 400) return { text: cut(text), method: "paragraphs" };
  return { text: "", method: "none" };
}
