/**
 * Whether the model provider is currently answering. A server can be up, with
 * a key present, and still be unable to write a single brief: the key revoked,
 * the account suspended, the credit spent. Those show up only when a call is
 * made, so the outcome of the most recent calls is remembered here and
 * reported by the readiness check.
 */
export type ModelFailure = "refused" | "transient";

type State = { lastOk: number | null; lastRefused: { at: number; status: number | null } | null; refusals: number };
const state: State = { lastOk: null, lastRefused: null, refusals: 0 };

/**
 * "refused" means the provider turned the request away for a reason that will
 * not fix itself — bad key, no credit, suspended account. Overload, rate
 * limits and timeouts are "transient".
 */
export function classifyModelError(err: unknown): { kind: ModelFailure; status: number | null } {
  const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : null;
  const refused = status !== null && [400, 401, 402, 403].includes(status);
  return { kind: refused ? "refused" : "transient", status };
}

export function noteModelSuccess(now = Date.now()) {
  state.lastOk = now;
  state.refusals = 0;
}

export function noteModelFailure(err: unknown, now = Date.now()) {
  const { kind, status } = classifyModelError(err);
  if (kind !== "refused") return;
  state.lastRefused = { at: now, status };
  state.refusals += 1;
}

/** Null when the provider is answering, or has not been asked yet. */
export function modelProblem(): { since: string; status: number | null; refusals: number } | null {
  const { lastOk, lastRefused, refusals } = state;
  if (!lastRefused || (lastOk !== null && lastOk > lastRefused.at)) return null;
  return { since: new Date(lastRefused.at).toISOString(), status: lastRefused.status, refusals };
}

export function resetModelHealth() {
  state.lastOk = null;
  state.lastRefused = null;
  state.refusals = 0;
}
