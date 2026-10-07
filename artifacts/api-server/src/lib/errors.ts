import type { Request, Response } from "express";

/**
 * An error that is safe to show to the client. `message` is written for the
 * person using the site; the underlying cause is logged, never returned.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly options: { cause?: unknown; retryAfterSec?: number } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
  }
}

export const invalidInput = (message: string) => new AppError(400, "INVALID_INPUT", message);

export function sendError(req: Request, res: Response, err: unknown) {
  const requestId = String(req.id ?? "");
  if (err instanceof AppError) {
    if (err.status >= 500) req.log.error({ err, cause: err.cause }, err.code);
    else req.log.info({ code: err.code }, "request rejected");
    if (err.options.retryAfterSec) {
      res.setHeader("Retry-After", String(err.options.retryAfterSec));
    }
    res.status(err.status).json({ error: err.code, message: err.message, requestId });
    return;
  }
  req.log.error({ err }, "unhandled error");
  res.status(500).json({
    error: "INTERNAL",
    message: "Something went wrong on our side. Please try again.",
    requestId,
  });
}
