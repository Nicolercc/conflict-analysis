import { Router, type IRouter, type Request } from "express";
import crypto from "crypto";
import { AnalyzeArticleBody, ExploreConflictBody } from "@workspace/api-zod";
import { articleSearchTopic, scrapeArticle } from "../brief/article";
import { buildBrief } from "../brief/generate";
import type { BriefState } from "../lib/brief-state";
import { invalidInput, sendError } from "../lib/errors";

const router: IRouter = Router();

const briefState = (req: Request) => req.app.locals["briefs"] as BriefState;

// ─── Routes ───────────────────────────────────────────────────────────────

/** Rate-limit, then serve from cache or share one generation per key. */
async function respondWithBrief(req: Request, key: string, make: () => Promise<object>) {
  const { cache, gate } = briefState(req);
  return cache.getOrCreate(key, () => gate.run(make));
}

const firstIssue = (issues: Array<{ path: Array<string | number>; message: string }>) =>
  issues[0] ? `${issues[0].path.join(".") || "body"}: ${issues[0].message}` : "Invalid request.";

router.post("/analyze", async (req, res) => {
  try {
    briefState(req).limiter.take(req.ip ?? "unknown");

    const body = AnalyzeArticleBody.safeParse(req.body);
    if (!body.success) throw invalidInput(firstIssue(body.error.issues));
    const { article, url } = body.data;
    if ((article === undefined) === (url === undefined)) {
      throw invalidInput("Provide either article text or a URL, not both.");
    }
    if (url !== undefined && !/^https?:\/\//i.test(url.trim())) {
      throw invalidInput("The link must start with http:// or https://.");
    }

    const articleText = (article ?? (await scrapeArticle(url!.trim()))).trim();
    if (articleText.length < 50) throw invalidInput("Article must be at least 50 characters.");

    const cacheKey = `article:${crypto.createHash("sha256").update(articleText).digest("hex")}`;
    const result = await respondWithBrief(req, cacheKey, () => {
      return buildBrief({
        topic: articleSearchTopic(articleText),
        article: { text: articleText, url: url?.trim() ?? null },
      });
    });
    res.json(result);
  } catch (err) {
    sendError(req, res, err);
  }
});

router.post("/explore", async (req, res) => {
  try {
    briefState(req).limiter.take(req.ip ?? "unknown");

    const body = ExploreConflictBody.safeParse(req.body);
    if (!body.success) throw invalidInput(firstIssue(body.error.issues));
    const topic = body.data.topic.trim().replace(/\s+/g, " ");
    if (topic.length < 3) throw invalidInput("Topic must be at least 3 characters.");

    const cacheKey = `topic:${topic.toLowerCase()}`;
    const result = await respondWithBrief(req, cacheKey, () => buildBrief({ topic }));
    res.json(result);
  } catch (err) {
    sendError(req, res, err);
  }
});

export default router;
