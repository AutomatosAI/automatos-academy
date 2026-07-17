// Wire Postgres pool (PRD-WIRE §4.2). Only constructed when the Wire mounts
// AND the Spine didn't already build a pool to share — one DATABASE_URL, one
// pool per process wherever possible (server.js hands the Spine's pool in).
import pg from "pg";

/**
 * Create the pg Pool from a connection string. Loud failure by design: a
 * wire-enabled boot without DATABASE_URL is a misconfigured deploy, not a
 * degraded mode (server.js also refuses that boot before ever calling this).
 */
export function createWirePool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("[wire] DATABASE_URL is required when WIRE_INGEST_KEY is set");
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  // Idle-client errors (e.g. server restart) must not crash the process.
  pool.on("error", (e) => console.error("[wire] idle pg client error:", e.message));
  return pool;
}
