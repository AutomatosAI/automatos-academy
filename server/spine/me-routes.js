// Per-user state out + GDPR surface (PRD-MT-02 US-024/US-025).
//
//   GET    /api/me/state?since=   — reconciled state deltas, decay ON READ
//   GET    /api/me/export         — full JSON across all 7 tables (F8 access/portability)
//   DELETE /api/me/data           — wipe Spine rows, keep the Clerk identity
//   DELETE /api/me/account        — wipe rows AND delete the Clerk identity
//                                   (separately confirmed — the cross-surface
//                                   blast radius, 02 §4)
import express from "express";
import { ok, fail, wrap } from "./http.js";
import { parseTimestamp } from "./validate.js";
import { scopeWeightResolver, masteryToWire } from "./rollups.js";

const iso = (v) => (v === null || v === undefined ? null : new Date(v).toISOString());

const progressToWire = (r) => ({
  vendorId: r.vendor_id, trackId: r.track_id, itemId: r.item_id,
  seen: r.seen, correct: r.correct, ease: r.ease, interval: r.interval,
  dueAt: iso(r.due_at), answeredAt: iso(r.answered_at),
});
const mockToWire = (r) => ({ vendorId: r.vendor_id, trackId: r.track_id, scaled: r.scaled, passed: r.passed, at: iso(r.at) });
const scenarioToWire = (r) => ({
  vendorId: r.vendor_id, trackId: r.track_id, scenarioId: r.scenario_id,
  step: r.step, scorePct: r.score_pct, updatedAt: iso(r.updated_at),
});
const masteryRowFromDb = (r) => ({
  scopeType: r.scope_type, vendorId: r.vendor_id, trackId: r.track_id, scopeId: r.scope_id,
  competence: r.competence, decayAt: r.decay_at, updatedAt: r.updated_at,
});

// Deletion order: children first so the response can report per-table counts,
// then the users row itself — "all 7 tables" (US-025). The next authenticated
// call re-mints a users row with a FRESH workspace_id, which is exactly the
// "deleted user re-signs-up clean" semantic the PRD tests demand.
const CHILD_TABLES = ["mastery_map", "progress", "content_cache", "telemetry", "mock_attempts", "scenario_progress"];

async function wipeUserRows(pool, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deleted = {};
    for (const table of CHILD_TABLES) {
      const r = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      deleted[table] = r.rowCount;
    }
    const u = await client.query("DELETE FROM users WHERE id = $1", [userId]);
    deleted.users = u.rowCount;
    await client.query("COMMIT");
    return deleted;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch (_) { /* connection gone */ }
    throw e;
  } finally {
    client.release();
  }
}

export function createMeRouter({ pool, index, clerkUserDeleter }) {
  const router = express.Router();
  const scopeWeight = scopeWeightResolver(index);

  // ── GET /api/me/state?since={ts} ─────────────────────────────────────
  router.get("/state", wrap(async (req, res) => {
    const nowMs = Date.now();
    let since = null;
    if (req.query.since !== undefined && req.query.since !== "") {
      const ms = parseTimestamp(String(req.query.since));
      if (ms === null) return fail(res, 400, "since_unparseable");
      since = new Date(ms);
    }
    const userId = req.spineUser.id;
    const cond = (col) => (since ? ` AND ${col} > $2` : "");
    const params = since ? [userId, since] : [userId];

    const [progress, mastery, mocks, scenarios] = await Promise.all([
      pool.query(`SELECT vendor_id, track_id, item_id, seen, correct, ease, "interval" AS interval, due_at, answered_at
                  FROM progress WHERE user_id = $1${cond("answered_at")}`, params),
      pool.query(`SELECT vendor_id, track_id, scope_type, scope_id, competence, decay_at, updated_at
                  FROM mastery_map WHERE user_id = $1${cond("updated_at")}`, params),
      pool.query(`SELECT vendor_id, track_id, scaled, passed, "at" AS at
                  FROM mock_attempts WHERE user_id = $1${cond('"at"')}`, params),
      pool.query(`SELECT vendor_id, track_id, scenario_id, step, score_pct, updated_at
                  FROM scenario_progress WHERE user_id = $1${cond("updated_at")}`, params),
    ]);

    return ok(res, {
      serverTime: new Date(nowMs).toISOString(), // the client's next `since` cursor
      progress: progress.rows.map(progressToWire),
      masteryMap: mastery.rows.map((r) => masteryToWire(masteryRowFromDb(r), scopeWeight, nowMs)),
      mockAttempts: mocks.rows.map(mockToWire),
      scenarioProgress: scenarios.rows.map(scenarioToWire),
    });
  }));

  // ── GET /api/me/export — GDPR access/portability (F8) ───────────────
  router.get("/export", wrap(async (req, res) => {
    const userId = req.spineUser.id;
    const u = req.spineUser;
    const [mastery, progress, cache, telemetry, mocks, scenarios] = await Promise.all([
      pool.query("SELECT * FROM mastery_map WHERE user_id = $1", [userId]),
      pool.query('SELECT * FROM progress WHERE user_id = $1', [userId]),
      pool.query("SELECT * FROM content_cache WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM telemetry WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM mock_attempts WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM scenario_progress WHERE user_id = $1", [userId]),
    ]);
    // Export is the raw truth: stored (undecayed) competence, full payloads.
    return ok(res, {
      exportedAt: new Date().toISOString(),
      user: { id: u.id, clerkUserId: u.clerk_user_id, workspaceId: u.workspace_id, plan: u.plan, createdAt: iso(u.created_at) },
      masteryMap: mastery.rows,
      progress: progress.rows,
      contentCache: cache.rows,
      telemetry: telemetry.rows,
      mockAttempts: mocks.rows,
      scenarioProgress: scenarios.rows,
    });
  }));

  // ── DELETE /api/me/data — app-local erasure, Clerk identity kept ────
  router.delete("/data", wrap(async (req, res) => {
    const deleted = await wipeUserRows(pool, req.spineUser.id);
    return ok(res, { deleted });
  }));

  // ── DELETE /api/me/account — rows AND the shared Clerk identity ─────
  // Gated by an explicit confirmation header naming the identity (02 §4:
  // nuking the cross-surface identity is the deliberate, separately-confirmed
  // action — never the default delete).
  router.delete("/account", wrap(async (req, res) => {
    const clerkUserId = req.spineUser.clerk_user_id;
    if (req.headers["x-confirm-account-deletion"] !== clerkUserId) {
      return fail(res, 403, "confirmation_required");
    }
    const deleted = await wipeUserRows(pool, req.spineUser.id);
    // Spine rows are gone either way (idempotent — a retry re-runs clean).
    // Clerk deletion is the second half; without a key/deleter it cannot be
    // skipped silently (US-025: skipped-with-error semantics).
    if (!clerkUserDeleter) {
      return fail(res, 502, "clerk_deletion_unavailable", { deleted, clerkDeleted: false });
    }
    try {
      await clerkUserDeleter(clerkUserId);
    } catch (e) {
      console.error("[spine] Clerk user deletion failed:", e.message);
      return fail(res, 502, "clerk_deletion_failed", { deleted, clerkDeleted: false });
    }
    return ok(res, { deleted, clerkDeleted: true });
  }));

  return router;
}
