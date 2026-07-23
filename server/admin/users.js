// Admin users + progress API (PRD-ADMIN-CONSOLE S2/S3). All routes are already
// behind `auth, requireRole("admin")` at the mount; role CHANGES are further
// gated to owners. Every write is audited. Read-scoped to any target user (the
// self-service /api/me is per-caller; this is the admin's cross-user view).

import express from "express";
import { ok, fail, wrap } from "../spine/http.js";
import { wipeUserRows, STREAK_SQL } from "../spine/me-routes.js";
import { scopeWeightResolver, masteryToWire } from "../spine/rollups.js";
import { ROLE_RANK } from "../spine/auth.js";

const VALID_ROLES = ["learner", "admin", "owner"];
const VALID_PLANS = ["free", "pro"];

// Privilege boundary: a non-owner admin may only act on strictly-lower-ranked
// targets (learners). Owners may act on anyone. Prevents an admin from
// deleting/modifying a peer admin or an owner. Returns an error code or null.
function targetGuard(callerRole, targetRole) {
  if (callerRole === "owner") return null;
  return (ROLE_RANK[targetRole] ?? 0) >= (ROLE_RANK[callerRole] ?? 0) ? "forbidden_target" : null;
}
const USER_COLS = "id, clerk_user_id, workspace_id, plan, role, created_at";
const toWire = (r) => ({
  id: r.id, clerkUserId: r.clerk_user_id, workspaceId: r.workspace_id,
  plan: r.plan, role: r.role,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
});
const masteryRowFromDb = (r) => ({
  scopeType: r.scope_type, vendorId: r.vendor_id, trackId: r.track_id, scopeId: r.scope_id,
  competence: r.competence, decayAt: r.decay_at, updatedAt: r.updated_at,
});

export function createUsersRouter({ pool, index, audit, clerkUserDeleter }) {
  const router = express.Router();
  const json = express.json({ limit: "8kb" });
  const scopeWeight = scopeWeightResolver(index);

  // GET /  — list/search (?q= clerk-id substring, ?plan=, ?role=, ?limit=, ?offset=)
  router.get("/", wrap(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const plan = String(req.query.plan || "").trim();
    const role = String(req.query.role || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const cond = [], p = [];
    if (q) { p.push(`%${q}%`); cond.push(`clerk_user_id ILIKE $${p.length}`); }
    if (plan) { p.push(plan); cond.push(`plan = $${p.length}`); }
    if (role) { p.push(role); cond.push(`role = $${p.length}`); }
    const w = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

    const { rows: cnt } = await pool.query(`SELECT count(*)::int AS n FROM users ${w}`, p);
    const { rows } = await pool.query(
      `SELECT ${USER_COLS} FROM users ${w} ORDER BY created_at DESC LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, offset],
    );
    return ok(res, { users: rows.map(toWire), total: cnt[0].n, limit, offset });
  }));

  // GET /:id  — one user + activity counts
  router.get("/:id", wrap(async (req, res) => {
    const { rows } = await pool.query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [req.params.id]);
    if (!rows.length) return fail(res, 404, "user_not_found");
    const [pc, mc] = await Promise.all([
      pool.query(`SELECT count(*)::int AS n FROM progress WHERE user_id = $1`, [req.params.id]),
      pool.query(`SELECT count(*)::int AS n FROM mock_attempts WHERE user_id = $1`, [req.params.id]),
    ]);
    return ok(res, { user: toWire(rows[0]), counts: { progress: pc.rows[0].n, mocks: mc.rows[0].n } });
  }));

  // GET /:id/progress  — the target user's mastery/streak/mocks (admin-scoped)
  router.get("/:id/progress", wrap(async (req, res) => {
    const { rows: u } = await pool.query("SELECT id FROM users WHERE id = $1", [req.params.id]);
    if (!u.length) return fail(res, 404, "user_not_found");
    const nowMs = Date.now();
    const [progress, mastery, mocks, streak] = await Promise.all([
      pool.query(`SELECT vendor_id, track_id, item_id, seen, correct, answered_at FROM progress WHERE user_id = $1`, [req.params.id]),
      pool.query(`SELECT vendor_id, track_id, scope_type, scope_id, competence, decay_at, updated_at FROM mastery_map WHERE user_id = $1`, [req.params.id]),
      pool.query(`SELECT vendor_id, track_id, scaled, passed, "at" AS at FROM mock_attempts WHERE user_id = $1`, [req.params.id]),
      pool.query(STREAK_SQL, [req.params.id]),
    ]);
    return ok(res, {
      userId: req.params.id,
      masteryMap: mastery.rows.map((r) => masteryToWire(masteryRowFromDb(r), scopeWeight, nowMs)),
      progressCount: progress.rows.length,
      mockAttempts: mocks.rows,
      streak: { current: streak.rows[0].current, best: streak.rows[0].best },
    });
  }));

  // PATCH /:id  — set role and/or plan. Role change is OWNER-only; a non-owner
  // admin cannot modify a peer/higher-ranked target; plan is allow-listed.
  router.patch("/:id", json, wrap(async (req, res) => {
    const { role, plan } = req.body || {};
    if (role !== undefined && !VALID_ROLES.includes(role)) return fail(res, 400, "bad_role");
    if (plan !== undefined && !VALID_PLANS.includes(String(plan))) return fail(res, 400, "bad_plan");
    if (role !== undefined && req.spineUser.role !== "owner") return fail(res, 403, "owner_only_role_change");
    const { rows: tgt } = await pool.query("SELECT role FROM users WHERE id = $1", [req.params.id]);
    if (!tgt.length) return fail(res, 404, "user_not_found");
    const g = targetGuard(req.spineUser.role, tgt[0].role);
    if (g) return fail(res, 403, g);

    const sets = [], p = [];
    if (role !== undefined) { p.push(role); sets.push(`role = $${p.length}`); }
    if (plan !== undefined) { p.push(String(plan)); sets.push(`plan = $${p.length}`); }
    if (!sets.length) return fail(res, 400, "nothing_to_update");
    p.push(req.params.id);
    const { rows } = await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${p.length} RETURNING ${USER_COLS}`, p);
    await audit(req, "user.update", req.params.id, { role, plan });
    return ok(res, { user: toWire(rows[0]) });
  }));

  // DELETE /:id  — wipe rows (+ optional Clerk). Guards: not yourself, not a
  // peer/higher-ranked target (unless owner), and never the last owner.
  router.delete("/:id", wrap(async (req, res) => {
    if (req.params.id === req.spineUser.id) return fail(res, 400, "use_self_service_delete");
    const { rows } = await pool.query("SELECT role, clerk_user_id FROM users WHERE id = $1", [req.params.id]);
    if (!rows.length) return fail(res, 404, "user_not_found");
    const g = targetGuard(req.spineUser.role, rows[0].role);
    if (g) return fail(res, 403, g);
    if (rows[0].role === "owner") {
      const { rows: oc } = await pool.query("SELECT count(*)::int AS n FROM users WHERE role = 'owner'");
      if (oc[0].n <= 1) return fail(res, 400, "last_owner");
    }
    const deleted = await wipeUserRows(pool, req.params.id);
    let clerkDeleted = false;
    if (clerkUserDeleter && rows[0].clerk_user_id) {
      try { await clerkUserDeleter(rows[0].clerk_user_id); clerkDeleted = true; } catch (_e) { /* rows already gone */ }
    }
    await audit(req, "user.delete", req.params.id, { clerkDeleted, targetRole: rows[0].role });
    return ok(res, { deleted, clerkDeleted });
  }));

  return router;
}
