// Approved-draft overrides cache (PRD-CONTENT-LIFECYCLE S4) — the content twin
// of media/bindings-cache.js. Every APPROVED draft is held in memory keyed by
// scope tuple, refreshed on a light poll (and immediately on approve/reject via
// onChange), so the catalog serve path overlays text with ZERO per-request DB
// queries. Fail-soft: a refresh error keeps the last-good map (serving never
// depends on the DB being reachable this second).

const APPROVED_SQL = `
  SELECT scope_kind, vendor_id, track_id, domain_id, canonical, sha256
  FROM content_drafts
  WHERE status = 'approved';`;

// One stable key per scope tuple (NULL ids fold to ""), matching the table's
// NULLS NOT DISTINCT uniqueness — so a singleton scope has exactly one slot.
export function scopeKey(scopeKind, vendorId, trackId, domainId) {
  return `${scopeKind}|${vendorId || ""}|${trackId || ""}|${domainId || ""}`;
}

export function createOverridesCache({ pool, intervalMs = 30000, logger = console } = {}) {
  let byScope = new Map();
  let timer = null;

  async function loadOnce() {
    const { rows } = await pool.query(APPROVED_SQL);
    const next = new Map();
    for (const r of rows) {
      next.set(scopeKey(r.scope_kind, r.vendor_id, r.track_id, r.domain_id), {
        canonical: r.canonical,
        sha256: r.sha256,
      });
    }
    byScope = next;
  }

  async function refresh() {
    try {
      await loadOnce();
    } catch (e) {
      (logger.warn || logger.log || (() => {}))(`[content] overrides refresh failed (keeping last-good): ${e.message}`);
    }
  }

  return {
    /** the approved { canonical, sha256 } for a scope, or null */
    get: (scopeKind, vendorId, trackId, domainId) =>
      byScope.get(scopeKey(scopeKind, vendorId, trackId, domainId)) || null,
    size: () => byScope.size,
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
    _loadOnce: loadOnce, // test seam — deterministic single load
  };
}
