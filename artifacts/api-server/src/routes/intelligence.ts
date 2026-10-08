import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { AnalyzeArticleBody, ExploreConflictBody, StreamBriefBody } from "@workspace/api-zod";
import { articleSearchTopic, scrapeArticle } from "../brief/article";
import { buildBrief, type BriefInput, type BriefProgress } from "../brief/generate";
import type { BriefState } from "../lib/brief-state";
import { isBriefId, type StoredBrief } from "../lib/brief-store";
import { AppError, invalidInput, sendError } from "../lib/errors";
import { ProgressHub } from "../lib/progress-hub";

const router: IRouter = Router();

const briefState = (req: Request) => req.app.locals["briefs"] as BriefState;
const progress = new ProgressHub<BriefProgress>();

const firstIssue = (issues: Array<{ path: Array<string | number>; message: string }>) =>
  issues[0] ? `${issues[0].path.join(".") || "body"}: ${issues[0].message}` : "Invalid request.";

type Resolved = { key: string; input: BriefInput };

function resolveTopic(raw: string): Resolved {
  const topic = raw.trim().replace(/\s+/g, " ");
  if (topic.length < 3) throw invalidInput("Topic must be at least 3 characters.");
  return { key: `topic:${topic.toLowerCase()}`, input: { topic } };
}

async function resolveArticle(article: string | undefined, url: string | undefined): Promise<Resolved> {
  if ((article === undefined) === (url === undefined)) {
    throw invalidInput("Provide either article text or a URL, not both.");
  }
  if (url !== undefined && !/^https?:\/\//i.test(url.trim())) {
    throw invalidInput("The link must start with http:// or https://.");
  }
  const text = (article ?? (await scrapeArticle(url!.trim()))).trim();
  if (text.length < 50) throw invalidInput("Article must be at least 50 characters.");
  return {
    key: `article:${crypto.createHash("sha256").update(text).digest("hex")}`,
    input: { topic: articleSearchTopic(text), article: { text, url: url?.trim() ?? null } },
  };
}

/**
 * Serve a brief from this process's cache or the store; otherwise generate it
 * once, however many requests are waiting, and save it so its link keeps working.
 */
function briefFor(req: Request, { key, input }: Resolved): Promise<StoredBrief> {
  const { cache, cacheTtlMs, gate, store } = briefState(req);
  return cache.getOrCreate(key, async () => {
    const saved = await store.latest(key, cacheTtlMs);
    if (saved) return saved;
    progress.open(key);
    try {
      const brief = await gate.run(() => buildBrief(input, (event) => progress.publish(key, event)));
      await store.save(key, brief);
      return brief;
    } finally {
      progress.close(key);
    }
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────

router.post("/analyze", async (req, res) => {
  try {
    briefState(req).limiter.take(req.ip ?? "unknown");
    const body = AnalyzeArticleBody.safeParse(req.body);
    if (!body.success) throw invalidInput(firstIssue(body.error.issues));
    res.json(await briefFor(req, await resolveArticle(body.data.article, body.data.url)));
  } catch (err) {
    sendError(req, res, err);
  }
});

router.post("/explore", async (req, res) => {
  try {
    briefState(req).limiter.take(req.ip ?? "unknown");
    const body = ExploreConflictBody.safeParse(req.body);
    if (!body.success) throw invalidInput(firstIssue(body.error.issues));
    res.json(await briefFor(req, resolveTopic(body.data.topic)));
  } catch (err) {
    sendError(req, res, err);
  }
});

/** The same error body `sendError` writes, for an error that happens mid-stream. */
function errorEvent(req: Request, err: unknown) {
  const requestId = String(req.id ?? "");
  if (err instanceof AppError) {
    if (err.status >= 500) req.log.error({ err, cause: err.cause }, err.code);
    return { error: err.code, message: err.message, requestId };
  }
  req.log.error({ err }, "unhandled error");
  return { error: "INTERNAL", message: "Something went wrong on our side. Please try again.", requestId };
}

/**
 * The same brief as /explore and /analyze, with progress sent as it happens:
 * the reader sees which sources were found while the brief is still being
 * written. Problems with the request are refused before the stream starts.
 */
router.post("/stream", async (req: Request, res: Response) => {
  let resolved: Resolved;
  try {
    briefState(req).limiter.take(req.ip ?? "unknown");
    const body = StreamBriefBody.safeParse(req.body);
    if (!body.success) throw invalidInput(firstIssue(body.error.issues));
    const { topic, url, article } = body.data;
    if (topic !== undefined && (url !== undefined || article !== undefined)) {
      throw invalidInput("Provide a topic, a URL or article text, not more than one.");
    }
    resolved = topic !== undefined ? resolveTopic(topic) : await resolveArticle(article, url);
  } catch (err) {
    sendError(req, res, err);
    return;
  }

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    // Ask proxies in front of the server not to hold events back.
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  let open = true;
  res.on("close", () => {
    open = false;
  });
  const send = (event: string, data: unknown) => {
    if (open) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Subscribing after the work starts is fine: the hub replays what was missed.
  const work = briefFor(req, resolved);
  const unsubscribe = progress.subscribe(resolved.key, ({ type, ...data }) => send(type, data));
  // A comment line every so often keeps idle-connection timeouts from cutting a long wait.
  const heartbeat = setInterval(() => open && res.write(": waiting\n\n"), 15_000);
  try {
    send("brief", await work);
  } catch (err) {
    send("error", errorEvent(req, err));
  } finally {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  }
});

export default router;

/** Stored briefs, read by id. Mounted at /api/briefs. */
export const briefsRouter: IRouter = Router();

briefsRouter.get("/:id", async (req, res) => {
  try {
    const id = String(req.params["id"] ?? "");
    const brief = isBriefId(id) ? await briefState(req).store.get(id) : null;
    if (!brief) throw new AppError(404, "NOT_FOUND", "This brief is no longer available.");
    // A stored brief never changes, so it can be cached for a while.
    res.set("Cache-Control", "public, max-age=300");
    res.json(brief);
  } catch (err) {
    sendError(req, res, err);
  }
});
