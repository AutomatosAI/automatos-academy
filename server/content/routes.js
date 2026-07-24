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
