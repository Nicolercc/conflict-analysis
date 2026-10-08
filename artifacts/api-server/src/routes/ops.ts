import crypto from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import type { BriefState } from "../lib/brief-state";
import { auditBrief } from "../brief/audit";
import { upgradeStoredBrief } from "../brief/upgrade";
import { isBriefId } from "../lib/brief-store";
import { AppError, sendError } from "../lib/errors";

const router: IRouter = Router();
const state = (req: Request) => req.app.locals["briefs"] as BriefState;

/**
 * Readiness: can this instance do its job, and will what it saves last?
 * (/healthz only says the process is up.) Answers 503 when a required part is
 * missing or unreachable. Never includes a secret or a connection string.
 */
router.get("/readyz", async (req, res) => {
  const { config, pool } = state(req);
  const checks: Record<string, { ok: boolean; detail: string }> = {
    model: config.modelKeyPresent
      ? { ok: true, detail: "API key present" }
      : { ok: false, detail: "ANTHROPIC_API_KEY is not set" },
  };
  if (!pool) {
    checks["storage"] = {
      ok: !config.requireDatabase,
      detail: "memory only: saved briefs, rate limits and the cost ledger are lost on restart",
    };
  } else {
    try {
      await pool.query("SELECT 1");
      checks["storage"] = { ok: true, detail: "postgres reachable" };
    } catch (err) {
      req.log.warn({ err }, "readiness: database unreachable");
      checks["storage"] = { ok: false, detail: "postgres configured but unreachable" };
    }
  }
  const ready = Object.values(checks).every((c) => c.ok);
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not ready",
    durable: Boolean(pool) && checks["storage"]!.ok,
    checks,
  });
});

function authorised(req: Request, token: string): boolean {
  const given = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1] ?? "";
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(token).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * What the models have cost, per day. Only for whoever holds OPS_TOKEN; the
 * route does not exist (404) when no token is configured.
 */
router.get("/ops/costs", async (req, res) => {
  try {
    const { config, ledger } = state(req);
    if (!config.opsToken || !authorised(req, config.opsToken)) {
      throw new AppError(404, "NOT_FOUND", "Not found.");
    }
    const days = Math.min(90, Math.max(1, Number(req.query["days"]) || 7));
    const rows = await ledger.daily(days);
    const priced = rows.every((r) => r.costUsd !== null);
    const briefs = rows.filter((r) => r.purpose === "writer").reduce((n, r) => n + r.calls - r.failed, 0);
    const total = priced ? Math.round(rows.reduce((n, r) => n + (r.costUsd ?? 0), 0) * 1e6) / 1e6 : null;
    res.set("Cache-Control", "no-store").json({
      days,
      briefs,
      totalUsd: total,
      usdPerBrief: total !== null && briefs > 0 ? Math.round((total / briefs) * 1e6) / 1e6 : null,
      // When a model has no configured price its cost, and so the total, is unknown.
      unpricedModels: [...new Set(rows.filter((r) => r.costUsd === null).map((r) => r.model))],
      daily: rows,
    });
  } catch (err) {
    sendError(req, res, err);
  }
});

/**
 * Check a saved brief against the text that was saved with it: is every quote
 * still found in its source, and is each source's text the text that was
 * fingerprinted when the brief was written? This is the evidence that a brief
 * said what its sources said on the day, whatever the pages say now.
 */
router.get("/ops/briefs/:id/audit", async (req, res) => {
  try {
    const { config, store } = state(req);
    if (!config.opsToken || !authorised(req, config.opsToken)) throw new AppError(404, "NOT_FOUND", "Not found.");
    const id = String(req.params["id"] ?? "");
    const brief = isBriefId(id) ? await store.get(id) : null;
    if (!brief) throw new AppError(404, "NOT_FOUND", "Not found.");
    res.set("Cache-Control", "no-store").json(auditBrief(upgradeStoredBrief(brief), await store.snapshot(id)));
  } catch (err) {
    sendError(req, res, err);
  }
});

export default router;
