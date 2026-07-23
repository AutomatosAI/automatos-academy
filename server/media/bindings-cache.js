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

export function createBindingsCache({ pool, intervalMs = 30000, logger = console } = {}) {
  let byTrack = new Map();
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
    for (const entry of next.values()) {
      entry.version = crypto.createHash("sha1").update(entry._parts.join("|")).digest("hex").slice(0, 12);
      delete entry._parts;
    }
    byTrack = next;
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
