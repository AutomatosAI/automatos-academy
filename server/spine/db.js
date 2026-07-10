// Spine Postgres pool (PRD-MT-02 US-021). Only ever constructed when
// SPINE_ENABLED=true — the service must boot as a pure static/catalog server
// without a database (academy deploy safety), so nothing imports this module
// on the default boot path.
import pg from "pg";

/**
 * Create the pg Pool from a connection string. Loud failure by design: a
 * spine-enabled boot without DATABASE_URL is a misconfigured deploy, not a
 * degraded mode.
 */
export function createPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("[spine] DATABASE_URL is required when SPINE_ENABLED=true");
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  // Idle-client errors (e.g. server restart) must not crash the process.
  pool.on("error", (e) => console.error("[spine] idle pg client error:", e.message));
  return pool;
}
