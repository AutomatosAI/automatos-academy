// Bindings cache (PRD-WAVE-CONTENT-OPS C3 PR2) — media_bindings held in memory,
// refreshed on a light poll (and immediately on a bind/unbind via onChange), so
// the catalog serve path overlays them with ZERO per-request DB queries. Each
// track carries a `version` hash of its bindings so the track ETag busts the
// moment an upload lands. Fail-soft: a refresh error keeps the last-good map.

import crypto from "node:crypto";

const ALL_SQL = `
  SELECT vendor_id, track_id, slot_id, kind, url, content_type, size_bytes
  FROM media_bindings
  ORDER BY vendor_id, track_id, slot_id, kind;`;

/** no bindings at all — a real, stable value, never null (clients compare it) */
const EMPTY_MEDIA_VERSION = "none";

export function createBindingsCache({ pool, intervalMs = 30000, logger = console } = {}) {
  let byTrack = new Map();
  let mediaVersion = EMPTY_MEDIA_VERSION;
  let timer = null;

  async function loadOnce() {
    const { rows } = await pool.query(ALL_SQL);
    const next = new Map();
    for (const r of rows) {
      const key = `${r.vendor_id}/${r.track_id}`;
      let entry = next.get(key);
      if (!entry) {
        entry = { bySlot: new Map(), _parts: [] };
        next.set(key, entry);
      }
      entry.bySlot.set(`${r.slot_id}:${r.kind}`, {
        url: r.url,
        contentType: r.content_type,
        size: r.size_bytes,
      });
      entry._parts.push(`${r.slot_id}:${r.kind}=${r.url}`);
    }
    const rollup = [];
    for (const [key, entry] of [...next.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      entry.version = crypto.createHash("sha1").update(entry._parts.join("|")).digest("hex").slice(0, 12);
      delete entry._parts;
      rollup.push(`${key}=${entry.version}`);
    }
    byTrack = next;
    // One hash over every track's binding version, sorted so it is stable
    // across row order. This is what /version publishes as mediaVersion: it
    // moves whenever ANY binding is added, changed or removed, and only then.
    mediaVersion = rollup.length
      ? crypto.createHash("sha1").update(rollup.join("|")).digest("hex").slice(0, 12)
      : EMPTY_MEDIA_VERSION;
  }

  async function refresh() {
    try {
      await loadOnce();
    } catch (e) {
      (logger.warn || logger.log || (() => {}))(`[media] bindings refresh failed (keeping last-good): ${e.message}`);
    }
  }

  return {
    /** the track's { bySlot: Map, version } or null */
    get: (vendor, track) => byTrack.get(`${vendor}/${track}`) || null,
    /**
     * One version over ALL bindings, for /version.
     *
     * Why it exists: binding media is a serve-time overlay, so it deliberately
     * does NOT move contentVersion (which is a rollup over published content
     * files and carries publish/rollback semantics). But a client that gates
     * its refresh on contentVersion alone therefore never notices new audio or
     * video — it never even issues the conditional request that would see the
     * busted ETag. Publishing this separately lets a client refresh on either
     * signal without entangling bindings with the publish model.
     */
    mediaVersion: () => mediaVersion,
    refresh,
    start() {
      void refresh(); // best-effort initial load; empty until it lands
      timer = setInterval(refresh, intervalMs);
      if (timer.unref) timer.unref(); // never keep the process alive
      return this;
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    // test seam — deterministic single load
    _loadOnce: loadOnce,
  };
}
