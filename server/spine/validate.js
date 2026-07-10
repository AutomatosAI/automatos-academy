// Sync-event validation (PRD-MT-02 US-023, FR-2) — every batch is validated
// at the boundary before anything touches the DB. Pure functions, so the
// conflict/skew rules are unit-testable without Postgres.
//
// Wire conventions: camelCase fields; timestamps are ISO-8601 strings or
// epoch milliseconds (store.js uses epoch ms today); every event carries an
// `eventId` uuid — the append-only tables dedupe on it, the upserted tables
// dedupe on their scope key + later-wall-clock-wins (02 §5).

export const MAX_BATCH = 500;
export const MAX_FUTURE_SKEW_MS = 48 * 3_600_000; // FR-2: reject > 48h future
const MAX_ID_LEN = 200;
const MAX_PAYLOAD_STRING = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// US-023 PII-minimization: telemetry payloads are flat objects whose keys
// must sit in the per-event-type schema below — free-text fields outside the
// schema are rejected, not stored. (`scenario` keys per 02 §3.)
const TELEMETRY_TYPES = ["answer", "card_outcome", "session", "scenario"];
const PAYLOAD_KEYS = {
  answer: ["itemId", "correct", "timeMs", "bucket", "surface"],
  card_outcome: ["itemId", "outcome", "timeMs", "surface"],
  session: ["surface", "durationMs", "itemCount", "startedAt", "endedAt"],
  scenario: ["scenario_id", "step", "scorePct"],
};

const isId = (v) => typeof v === "string" && v.length > 0 && v.length <= MAX_ID_LEN;
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/** ISO string or epoch-ms (number, or digit string à la query params) → ms,
 *  or null when unparseable. */
export function parseTimestamp(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v) {
    if (/^\d+$/.test(v)) return Number(v);
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

// Each validator returns { error } or { value } with a normalized event
// (timestamps as epoch ms). Batches are all-or-nothing: one bad event fails
// the whole POST with a pointer at it, so a retry is always a clean replay.

export function validateProgressEvent(e, nowMs) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return { error: "not_an_object" };
  if (!UUID_RE.test(e.eventId || "")) return { error: "eventId_not_uuid" };
  if (!isId(e.vendorId) || !isId(e.trackId) || !isId(e.itemId)) return { error: "bad_content_ref" };
  if (typeof e.correct !== "boolean") return { error: "correct_not_boolean" };
  const answeredAt = parseTimestamp(e.answeredAt);
  if (answeredAt === null) return { error: "answeredAt_unparseable" };
  if (answeredAt > nowMs + MAX_FUTURE_SKEW_MS) return { error: "answeredAt_too_far_future" };
  const dueAt = parseTimestamp(e.dueAt);
  if (dueAt === null) return { error: "dueAt_unparseable" };
  if (!isInt(e.seen, 1, 1_000_000)) return { error: "seen_out_of_range" };
  if (!isInt(e.correct_count, 0, e.seen)) return { error: "correct_count_out_of_range" };
  if (typeof e.ease !== "number" || !(e.ease >= 1 && e.ease <= 4)) return { error: "ease_out_of_range" };
  if (!isInt(e.interval, 0, 36_500)) return { error: "interval_out_of_range" };
  return {
    value: {
      eventId: e.eventId.toLowerCase(), vendorId: e.vendorId, trackId: e.trackId, itemId: e.itemId,
      correct: e.correct, answeredAt, dueAt, seen: e.seen, correctCount: e.correct_count,
      ease: e.ease, interval: e.interval,
    },
  };
}

export function validateTelemetryEvent(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return { error: "not_an_object" };
  if (!UUID_RE.test(e.eventId || "")) return { error: "eventId_not_uuid" };
  if (!TELEMETRY_TYPES.includes(e.eventType)) return { error: "unknown_event_type" };
  for (const [field, v] of [["vendorId", e.vendorId], ["trackId", e.trackId], ["itemId", e.itemId]]) {
    if (v !== undefined && v !== null && !isId(v)) return { error: `bad_${field}` };
  }
  const payload = e.payload === undefined ? {} : e.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { error: "payload_not_object" };
  const allowed = PAYLOAD_KEYS[e.eventType];
  for (const [k, v] of Object.entries(payload)) {
    if (!allowed.includes(k)) return { error: `payload_key_not_in_schema:${k}` };
    const t = typeof v;
    if (t === "string") { if (v.length > MAX_PAYLOAD_STRING) return { error: `payload_string_too_long:${k}` }; }
    else if (t !== "number" && t !== "boolean") return { error: `payload_value_not_scalar:${k}` };
  }
  return {
    value: {
      eventId: e.eventId.toLowerCase(), eventType: e.eventType,
      vendorId: e.vendorId ?? null, trackId: e.trackId ?? null, itemId: e.itemId ?? null,
      payload,
    },
  };
}

export function validateMockEvent(e, nowMs) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return { error: "not_an_object" };
  if (!UUID_RE.test(e.eventId || "")) return { error: "eventId_not_uuid" };
  if (!isId(e.vendorId) || !isId(e.trackId)) return { error: "bad_content_ref" };
  if (!isInt(e.scaled, 0, 10_000)) return { error: "scaled_out_of_range" };
  if (typeof e.passed !== "boolean") return { error: "passed_not_boolean" };
  const at = parseTimestamp(e.at);
  if (at === null) return { error: "at_unparseable" };
  if (at > nowMs + MAX_FUTURE_SKEW_MS) return { error: "at_too_far_future" };
  return { value: { eventId: e.eventId.toLowerCase(), vendorId: e.vendorId, trackId: e.trackId, scaled: e.scaled, passed: e.passed, at } };
}

export function validateScenarioEvent(e, nowMs) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return { error: "not_an_object" };
  if (!UUID_RE.test(e.eventId || "")) return { error: "eventId_not_uuid" };
  if (!isId(e.vendorId) || !isId(e.trackId) || !isId(e.scenarioId)) return { error: "bad_content_ref" };
  if (!isInt(e.step, 0, 10_000)) return { error: "step_out_of_range" };
  if (typeof e.scorePct !== "number" || !(e.scorePct >= 0 && e.scorePct <= 100)) return { error: "scorePct_out_of_range" };
  const at = parseTimestamp(e.at);
  if (at === null) return { error: "at_unparseable" };
  if (at > nowMs + MAX_FUTURE_SKEW_MS) return { error: "at_too_far_future" };
  return { value: { eventId: e.eventId.toLowerCase(), vendorId: e.vendorId, trackId: e.trackId, scenarioId: e.scenarioId, step: e.step, scorePct: e.scorePct, at } };
}

/**
 * Validate a whole batch with one of the validators above. Returns
 * { error, index } on the first bad event, else { values }.
 */
export function validateBatch(events, validator, nowMs) {
  if (!Array.isArray(events)) return { error: "events_not_array", index: -1 };
  if (events.length === 0) return { error: "events_empty", index: -1 };
  if (events.length > MAX_BATCH) return { error: "batch_too_large", index: -1 };
  const values = [];
  for (let i = 0; i < events.length; i++) {
    const r = validator(events[i], nowMs);
    if (r.error) return { error: r.error, index: i };
    values.push(r.value);
  }
  return { values };
}

/**
 * Collapse a batch to one event per key, keeping the LATEST wall-clock
 * timestamp (02 §5: the answer's device time wins, never arrival/array
 * order). Two answers for the same item inside one batch resolve here; the
 * SQL upsert's `WHERE stored < excluded` applies the same rule across
 * batches/devices. The earlier event is discarded, not merged — SM-2 state
 * is a state machine, not an accumulator.
 * @returns {{winners: Array, discarded: number}}
 */
export function collapseLatest(values, keyFn, timeFn) {
  const byKey = new Map();
  for (const v of values) {
    const k = keyFn(v);
    const prev = byKey.get(k);
    if (!prev || timeFn(v) > timeFn(prev)) byKey.set(k, v);
  }
  return { winners: [...byKey.values()], discarded: values.length - byKey.size };
}
