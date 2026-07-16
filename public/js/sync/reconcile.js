// Reconcile pull (PRD-U2 S1/S2 of the sync loop) — port of the mobile
// client's src/sync/reconcile.ts: after a clean flush, GET
// /api/me/state?since={cursor} and apply the server's reconciled rows to the
// local mirrors. On web THE LOCAL MIRROR IS THE EXISTING STORE — the same
// localStorage keys store.js owns (automatos-academy:v1:{vendor}/{track}),
// written through store.js's raw seam so readiness.js, the views and the
// profile all read reconciled state with ZERO new plumbing. Writes here
// deliberately bypass the store's sync hook (reconciling must never enqueue —
// that would echo the server back at itself).
//
// Everything OVERWRITES WITHOUT CEREMONY: the client never merges competence
// and never re-runs conflict resolution — the Spine already applied
// later-answeredAt-wins across devices. The server-derived masteryMap is
// persisted verbatim into a display-only mirror (never recomputed, never
// pushed). `domainId` and `last` on progress rows are LOCAL-ONLY hints the
// wire doesn't carry, so they survive the overwrite (mobile W1 review M2);
// `last` reflects THIS device's latest answer — cross-device caveat,
// documented not implicit.
//
// The returned serverTime is the next `since` cursor (server clock). The S3
// additive fields (streak, user) ride every response and are returned for the
// syncer to persist — they are absolute values, not deltas.

import { spineRequest } from "./client.js";
import { loadRawState, saveRawState } from "../store.js";

/** web keeps the store's own exam-history cap (store.js slices -25) */
const EXAM_HISTORY_LIMIT = 25;
const MASTERY_MIRROR_KEY = "automatos-academy:v1:sync-mastery";

const ms = (iso) => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

/** server progress row → local SM-2 store entry (store.js q{} shape).
 *  Exported pure for the spine suite. */
export function wireRowToLocal(row, prev) {
  return {
    seen: row.seen,
    correct: row.correct,
    ease: row.ease,
    interval: row.interval,
    due: ms(row.dueAt) ?? 0,
    at: ms(row.answeredAt) ?? undefined,
    domainId: prev ? prev.domainId : undefined,
    last: prev ? prev.last : undefined,
  };
}

/** append-only history: adopt server rows the local list doesn't have yet
 *  (a history list dedupes; it is not competence, nothing is "merged") */
function applyMocks(existing, rows) {
  const seen = new Set(existing.map((e) => `${e.at || 0}:${e.scaled}:${!!e.passed}`));
  const adopted = [];
  for (const row of rows) {
    const at = ms(row.at) || 0;
    const key = `${at}:${row.scaled}:${!!row.passed}`;
    if (seen.has(key)) continue;
    seen.add(key);
    adopted.push({ scaled: row.scaled, passed: row.passed, at });
  }
  if (adopted.length === 0) return existing;
  return [...existing, ...adopted].sort((a, b) => (a.at || 0) - (b.at || 0)).slice(-EXAM_HISTORY_LIMIT);
}

function bucketByTrack(state) {
  const buckets = new Map();
  const bucket = (vendorId, trackId) => {
    const key = `${vendorId}/${trackId}`;
    let b = buckets.get(key);
    if (!b) { b = { vendorId, trackId, progress: [], mocks: [], scenarios: [] }; buckets.set(key, b); }
    return b;
  };
  for (const row of state.progress || []) bucket(row.vendorId, row.trackId).progress.push(row);
  for (const row of state.mockAttempts || []) bucket(row.vendorId, row.trackId).mocks.push(row);
  for (const row of state.scenarioProgress || []) bucket(row.vendorId, row.trackId).scenarios.push(row);
  return buckets;
}

/** persist the server masteryMap verbatim (display-only mirror; raw stored
 *  competence when the wire carries it — decay stays a read-time view) */
function applyMasteryMirror(rows) {
  if (!rows || rows.length === 0) return 0;
  let mirror = { v: 1, domains: {}, paths: {} };
  try {
    const raw = localStorage.getItem(MASTERY_MIRROR_KEY);
    if (raw) { const doc = JSON.parse(raw); if (doc && doc.v === 1) mirror = doc; }
  } catch (_) {}
  let applied = 0;
  for (const row of rows) {
    const entry = { competence: row.competenceRaw ?? row.competence, decayAt: ms(row.decayAt) || 0 };
    if (row.scopeType === "domain" && row.vendorId && row.trackId) {
      const trackKey = `${row.vendorId}/${row.trackId}`;
      mirror.domains[trackKey] = { ...(mirror.domains[trackKey] || {}), [row.scopeId]: entry };
      applied++;
    } else if (row.scopeType === "path") {
      mirror.paths[row.scopeId] = entry;
      applied++;
    }
  }
  try { localStorage.setItem(MASTERY_MIRROR_KEY, JSON.stringify(mirror)); } catch (_) {}
  return applied;
}

/**
 * One pull-and-apply. Throws nothing; returns null on any failure so the
 * syncer records the error and keeps the old cursor (retry-safe).
 * @returns {Promise<null | {serverTime: string, streak: object|null,
 *   user: object|null, progressApplied: number, mocksApplied: number,
 *   scenariosApplied: number, masteryApplied: number}>}
 */
export async function reconcileOnce(sinceCursor) {
  const qs = sinceCursor ? `?since=${encodeURIComponent(sinceCursor)}` : "";
  const res = await spineRequest(`/api/me/state${qs}`);
  if (res.code !== null || !res.data || typeof res.data.serverTime !== "string") return null;
  const state = res.data;

  const result = {
    serverTime: state.serverTime,
    streak: state.streak || null,
    user: state.user || null,
    progressApplied: 0,
    mocksApplied: 0,
    scenariosApplied: 0,
    masteryApplied: 0,
  };

  for (const b of bucketByTrack(state).values()) {
    let s = loadRawState(b.vendorId, b.trackId);
    if (b.progress.length) {
      const q = { ...s.q };
      for (const row of b.progress) q[row.itemId] = wireRowToLocal(row, q[row.itemId]);
      s = { ...s, q };
      result.progressApplied += b.progress.length;
    }
    if (b.mocks.length) {
      const before = s.exams;
      const exams = applyMocks(s.exams, b.mocks);
      if (exams !== before) { s = { ...s, exams }; result.mocksApplied += b.mocks.length; }
    }
    if (b.scenarios.length) {
      const scenarios = { ...s.scenarios };
      for (const row of b.scenarios) scenarios[row.scenarioId] = { score: row.scorePct, at: ms(row.updatedAt) || 0 };
      s = { ...s, scenarios };
      result.scenariosApplied += b.scenarios.length;
    }
    saveRawState(b.vendorId, b.trackId, s);
  }

  result.masteryApplied = applyMasteryMirror(state.masteryMap);
  return result;
}
