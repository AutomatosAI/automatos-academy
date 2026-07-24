// Server-derived CONCEPT rollups (PRD-WAVE-LIVING-ACADEMY LA-2).
//
// The topic-level twin of rollups.js: after every progress reconcile the Spine
// re-derives `user_concept_state` from the merged authoritative rows, inside
// the same transaction. Clients never write it — a device pushes raw answers
// and the server decides what they mean, exactly as mastery_map works (02 §5).
//
// Where mastery_map answers "how ready is this learner for this exam scope?"
// (blueprint-weighted, decayed on read), this answers "what does this learner
// know about THIS TOPIC, and what's overdue?" — the question the composer
// (LA-4) actually asks. They are deliberately separate: mastery_map is the
// readiness math and must not drift, concept state is scheduling pressure.
//
// Rows are keyed to SHARED concept ids, not per-user blobs (PRD §2), so the
// same key a card carries is the key a learner's state hangs off, and the
// aggregate queries the flywheel needs (LA-12) are one GROUP BY away.

import { conceptStatsFromRows } from "../engine/competence.js";
import { effectiveCompetence } from "../engine/decay.js";
import { buildMembership, memberItemIds } from "../concepts/membership.js";
import { parseConceptKey } from "../concepts/keys.js";

const UPSERT_SQL = `
  INSERT INTO user_concept_state (
    user_id, concept_key, vendor_id, track_id, level,
    mastery, coverage, accuracy, items_seen, items_total,
    due_count, next_due_at, lapses, last_seen_at, updated_at
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
  ON CONFLICT ON CONSTRAINT user_concept_state_uniq
  DO UPDATE SET
    mastery = EXCLUDED.mastery, coverage = EXCLUDED.coverage, accuracy = EXCLUDED.accuracy,
    items_seen = EXCLUDED.items_seen, items_total = EXCLUDED.items_total,
    due_count = EXCLUDED.due_count, next_due_at = EXCLUDED.next_due_at,
    lapses = EXCLUDED.lapses, last_seen_at = EXCLUDED.last_seen_at, updated_at = now()
`;

/** All of a user's progress rows for one track, keyed by item_id — the same
 *  shape rollups.js loads, with the two extra columns scheduling needs. */
async function loadTrackRows(client, userId, vendorId, trackId) {
  const { rows } = await client.query(
    `SELECT item_id, seen, correct, due_at, answered_at FROM progress
     WHERE user_id = $1 AND vendor_id = $2 AND track_id = $3`,
    [userId, vendorId, trackId],
  );
  const map = new Map();
  for (const r of rows) {
    map.set(r.item_id, {
      seen: r.seen,
      correct: r.correct,
      dueAtMs: r.due_at ? new Date(r.due_at).getTime() : null,
      answeredAtMs: new Date(r.answered_at).getTime(),
    });
  }
  return map;
}

/**
 * Due pressure + recency for one concept's item set. Pure, so the thresholds
 * are unit-testable without Postgres.
 * @returns {{dueCount, nextDueAtMs, lastSeenAtMs, itemsSeen}}
 */
export function duePressure(itemIds, rows, nowMs) {
  let dueCount = 0, nextDueAtMs = null, lastSeenAtMs = 0, itemsSeen = 0;
  for (const id of itemIds) {
    const r = rows.get(id);
    if (!r) continue;
    itemsSeen++;
    if (r.answeredAtMs > lastSeenAtMs) lastSeenAtMs = r.answeredAtMs;
    if (r.dueAtMs === null) continue;
    if (r.dueAtMs <= nowMs) dueCount++;
    else if (nextDueAtMs === null || r.dueAtMs < nextDueAtMs) nextDueAtMs = r.dueAtMs;
  }
  return { dueCount, nextDueAtMs, lastSeenAtMs: lastSeenAtMs || null, itemsSeen };
}

/**
 * Compute every concept row a track's progress implies. Pure over
 * (membership, rows) — the transaction wrapper below just writes what this
 * returns, and the tests hold it to the numbers without a database.
 *
 * Concepts the learner has never touched produce NO row (absent = zero, the
 * same convention mastery_map uses): a fresh account doesn't get 400 rows of
 * nothing, and "has this learner started d3?" stays a cheap existence check.
 */
export function conceptRowsForTrack(membership, rows, nowMs) {
  const out = [];
  for (const [key, m] of membership) {
    const itemIds = memberItemIds(m);
    const pressure = duePressure(itemIds, rows, nowMs);
    if (pressure.itemsSeen === 0) continue;
    const parsed = parseConceptKey(key);
    if (!parsed) continue;
    const stats = conceptStatsFromRows(m, rows);
    out.push({
      conceptKey: key,
      vendorId: parsed.vendorId,
      trackId: parsed.trackId,
      level: m.level,
      mastery: stats.mastery,
      coverage: stats.coverage,
      accuracy: stats.accuracy,
      itemsSeen: pressure.itemsSeen,
      itemsTotal: itemIds.length,
      dueCount: pressure.dueCount,
      nextDueAtMs: pressure.nextDueAtMs,
      lapses: stats.lapses,
      lastSeenAtMs: pressure.lastSeenAtMs,
    });
  }
  return out;
}

/**
 * Re-derive `user_concept_state` for every concept the touched tracks feed.
 * Runs inside the caller's transaction, alongside rederiveRollups.
 *
 * @param {import("pg").PoolClient} client — inside BEGIN/COMMIT
 * @param {object} index — buildContentIndex() result
 * @param {string} userId — users.id (from the token, never the client)
 * @param {Iterable<string>} touchedTrackKeys — "vendorId/trackId"
 * @param {number} [nowMs]
 * @returns {Promise<Array>} the upserted rows
 */
export async function rederiveConceptState(client, index, userId, touchedTrackKeys, nowMs = Date.now()) {
  const membership = buildMembership(index);
  const upserted = [];

  for (const trackKey of new Set(touchedTrackKeys)) {
    // Tracks this deploy's content doesn't know are skipped — their raw
    // progress rows still hold the truth, and the concept rows appear the
    // moment the content ships. Same posture as mastery_map.
    if (!index.tracks.has(trackKey)) continue;
    const [vendorId, trackId] = trackKey.split("/");
    const rows = await loadTrackRows(client, userId, vendorId, trackId);
    if (rows.size === 0) continue;

    const scoped = new Map();
    for (const [key, m] of membership) if (m.trackKey === trackKey) scoped.set(key, m);

    for (const row of conceptRowsForTrack(scoped, rows, nowMs)) {
      await client.query(UPSERT_SQL, [
        userId, row.conceptKey, row.vendorId, row.trackId, row.level,
        row.mastery, row.coverage, row.accuracy, row.itemsSeen, row.itemsTotal,
        row.dueCount, row.nextDueAtMs === null ? null : new Date(row.nextDueAtMs),
        row.lapses, row.lastSeenAtMs === null ? null : new Date(row.lastSeenAtMs),
      ]);
      upserted.push(row);
    }
  }

  return upserted;
}

/**
 * Half-life weight for a concept's decay. Domain concepts inherit their
 * domain's blueprint weight (heavier domain → slower decay, the same rule
 * mastery_map uses); finer and coarser concepts fall back to the neutral mid
 * weight, since the blueprint has nothing to say about them.
 */
export function conceptWeightResolver(index, defaultWeight = 0.2) {
  const byKey = new Map();
  for (const [trackKey, entry] of index.tracks) {
    for (const [domainId, d] of entry.domains) {
      if (typeof d.data.weight === "number") byKey.set(`${trackKey}/${domainId}`, d.data.weight);
    }
  }
  return (conceptKey) => byKey.get(conceptKey) ?? defaultWeight;
}

/** Wire shape for one concept row, decay applied on read (03 §2) — the same
 *  contract mastery_map's wire rows follow, so a client treats both alike. */
export function conceptStateToWire(row, conceptWeight, nowMs) {
  const lastSeenMs = row.lastSeenAt ? new Date(row.lastSeenAt).getTime() : null;
  const raw = Number(row.mastery) || 0;
  const effective = lastSeenMs === null
    ? raw
    : effectiveCompetence(raw, lastSeenMs, nowMs, conceptWeight(row.conceptKey));
  return {
    conceptKey: row.conceptKey,
    vendorId: row.vendorId,
    trackId: row.trackId,
    level: row.level,
    mastery: effective,
    masteryRaw: raw,
    coverage: Number(row.coverage) || 0,
    accuracy: Number(row.accuracy) || 0,
    itemsSeen: row.itemsSeen,
    itemsTotal: row.itemsTotal,
    dueCount: row.dueCount,
    nextDueAt: row.nextDueAt ? new Date(row.nextDueAt).toISOString() : null,
    lapses: row.lapses,
    lastSeenAt: lastSeenMs === null ? null : new Date(lastSeenMs).toISOString(),
    ...(row.updatedAt ? { updatedAt: new Date(row.updatedAt).toISOString() } : {}),
  };
}

/** DB row → the camelCase shape conceptStateToWire expects. */
export const conceptRowFromDb = (r) => ({
  conceptKey: r.concept_key, vendorId: r.vendor_id, trackId: r.track_id, level: r.level,
  mastery: r.mastery, coverage: r.coverage, accuracy: r.accuracy,
  itemsSeen: r.items_seen, itemsTotal: r.items_total,
  dueCount: r.due_count, nextDueAt: r.next_due_at, lapses: r.lapses,
  lastSeenAt: r.last_seen_at, updatedAt: r.updated_at,
});
