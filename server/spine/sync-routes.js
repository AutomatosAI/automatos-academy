// Sync API — raw events in (PRD-MT-02 US-023). Devices push raw
// progress/telemetry/mock/scenario events; they NEVER push computed mastery
// (02 §5). Batched, idempotent on retry, and conflict-resolved by device
// wall-clock (later answer wins, arrival order irrelevant).
//
// Envelope data on success: {received, applied, discarded|deduped, ...} —
// `applied` counts rows actually written; replays and conflict-losers land
// in the other bucket, so a client can see a retry was absorbed cleanly.
import express from "express";
import { ok, fail, wrap } from "./http.js";
import {
  validateBatch, validateProgressEvent, validateTelemetryEvent,
  validateMockEvent, validateScenarioEvent, collapseLatest,
} from "./validate.js";
import { rederiveRollups, scopeWeightResolver, masteryToWire } from "./rollups.js";
import { rederiveConceptStateSafely, conceptWeightResolver, conceptStateToWire } from "./concepts.js";

// Cross-batch/cross-device conflict rule lives in the WHERE: the stored row
// only yields to a strictly LATER device wall-clock answer (02 §5). A replay
// (equal answered_at) or a late-arriving older answer is discarded.
const PROGRESS_UPSERT_SQL = `
  INSERT INTO progress (user_id, vendor_id, track_id, item_id, seen, correct, ease, "interval", due_at, answered_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  ON CONFLICT ON CONSTRAINT progress_item_uniq
  DO UPDATE SET seen = EXCLUDED.seen, correct = EXCLUDED.correct, ease = EXCLUDED.ease,
                "interval" = EXCLUDED."interval", due_at = EXCLUDED.due_at, answered_at = EXCLUDED.answered_at
  WHERE progress.answered_at < EXCLUDED.answered_at
`;

const TELEMETRY_INSERT_SQL = `
  INSERT INTO telemetry (user_id, event_id, vendor_id, track_id, event_type, item_id, payload)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT ON CONSTRAINT telemetry_event_uniq DO NOTHING
`;

const MOCK_INSERT_SQL = `
  INSERT INTO mock_attempts (user_id, event_id, vendor_id, track_id, scaled, passed, "at")
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT ON CONSTRAINT mock_attempts_event_uniq DO NOTHING
`;

const SCENARIO_UPSERT_SQL = `
  INSERT INTO scenario_progress (user_id, vendor_id, track_id, scenario_id, step, score_pct, updated_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT ON CONSTRAINT scenario_progress_uniq
  DO UPDATE SET step = EXCLUDED.step, score_pct = EXCLUDED.score_pct, updated_at = EXCLUDED.updated_at
  WHERE scenario_progress.updated_at < EXCLUDED.updated_at
`;

const batchError = (b) => (b.index >= 0 ? `invalid_event:${b.index}:${b.error}` : b.error);

/** Run `fn(client)` inside one transaction; batches apply all-or-nothing. */
async function inTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch (_) { /* connection gone — release below */ }
    throw e;
  } finally {
    client.release();
  }
}

export function createSyncRouter({ pool, index, limiter }) {
  const router = express.Router();
  router.use(limiter);
  const scopeWeight = scopeWeightResolver(index);
  const conceptWeight = conceptWeightResolver(index);

  // ── POST /api/sync/progress — SM-2 answer events ────────────────────
  router.post("/progress", wrap(async (req, res) => {
    const nowMs = Date.now();
    const batch = validateBatch((req.body || {}).events, validateProgressEvent, nowMs);
    if (batch.error) return fail(res, 400, batchError(batch));

    // In-batch collapse first: one row per item, later answeredAt wins —
    // also required because a single INSERT..ON CONFLICT can't touch the
    // same row twice.
    const { winners } = collapseLatest(
      batch.values,
      (v) => `${v.vendorId}/${v.trackId}/${v.itemId}`,
      (v) => v.answeredAt,
    );

    const userId = req.spineUser.id;
    const { applied, mastery, concepts } = await inTransaction(pool, async (client) => {
      let appliedCount = 0;
      for (const v of winners) {
        const r = await client.query(PROGRESS_UPSERT_SQL, [
          userId, v.vendorId, v.trackId, v.itemId,
          v.seen, v.correctCount, v.ease, v.interval,
          new Date(v.dueAt), new Date(v.answeredAt),
        ]);
        appliedCount += r.rowCount;
      }
      const touched = winners.map((v) => `${v.vendorId}/${v.trackId}`);
      // US-024: re-derive mastery_map from the merged item states — the
      // roll-up is computed once, server-side, from the winning rows.
      const rolled = await rederiveRollups(client, index, userId, touched);
      // LA-2: the topic-level twin, same transaction, same authoritative rows.
      // Both derive from the merged state, so they can never disagree about
      // what the learner actually did — but they do NOT share a fate. The
      // rollup runs in a SAVEPOINT: it is derived data, recomputable on the
      // next sync, and must never cost a learner the answer it rode in with.
      const conceptRows = await rederiveConceptStateSafely(client, index, userId, touched, nowMs);
      return { applied: appliedCount, mastery: rolled, concepts: conceptRows };
    });

    return ok(res, {
      received: batch.values.length,
      applied,
      discarded: batch.values.length - applied,
      // 02 §5: "ack + updated mastery scope" — decay applied on read.
      mastery: mastery.map((row) => masteryToWire(row, scopeWeight, nowMs)),
      // LA-2 additive: the touched concept rows ride the same ack, so a client
      // can colour its feed immediately instead of waiting for the next pull.
      // Pre-LA-2 clients ignore an unknown envelope field.
      conceptState: concepts.map((row) => conceptStateToWire({
        ...row,
        nextDueAt: row.nextDueAtMs === null ? null : new Date(row.nextDueAtMs),
        lastSeenAt: row.lastSeenAtMs === null ? null : new Date(row.lastSeenAtMs),
      }, conceptWeight, nowMs)),
    });
  }));

  // ── POST /api/sync/telemetry — append-only, PII-minimized ───────────
  router.post("/telemetry", wrap(async (req, res) => {
    const batch = validateBatch((req.body || {}).events, validateTelemetryEvent, Date.now());
    if (batch.error) return fail(res, 400, batchError(batch));

    const userId = req.spineUser.id;
    const applied = await inTransaction(pool, async (client) => {
      let count = 0;
      for (const v of batch.values) {
        const r = await client.query(TELEMETRY_INSERT_SQL, [
          userId, v.eventId, v.vendorId, v.trackId, v.eventType, v.itemId, JSON.stringify(v.payload),
        ]);
        count += r.rowCount;
      }
      return count;
    });

    return ok(res, { received: batch.values.length, applied, deduped: batch.values.length - applied });
  }));

  // ── POST /api/sync/mocks — whole-exam attempts (append-only) ────────
  router.post("/mocks", wrap(async (req, res) => {
    const batch = validateBatch((req.body || {}).events, validateMockEvent, Date.now());
    if (batch.error) return fail(res, 400, batchError(batch));

    const userId = req.spineUser.id;
    const applied = await inTransaction(pool, async (client) => {
      let count = 0;
      for (const v of batch.values) {
        const r = await client.query(MOCK_INSERT_SQL, [
          userId, v.eventId, v.vendorId, v.trackId, v.scaled, v.passed, new Date(v.at),
        ]);
        count += r.rowCount;
      }
      return count;
    });

    return ok(res, { received: batch.values.length, applied, deduped: batch.values.length - applied });
  }));

  // ── POST /api/sync/scenarios — branch state, later wall-clock wins ──
  router.post("/scenarios", wrap(async (req, res) => {
    const batch = validateBatch((req.body || {}).events, validateScenarioEvent, Date.now());
    if (batch.error) return fail(res, 400, batchError(batch));

    const { winners } = collapseLatest(
      batch.values,
      (v) => `${v.vendorId}/${v.trackId}/${v.scenarioId}`,
      (v) => v.at,
    );

    const userId = req.spineUser.id;
    const applied = await inTransaction(pool, async (client) => {
      let count = 0;
      for (const v of winners) {
        const r = await client.query(SCENARIO_UPSERT_SQL, [
          userId, v.vendorId, v.trackId, v.scenarioId, v.step, v.scorePct, new Date(v.at),
        ]);
        count += r.rowCount;
      }
      return count;
    });

    return ok(res, { received: batch.values.length, applied, discarded: batch.values.length - applied });
  }));

  return router;
}
