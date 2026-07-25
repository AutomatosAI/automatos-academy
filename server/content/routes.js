// PRD-CONTENT-LIFECYCLE S1+S3 — the text write-back + review API. The media
// plane's twin for lessons/questions/domains: Automatos (machine, X-Admin-Key)
// or a human admin (Clerk allowlist) PROPOSES a scope's canonical bytes; an
// admin approves in #/admin; the serve-time overlay then renders it live.
//
//   POST   /api/admin/content                    write-back → a pending draft
//   GET    /api/admin/content/drafts?status=      list the review queue
//   GET    /api/admin/content/drafts/:id          one draft (incl canonical)
//   POST   /api/admin/content/drafts/:id/approve  approve (supersedes prior)
//   POST   /api/admin/content/drafts/:id/reject   reject
//
// Every route is behind `requireAdmin` (fail-closed). Writes never touch git —
// git stays the offline canonical; approved drafts are the live override.

import express from "express";
import { validateDraft } from "./validate.js";
import { flagItems, flagEvidence, ITEM_FLAG_RULES } from "./item-stats.js";

const INSERT_SQL = `
  INSERT INTO content_drafts
    (scope_kind, vendor_id, track_id, domain_id, rel_path, canonical, payload, sha256, bytes, source, note, created_by)
  VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12)
  ON CONFLICT (scope_kind, vendor_id, track_id, domain_id, sha256) WHERE status = 'pending'
  DO NOTHING
  RETURNING *;`;

// Null-safe re-select of the identical pending draft an idempotent re-POST hit.
const SELECT_DUP_SQL = `
  SELECT * FROM content_drafts
  WHERE status = 'pending' AND scope_kind = $1
    AND vendor_id IS NOT DISTINCT FROM $2
    AND track_id IS NOT DISTINCT FROM $3
    AND domain_id IS NOT DISTINCT FROM $4
    AND sha256 = $5
  ORDER BY created_at DESC LIMIT 1;`;

const LIST_SQL = `
  SELECT id, scope_kind, vendor_id, track_id, domain_id, rel_path, sha256, bytes,
         status, source, note, created_by, created_at, reviewed_by, reviewed_at,
         payload->>'name' AS title
  FROM content_drafts
  WHERE ($1::text IS NULL OR status = $1)
  ORDER BY created_at DESC
  LIMIT $2;`;

const GET_SQL = `SELECT * FROM content_drafts WHERE id = $1;`;

// One atomic statement: supersede the scope's prior approved draft, then
// approve the target — the partial UNIQUE index is checked at statement end,
// where exactly one 'approved' row remains for the scope.
const APPROVE_SQL = `
  WITH tgt AS (
    SELECT id, scope_kind, vendor_id, track_id, domain_id
    FROM content_drafts WHERE id = $1 AND status = 'pending'
  ),
  superseded AS (
    UPDATE content_drafts c SET status = 'superseded', reviewed_by = $2, reviewed_at = now()
    FROM tgt
    WHERE c.status = 'approved' AND c.scope_kind = tgt.scope_kind
      AND c.vendor_id IS NOT DISTINCT FROM tgt.vendor_id
      AND c.track_id IS NOT DISTINCT FROM tgt.track_id
      AND c.domain_id IS NOT DISTINCT FROM tgt.domain_id
    RETURNING c.id
  )
  UPDATE content_drafts SET status = 'approved', reviewed_by = $2, reviewed_at = now()
  WHERE id = (SELECT id FROM tgt)
  RETURNING *;`;

// Reject doubles as "retire a live override": rejecting an APPROVED draft
// drops it from the overlay so the git/DB base serves again. Only a terminal
// (rejected/superseded) draft is a no-op.
const REJECT_SQL = `
  UPDATE content_drafts SET status = 'rejected', reviewed_by = $2, reviewed_at = now()
  WHERE id = $1 AND status IN ('pending', 'approved') RETURNING *;`;

const STATUS_SQL = `SELECT status FROM content_drafts WHERE id = $1;`;

// LA-12 — per-item quality aggregates over a window.
//
// `answer` events carry the SM-2 outcome; `card_review` events carry serve/skip
// and time-on-card. They are counted separately and joined on the item, because
// a card can be served and skipped without ever being answered — and the skip
// rate is exactly that gap.
//
// Discrimination compares learners who have passed a mock against those who
// have not. `mock_attempts` is the only honest source for that split; a learner
// with no attempt is a NON-passer for this purpose, which is conservative (it
// can only shrink an item's apparent discrimination, never inflate it).
//
// NOT computed here: which wrong option was chosen. The answer payload is a
// closed flat-scalar set (itemId, correct, timeMs, bucket, surface) and does
// not carry the chosen option, so `topWrongCount` is left null and the
// `ambiguous` flag cannot fire. That is deliberate — see item-stats.js.
const ITEM_STATS_SQL = `
  WITH win AS (SELECT (now() - ($3 || ' days')::interval) AS since),
  passers AS (
    SELECT DISTINCT user_id FROM mock_attempts WHERE passed = true
  ),
  ans AS (
    SELECT COALESCE(t.item_id, t.payload->>'itemId') AS item_id,
           (t.payload->>'correct')::boolean            AS correct,
           (p.user_id IS NOT NULL)                     AS is_passer
    FROM telemetry t
    CROSS JOIN win
    LEFT JOIN passers p ON p.user_id = t.user_id
    WHERE t.event_type = 'answer'
      AND t.created_at >= win.since
      AND ($1::text IS NULL OR t.vendor_id = $1)
      AND ($2::text IS NULL OR t.track_id  = $2)
      AND COALESCE(t.item_id, t.payload->>'itemId') IS NOT NULL
  ),
  rev AS (
    SELECT COALESCE(t.item_id, t.payload->>'cardId') AS item_id,
           COALESCE((t.payload->>'skipped')::boolean, false) AS skipped,
           NULLIF(t.payload->>'msOnCard', '')::numeric       AS ms
    FROM telemetry t
    CROSS JOIN win
    WHERE t.event_type = 'card_review'
      AND t.created_at >= win.since
      AND ($1::text IS NULL OR t.vendor_id = $1)
      AND ($2::text IS NULL OR t.track_id  = $2)
      AND COALESCE(t.item_id, t.payload->>'cardId') IS NOT NULL
  ),
  a AS (
    SELECT item_id,
           count(*)                                                       AS attempts,
           count(*) FILTER (WHERE correct)                                AS correct,
           count(*) FILTER (WHERE is_passer)                              AS passer_attempts,
           count(*) FILTER (WHERE is_passer AND correct)                  AS passer_correct,
           count(*) FILTER (WHERE NOT is_passer)                          AS non_passer_attempts,
           count(*) FILTER (WHERE NOT is_passer AND correct)              AS non_passer_correct
    FROM ans GROUP BY item_id
  ),
  r AS (
    SELECT item_id,
           count(*)                          AS served,
           count(*) FILTER (WHERE skipped)   AS skipped,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY ms) AS median_ms
    FROM rev GROUP BY item_id
  )
  SELECT COALESCE(a.item_id, r.item_id) AS item_id,
         COALESCE(a.attempts, 0)            AS attempts,
         COALESCE(a.correct, 0)             AS correct,
         COALESCE(r.served, 0)              AS served,
         COALESCE(r.skipped, 0)             AS skipped,
         r.median_ms                        AS median_ms,
         COALESCE(a.passer_attempts, 0)     AS passer_attempts,
         COALESCE(a.passer_correct, 0)      AS passer_correct,
         COALESCE(a.non_passer_attempts, 0) AS non_passer_attempts,
         COALESCE(a.non_passer_correct, 0)  AS non_passer_correct
  FROM a FULL OUTER JOIN r ON a.item_id = r.item_id;`;

const actorOf = (req) => (typeof req.adminActor === "string" ? req.adminActor : "machine");

// DB row (snake_case) → API shape (camelCase). `full` includes the canonical.
function shape(row, { full = false } = {}) {
  if (!row) return null;
  const out = {
    id: Number(row.id),
    scopeKind: row.scope_kind,
    vendorId: row.vendor_id,
    trackId: row.track_id,
    domainId: row.domain_id,
    relPath: row.rel_path,
    sha256: row.sha256,
    bytes: row.bytes,
    status: row.status,
    source: row.source,
    note: row.note,
    title: row.title != null ? row.title : (row.payload && row.payload.name) || null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
  if (full) out.canonical = row.canonical;
  return out;
}

export function registerContentRoutes(app, { pool, requireAdmin, onChange = () => {} }) {
  const json = express.json({ limit: "2mb" });
  const notify = () => { try { onChange(); } catch { /* overlay refresh is best-effort */ } };

  // ── write-back: propose a scope's canonical bytes as a pending draft ──
  app.post("/api/admin/content", requireAdmin, json, (req, res, next) => {
    (async () => {
      const v = validateDraft(req.body || {});
      if (!v.ok) return res.status(400).json({ error: v.error, ...(v.note ? { note: v.note } : {}) });
      const d = v.draft;
      const params = [
        d.scopeKind, d.vendorId, d.trackId, d.domainId, d.relPath,
        d.canonical, d.canonical, d.sha256, d.bytes, d.source, d.note, actorOf(req),
      ];
      const ins = await pool.query(INSERT_SQL, params);
      if (ins.rows.length) return res.status(201).json({ ok: true, draft: shape(ins.rows[0]) });
      // Idempotent: an identical pending draft already exists — return it.
      const dup = await pool.query(SELECT_DUP_SQL, [d.scopeKind, d.vendorId, d.trackId, d.domainId, d.sha256]);
      return res.status(200).json({ ok: true, deduped: true, draft: shape(dup.rows[0]) });
    })().catch(next);
  });

  // ── review queue ──
  app.get("/api/admin/content/drafts", requireAdmin, (req, res, next) => {
    (async () => {
      const status = typeof req.query.status === "string" && req.query.status ? req.query.status : null;
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
      const { rows } = await pool.query(LIST_SQL, [status, limit]);
      res.json({ drafts: rows.map((r) => shape(r)) });
    })().catch(next);
  });

  app.get("/api/admin/content/drafts/:id", requireAdmin, (req, res, next) => {
    (async () => {
      const { rows } = await pool.query(GET_SQL, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "not_found" });
      res.json({ draft: shape(rows[0], { full: true }) });
    })().catch(next);
  });

  // ── approve: the scope's live override becomes this draft ──
  app.post("/api/admin/content/drafts/:id/approve", requireAdmin, (req, res, next) => {
    (async () => {
      const cur = await pool.query(STATUS_SQL, [req.params.id]);
      if (!cur.rows.length) return res.status(404).json({ error: "not_found" });
      if (cur.rows[0].status !== "pending") {
        return res.status(409).json({ error: "not_pending", status: cur.rows[0].status });
      }
      const { rows } = await pool.query(APPROVE_SQL, [req.params.id, actorOf(req)]);
      if (!rows.length) return res.status(409).json({ error: "not_pending" }); // lost a race
      notify(); // overlay serves the new content at once
      res.json({ ok: true, draft: shape(rows[0]) });
    })().catch(next);
  });

  // ── LA-12: the flagged-item report ──
  //
  // Worth shipping before the revision playbook exists: the report alone says
  // which items are failing learners, and it is the evidence a revision draft
  // will carry (FR-7). Computed on demand over a window rather than
  // materialised nightly — at pilot volume this is a millisecond query, and a
  // nightly table over one learner's data would be a cache with nothing to
  // serve. The trigger to materialise is measurable: when this stops being
  // fast, not when it starts feeling big.
  app.get("/api/admin/content/item-quality", requireAdmin, (req, res, next) => {
    (async () => {
      const vendorId = typeof req.query.vendorId === "string" && req.query.vendorId ? req.query.vendorId : null;
      const trackId = typeof req.query.trackId === "string" && req.query.trackId ? req.query.trackId : null;
      const days = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 1), 365);
      const { rows } = await pool.query(ITEM_STATS_SQL, [vendorId, trackId, String(days)]);
      const flagged = flagItems(
        rows.map((r) => ({
          itemId: r.item_id,
          attempts: r.attempts,
          correct: r.correct,
          served: r.served,
          skipped: r.skipped,
          medianMsOnCard: r.median_ms,
          // Not on the wire — see ITEM_STATS_SQL. Left null so `ambiguous`
          // cannot fire on an assumption.
          topWrongCount: null,
          passerAttempts: r.passer_attempts,
          passerCorrect: r.passer_correct,
          nonPasserAttempts: r.non_passer_attempts,
          nonPasserCorrect: r.non_passer_correct,
        })),
      );
      res.json({
        days,
        scanned: rows.length,
        flagged: flagged.map((f) => ({ ...f, evidence: flagEvidence(f) })),
        rules: ITEM_FLAG_RULES,
      });
    })().catch(next);
  });

  // ── reject (pending proposal) / retire (a live approved override) ──
  app.post("/api/admin/content/drafts/:id/reject", requireAdmin, (req, res, next) => {
    (async () => {
      const cur = await pool.query(STATUS_SQL, [req.params.id]);
      if (!cur.rows.length) return res.status(404).json({ error: "not_found" });
      if (cur.rows[0].status !== "pending" && cur.rows[0].status !== "approved") {
        return res.status(409).json({ error: "not_rejectable", status: cur.rows[0].status });
      }
      const { rows } = await pool.query(REJECT_SQL, [req.params.id, actorOf(req)]);
      if (!rows.length) return res.status(409).json({ error: "not_rejectable" }); // lost a race
      notify(); // a rejected/retired draft drops from the overlay at once
      res.json({ ok: true, draft: shape(rows[0]) });
    })().catch(next);
  });
}
