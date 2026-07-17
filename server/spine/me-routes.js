// Per-user state out + GDPR surface (PRD-MT-02 US-024/US-025).
//
//   GET    /api/me/state?since=   — reconciled state deltas, decay ON READ
//                                   (+ PRD-U2 S4.3 additive fields: `streak`
//                                   {current, best} rolled up on read from
//                                   distinct UTC activity days, and `user`
//                                   {createdAt, plan} for profile headers —
//                                   both ride EVERY response as absolute
//                                   values, never deltas; existing clients
//                                   passthrough-ignore them)
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

// Study streak (PRD-U2 S4.3) — a rollup computed ON READ, no schema change:
// (exported for PRD-COMMUNITY S1 share attestation — one SQL, two callers)
// an "active day" is any distinct UTC calendar day carrying an answer
// (progress.answered_at — device wall-clock, the same truth the merge uses)
// or a telemetry row (telemetry.created_at). Consecutive days group via the
// classic day − row_number() gaps-and-islands trick; `best` is the longest
// island, `current` the island still touching today OR yesterday (UTC) — a
// streak isn't broken until a full UTC day passes with no activity. UTC
// boundaries are v1, stated in the profile copy ("days are UTC").
export const STREAK_SQL = `
  WITH days AS (
    SELECT (answered_at AT TIME ZONE 'UTC')::date AS day FROM progress WHERE user_id = $1
    UNION
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day FROM telemetry WHERE user_id = $1
  ),
  runs AS (
    SELECT day, day - (ROW_NUMBER() OVER (ORDER BY day))::int AS grp FROM days
  ),
  lens AS (
    SELECT count(*)::int AS len, max(day) AS last_day FROM runs GROUP BY grp
  )
  SELECT
    COALESCE((SELECT max(len) FROM lens), 0)::int AS best,
    COALESCE((SELECT len FROM lens
              WHERE last_day >= (now() AT TIME ZONE 'UTC')::date - 1
              ORDER BY last_day DESC LIMIT 1), 0)::int AS current
`;

// Deletion order: children first so the response can report per-table counts,
// then the users row itself — "all 7 tables" (US-025). The next authenticated
// call re-mints a users row with a FRESH workspace_id, which is exactly the
// "deleted user re-signs-up clean" semantic the PRD tests demand.
const CHILD_TABLES = ["mastery_map", "progress", "content_cache", "telemetry", "mock_attempts", "scenario_progress", "user_prefs", "mastery_snapshots"];

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

    const [progress, mastery, mocks, scenarios, streak] = await Promise.all([
      pool.query(`SELECT vendor_id, track_id, item_id, seen, correct, ease, "interval" AS interval, due_at, answered_at
                  FROM progress WHERE user_id = $1${cond("answered_at")}`, params),
      pool.query(`SELECT vendor_id, track_id, scope_type, scope_id, competence, decay_at, updated_at
                  FROM mastery_map WHERE user_id = $1${cond("updated_at")}`, params),
      pool.query(`SELECT vendor_id, track_id, scaled, passed, "at" AS at
                  FROM mock_attempts WHERE user_id = $1${cond('"at"')}`, params),
      pool.query(`SELECT vendor_id, track_id, scenario_id, step, score_pct, updated_at
                  FROM scenario_progress WHERE user_id = $1${cond("updated_at")}`, params),
      pool.query(STREAK_SQL, [userId]), // always user-scoped, never since-filtered
    ]);

    return ok(res, {
      serverTime: new Date(nowMs).toISOString(), // the client's next `since` cursor
      progress: progress.rows.map(progressToWire),
      masteryMap: mastery.rows.map((r) => masteryToWire(masteryRowFromDb(r), scopeWeight, nowMs)),
      mockAttempts: mocks.rows.map(mockToWire),
      scenarioProgress: scenarios.rows.map(scenarioToWire),
      // PRD-U2 additive envelope fields — absolute values on every pull.
      // The mobile client's MeStateSchema is .passthrough() (schemas.ts), so
      // pre-U2 apps ignore these cleanly.
      streak: { current: streak.rows[0].current, best: streak.rows[0].best },
      user: { createdAt: iso(req.spineUser.created_at), plan: req.spineUser.plan },
    });
  }));

  // ── GET /api/me/prefs — the digest toggle's read side (PRD-DIGEST S1) ─
  // unsub_token stays server-side here (it's an email-capability, not a
  // display fact); the export below carries it, raw-truth style.
  router.get("/prefs", wrap(async (req, res) => {
    const r = await pool.query(
      "SELECT digest_enabled, exam_dates FROM user_prefs WHERE user_id = $1",
      [req.spineUser.id],
    );
    const row = r.rows[0];
    return ok(res, {
      digestEnabled: row ? row.digest_enabled : false,
      examDates: row ? row.exam_dates : {},
    });
  }));

  // ── PUT /api/me/prefs — partial upsert (PRD-DIGEST S1) ───────────────
  // PUT because exam-date.js's fire-and-forget push (PRD-WEB-LOOP S1) was
  // already shipped speaking PUT against the 501 fallback. Only the fields
  // present change — the examDates push must never reset the digest toggle,
  // and vice versa. Re-opt-in ROTATES unsub_token (§4.4: a forwarded old
  // unsubscribe link can't re-toggle a learner who came back).
  router.put("/prefs", wrap(async (req, res) => {
    const body = req.body || {};
    let digestEnabled = null;
    if (body.digestEnabled !== undefined) {
      if (typeof body.digestEnabled !== "boolean") return fail(res, 400, "digest_enabled_not_boolean");
      digestEnabled = body.digestEnabled;
    }
    let examDates = null;
    if (body.examDates !== undefined) {
      const e = body.examDates;
      if (!e || typeof e !== "object" || Array.isArray(e)) return fail(res, 400, "exam_dates_not_object");
      const entries = Object.entries(e);
      if (entries.length > 60) return fail(res, 400, "exam_dates_too_many");
      for (const [k, v] of entries) {
        if (!/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/.test(k)) return fail(res, 400, "exam_dates_bad_key");
        if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail(res, 400, "exam_dates_bad_date");
      }
      examDates = e;
    }
    if (digestEnabled === null && examDates === null) return fail(res, 400, "no_known_fields");

    const r = await pool.query(
      `INSERT INTO user_prefs (user_id, digest_enabled, exam_dates)
       VALUES ($1, COALESCE($2, false), COALESCE($3, '{}'::jsonb))
       ON CONFLICT (user_id) DO UPDATE SET
         digest_enabled = COALESCE($2, user_prefs.digest_enabled),
         exam_dates     = COALESCE($3, user_prefs.exam_dates),
         unsub_token    = CASE WHEN COALESCE($2, false) AND NOT user_prefs.digest_enabled
                               THEN gen_random_uuid() ELSE user_prefs.unsub_token END,
         updated_at     = now()
       RETURNING digest_enabled, exam_dates`,
      [req.spineUser.id, digestEnabled, examDates === null ? null : JSON.stringify(examDates)],
    );
    return ok(res, { digestEnabled: r.rows[0].digest_enabled, examDates: r.rows[0].exam_dates });
  }));

  // ── GET /api/me/export — GDPR access/portability (F8) ───────────────
  router.get("/export", wrap(async (req, res) => {
    const userId = req.spineUser.id;
    const u = req.spineUser;
    const [mastery, progress, cache, telemetry, mocks, scenarios, prefs, snapshots] = await Promise.all([
      pool.query("SELECT * FROM mastery_map WHERE user_id = $1", [userId]),
      pool.query('SELECT * FROM progress WHERE user_id = $1', [userId]),
      pool.query("SELECT * FROM content_cache WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM telemetry WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM mock_attempts WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM scenario_progress WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM user_prefs WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM mastery_snapshots WHERE user_id = $1", [userId]),
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
      // PRD-DIGEST S1 — the two new tables ride both export and delete.
      userPrefs: prefs.rows,
      masterySnapshots: snapshots.rows,
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
