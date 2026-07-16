// Backfill synthesis (PRD-U2 S2, D-U5a) — turn one track's local store state
// ({ q, exams, scenarios } from store.js) into the wire events that carry a
// device's pre-account history into the Spine. PURE module: no DOM, no
// localStorage — the caller supplies `idFor`, a stable-key → eventId mapping
// whose manifest is PERSISTED BEFORE anything is sent, so a retried backfill
// re-synthesizes the SAME eventIds and the server's dedupe absorbs the replay
// (append-only tables dedupe on eventId; upserts on scope key + wall-clock).
//
// History ordering survives by construction: every synthesized event keeps
// the record's original stored timestamp (`at`), so the Spine's
// later-wall-clock-wins merge slots months of localStorage history correctly
// against whatever other devices already pushed. Node-importable — the spine
// integration suite proves backfill idempotence through this exact code path.

import { buildProgressEvent, buildMockEvent, buildScenarioEvent } from "./events.js";

const DAY = 86_400_000;

/** Stable per-record keys — the manifest identity a record keeps across
 *  retries AND across backup/restore (progress-io.js round-trips them). */
export const recordKeys = {
  progress: (v, t, itemId) => `p:${v}/${t}/${itemId}`,
  mock: (v, t, rec) => `m:${v}/${t}/${rec.at || 0}:${rec.scaled}:${!!rec.passed}`,
  scenario: (v, t, scenarioId) => `s:${v}/${t}/${scenarioId}`,
};

/**
 * @param {object} state    one track's store state: { q?, exams?, scenarios? }
 * @param {string} vendorId
 * @param {string} trackId
 * @param {(key: string) => string} idFor  stable key → persisted uuid eventId
 * @param {number} [nowMs]
 * @returns {{ progress: object[], mocks: object[], scenarios: object[],
 *             skipped: {key: string, reason: string}[] }}
 */
export function synthesizeTrackEvents(state, vendorId, trackId, idFor, nowMs) {
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  const out = { progress: [], mocks: [], scenarios: [], skipped: [] };
  if (!state || typeof state !== "object") return out;

  // q{} → progress events, answeredAt = the stored `at`. Very old records
  // predating the `at` field fall back to (due − interval·day) — the closest
  // honest reconstruction of when the answer happened — never "now", which
  // would let a backfill beat genuinely newer answers from other devices.
  for (const [itemId, rec] of Object.entries(state.q || {})) {
    if (!rec || typeof rec !== "object") continue;
    const at = typeof rec.at === "number" ? rec.at
      : (typeof rec.due === "number" && typeof rec.interval === "number" ? rec.due - rec.interval * DAY : null);
    const key = recordKeys.progress(vendorId, trackId, itemId);
    const r = buildProgressEvent({
      vendorId, trackId, itemId,
      correct: typeof rec.last === "boolean" ? rec.last : rec.correct > 0,
      state: { ...rec, at },
      eventId: idFor(key),
      nowMs: now,
    });
    if (r.event) out.progress.push(r.event);
    else out.skipped.push({ key, reason: r.error });
  }

  // exams[] → mock events. The persisted eventId manifest is what makes this
  // safe: mock_attempts is append-only (dedupe on eventId ONLY), so a retry
  // minting fresh uuids would duplicate history server-side.
  for (const rec of state.exams || []) {
    if (!rec || typeof rec !== "object") continue;
    const key = recordKeys.mock(vendorId, trackId, rec);
    const r = buildMockEvent({
      vendorId, trackId,
      scaled: rec.scaled, passed: !!rec.passed, at: rec.at,
      eventId: idFor(key), nowMs: now,
    });
    if (r.event) out.mocks.push(r.event);
    else out.skipped.push({ key, reason: r.error });
  }

  // scenarios{} → scenario events. The web store keeps no branch position, so
  // `step` rides as 0 — score + completion time are the truth a web run has.
  for (const [scenarioId, rec] of Object.entries(state.scenarios || {})) {
    if (!rec || typeof rec !== "object") continue;
    const key = recordKeys.scenario(vendorId, trackId, scenarioId);
    const r = buildScenarioEvent({
      vendorId, trackId, scenarioId,
      step: 0, scorePct: rec.score, at: rec.at,
      eventId: idFor(key), nowMs: now,
    });
    if (r.event) out.scenarios.push(r.event);
    else out.skipped.push({ key, reason: r.error });
  }

  return out;
}
