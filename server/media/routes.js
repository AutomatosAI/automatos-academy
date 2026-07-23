// Media admin routes (PRD-WAVE-CONTENT-OPS C3) — the placeholder-upload plane,
// as a UI backend AND the identical API Automatos calls. All admin-gated.
//
//   GET    /api/admin/media/slots?vendor&track   slot states (placeholder/bound)
//   POST   /api/admin/media/presign               mint a presigned PUT (15 min)
//   POST   /api/admin/media/bind                  verify the object, upsert binding
//   DELETE /api/admin/media/bind                  unbind
//
// Binding writes go to Postgres (media_bindings); the PR2 overlay makes bound
// slots render published in the served content. S3 may be null (unconfigured
// deploy) → presign answers 503, bind still works if the url is already live.

import express from "express";

import { validatePresign, MEDIA_KINDS } from "./validate.js";

const UPSERT_SQL = `
  INSERT INTO media_bindings (vendor_id, track_id, slot_id, kind, url, content_type, size_bytes, uploaded_by, updated_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
  ON CONFLICT (vendor_id, track_id, slot_id, kind)
  DO UPDATE SET url = EXCLUDED.url, content_type = EXCLUDED.content_type,
                size_bytes = EXCLUDED.size_bytes, uploaded_by = EXCLUDED.uploaded_by, updated_at = now()
  RETURNING vendor_id, track_id, slot_id, kind, url;`;

const LIST_SQL = `SELECT slot_id, kind, url, content_type, size_bytes, updated_at
                  FROM media_bindings WHERE vendor_id = $1 AND track_id = $2;`;

const DELETE_SQL = `DELETE FROM media_bindings WHERE vendor_id=$1 AND track_id=$2 AND slot_id=$3 AND kind=$4;`;

/** video slots are defined in git (track.json videos[]); a slot must exist
 *  before it can be bound (no arbitrary keys). audio/transcript slots derive
 *  from lessons/episodes — accepted when the track exists. */
function trackOf(getIndex, vendor, track) {
  return getIndex().tracks.get(`${vendor}/${track}`) || null;
}
function videoSlotExists(t, slotId) {
  return (t.track.data.videos || []).some((v) => v.id === slotId);
}

export function registerMediaRoutes(app, { pool, requireAdmin, s3, cdnBase, getIndex, onChange }) {
  const base = (cdnBase || "https://widgets.automatos.app").replace(/\/+$/, "");
  const json = express.json({ limit: "8kb" });
  const notifyChange = () => {
    try {
      if (typeof onChange === "function") onChange();
    } catch {
      /* overlay refresh is best-effort — never fail a write on it */
    }
  };

  app.get("/api/admin/media/slots", requireAdmin, (req, res, next) => {
    (async () => {
      const { vendor, track } = req.query;
      const t = trackOf(getIndex, vendor, track);
      if (!t) return res.status(404).json({ error: "unknown_track" });
      const bound = new Map();
      const { rows } = await pool.query(LIST_SQL, [vendor, track]);
      for (const r of rows) bound.set(`${r.slot_id}:${r.kind}`, r);
      const videos = (t.track.data.videos || []).map((v) => {
        const b = bound.get(`${v.id}:video`);
        return {
          slotId: v.id,
          kind: "video",
          title: v.title || v.id,
          state: b ? "bound" : v.url ? "published" : "placeholder",
          url: b ? b.url : v.url || null,
        };
      });
      res.json({ vendor, track, slots: videos });
    })().catch(next);
  });

  app.post("/api/admin/media/presign", requireAdmin, json, (req, res, next) => {
    (async () => {
      const v = validatePresign(req.body, { cdnBase: base });
      if (!v.ok) return res.status(v.status).json({ error: v.error, allowed: v.allowed });
      const t = trackOf(getIndex, req.body.vendor, req.body.track);
      if (!t) return res.status(404).json({ error: "unknown_track" });
      if (req.body.kind === "video" && !videoSlotExists(t, req.body.slotId)) {
        return res.status(404).json({ error: "unknown_slot" });
      }
      if (!s3) return res.status(503).json({ error: "not_configured", note: "media S3 not configured on this deploy" });
      const putUrl = await s3.presignPut(v.key, req.body.contentType, 900);
      res.json({ putUrl, finalUrl: v.url, key: v.key, expiresIn: 900 });
    })().catch(next);
  });

  app.post("/api/admin/media/bind", requireAdmin, json, (req, res, next) => {
    (async () => {
      const { vendor, track, slotId, kind, url } = req.body || {};
      if (!MEDIA_KINDS.includes(kind) || !vendor || !track || !slotId || !url) {
        return res.status(400).json({ error: "bad_request" });
      }
      const t = trackOf(getIndex, vendor, track);
      if (!t) return res.status(404).json({ error: "unknown_track" });
      if (kind === "video" && !videoSlotExists(t, slotId)) {
        return res.status(404).json({ error: "unknown_slot" });
      }
      // verify the object is actually live before binding (no dangling urls),
      // when S3 is configured; url on our own CDN base is a hard requirement
      if (!url.startsWith(`${base}/academy/`)) {
        return res.status(400).json({ error: "url_off_cdn" });
      }
      let contentType = null;
      let sizeBytes = null;
      if (s3) {
        const key = url.slice(base.length + 1);
        const head = await s3.headObject(key);
        if (!head.exists) return res.status(409).json({ error: "object_missing", note: "upload before binding" });
        contentType = head.contentType;
        sizeBytes = head.size;
      }
      const { rows } = await pool.query(UPSERT_SQL, [
        vendor, track, slotId, kind, url, contentType, sizeBytes, req.adminActor || null,
      ]);
      notifyChange(); // overlay reflects the new binding at once
      res.json({ ok: true, binding: rows[0] });
    })().catch(next);
  });

  app.delete("/api/admin/media/bind", requireAdmin, json, (req, res, next) => {
    (async () => {
      const { vendor, track, slotId, kind } = req.body || {};
      if (!MEDIA_KINDS.includes(kind) || !vendor || !track || !slotId) {
        return res.status(400).json({ error: "bad_request" });
      }
      await pool.query(DELETE_SQL, [vendor, track, slotId, kind]);
      notifyChange();
      res.json({ ok: true });
    })().catch(next);
  });
}
