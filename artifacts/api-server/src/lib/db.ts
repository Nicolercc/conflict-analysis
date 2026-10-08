import pg from "pg";
import { logger } from "./logger";

/** One connection pool for everything the server keeps in Postgres. */
export function createPool(connectionString: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    // Hosted Postgres requires TLS; a local server does not offer it.
    ssl: /localhost|127\.0\.0\.1|sslmode=disable/.test(connectionString) ? undefined : { rejectUnauthorized: true },
  });
  // An idle connection dropped by the server must not crash the process.
  pool.on("error", (err) => logger.warn({ err }, "database connection error"));
  return pool;
}

/**
 * Runs a table's CREATE statements once, on first use, and again after a
 * failure — so the server can start before the database is reachable.
 */
export function once(setup: () => Promise<unknown>): () => Promise<void> {
  let ready: Promise<void> | null = null;
  return () => {
    ready ??= setup().then(
      () => undefined,
      (err) => {
        ready = null;
        throw err;
      },
    );
    return ready;
  };
}

export const safeName = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error("invalid table name");
  return name;
};
