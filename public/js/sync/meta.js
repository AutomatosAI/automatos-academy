// Syncer bookkeeping (PRD-U2 S1) — port of the mobile client's sync/meta.ts:
// the reconcile cursor (the serverTime returned by the last successful
// /api/me/state pull — SERVER clock, never device clock), when the last full
// sync completed, the last error code, the 429 backoff state, and the latest
// server profile snapshot (streak + member-since, S3/S4) so the profile view
// renders without a blocking fetch. Persisted so all of it is honest across
// reloads; corrupt/unavailable storage degrades to a fresh empty meta.

const META_KEY = "automatos-academy:v1:sync-meta";

export function emptyMeta() {
  return {
    /** `since` for the next /api/me/state pull (server clock, ISO) */
    sinceCursor: null,
    /** epoch ms of the last successful flush+reconcile */
    lastSyncedAt: null,
    /** machine-readable code of the last failure (null when healthy) */
    lastErrorCode: null,
    /** 429 backoff: no sync attempts before this epoch ms */
    backoffUntil: null,
    /** consecutive 429s — drives the exponential curve */
    rateLimitStrikes: 0,
    /** latest server-derived profile extras from /api/me/state (S3):
     *  { streak: {current, best}, user: {createdAt, plan}, fetchedAt } */
    profile: null,
  };
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return emptyMeta();
    const doc = JSON.parse(raw);
    return doc && typeof doc === "object" ? { ...emptyMeta(), ...doc } : emptyMeta();
  } catch (_) {
    return emptyMeta();
  }
}

/** merge a patch over the persisted meta (immutably, whole-doc replace) */
export function saveMeta(patch) {
  const next = { ...loadMeta(), ...patch };
  try { localStorage.setItem(META_KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}

/** drop the cursor + profile snapshot (data wipe / restore paths) so the next
 *  reconcile pulls the FULL state instead of a since-delta */
export function resetMeta() {
  try { localStorage.removeItem(META_KEY); } catch (_) {}
}
