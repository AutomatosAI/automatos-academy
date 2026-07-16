// Wire event shapes for the Spine's /api/sync/* endpoints (PRD-U2 S1) — a
// field-for-field port of the mobile client's src/sync/events.ts, because the
// SERVER IS THE SAME ONE (server/spine/validate.js): lowercase uuid-v4
// `eventId` idempotency keys, epoch-ms timestamps, and `correct_count` in
// snake_case — that is the exact field validateProgressEvent reads; do not
// "fix" it client-side. Everything else is camelCase.
//
// Builders validate against the same bounds the server enforces (ease 1–4,
// seen ≥ 1, correct_count ≤ seen, ≤ 48 h future skew) so a well-behaved write
// path never enqueues an event the server would quarantine — and the backfill
// synthesizer can skip junk records honestly instead of poisoning a batch.
// Pure module: no DOM, no localStorage — node-importable for tests.

/** server hard cap per POST (server/spine/validate.js MAX_BATCH) */
export const MAX_BATCH = 500;
/** FR-2 skew guard: the server rejects timestamps > 48 h in the future */
export const MAX_FUTURE_SKEW_MS = 48 * 3_600_000;

/** flush order mirrors the mobile write path: progress first (drives mastery) */
export const KIND_ORDER = ["progress", "telemetry", "mock", "scenario"];

/** uuid v4 for idempotency keys. crypto.randomUUID where the runtime provides
 *  it (every browser this SPA targets, node ≥ 20); Math.random fallback —
 *  fine here, these are dedupe keys, not secrets. Same as the mobile port. */
export function generateEventId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && cryptoObj.randomUUID) return cryptoObj.randomUUID().toLowerCase();
  let out = "";
  for (const ch of "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx") {
    if (ch === "x" || ch === "y") {
      const r = Math.floor(Math.random() * 16);
      out += (ch === "x" ? r : (r % 4) + 8).toString(16);
    } else {
      out += ch;
    }
  }
  return out;
}

const isId = (v) => typeof v === "string" && v.length > 0 && v.length <= 200;
const isMs = (v) => typeof v === "number" && Number.isFinite(v);
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/**
 * SM-2 answer event → POST /api/sync/progress. `state` is the POST-answer
 * store record (store.js q{} entry): { seen, correct, ease, interval, due, at }.
 * Returns { event } or { error } — never throws.
 */
export function buildProgressEvent({ vendorId, trackId, itemId, correct, state, eventId, nowMs }) {
  const now = isMs(nowMs) ? nowMs : Date.now();
  if (!isId(vendorId) || !isId(trackId) || !isId(itemId)) return { error: "bad_content_ref" };
  if (typeof correct !== "boolean") return { error: "correct_not_boolean" };
  if (!state || typeof state !== "object") return { error: "no_state" };
  const answeredAt = state.at;
  if (!isMs(answeredAt)) return { error: "answeredAt_unparseable" };
  if (answeredAt > now + MAX_FUTURE_SKEW_MS) return { error: "answeredAt_too_far_future" };
  if (!isMs(state.due)) return { error: "dueAt_unparseable" };
  if (!isInt(state.seen, 1, 1_000_000)) return { error: "seen_out_of_range" };
  if (!isInt(state.correct, 0, state.seen)) return { error: "correct_count_out_of_range" };
  if (typeof state.ease !== "number" || !(state.ease >= 1 && state.ease <= 4)) return { error: "ease_out_of_range" };
  if (!isInt(state.interval, 0, 36_500)) return { error: "interval_out_of_range" };
  return {
    event: {
      eventId: eventId || generateEventId(),
      vendorId, trackId, itemId,
      correct,
      answeredAt,          // device wall-clock ms — the cross-device tiebreak
      dueAt: state.due,
      seen: state.seen,
      correct_count: state.correct,   // snake_case ON PURPOSE — wire contract
      ease: state.ease,
      interval: state.interval,
    },
  };
}

/** whole-exam attempt → POST /api/sync/mocks (append-only, dedupes on eventId) */
export function buildMockEvent({ vendorId, trackId, scaled, passed, at, eventId, nowMs }) {
  const now = isMs(nowMs) ? nowMs : Date.now();
  if (!isId(vendorId) || !isId(trackId)) return { error: "bad_content_ref" };
  if (!isInt(scaled, 0, 10_000)) return { error: "scaled_out_of_range" };
  if (typeof passed !== "boolean") return { error: "passed_not_boolean" };
  if (!isMs(at)) return { error: "at_unparseable" };
  if (at > now + MAX_FUTURE_SKEW_MS) return { error: "at_too_far_future" };
  return { event: { eventId: eventId || generateEventId(), vendorId, trackId, scaled, passed, at } };
}

/** scenario branch state → POST /api/sync/scenarios (later wall-clock wins) */
export function buildScenarioEvent({ vendorId, trackId, scenarioId, step, scorePct, at, eventId, nowMs }) {
  const now = isMs(nowMs) ? nowMs : Date.now();
  if (!isId(vendorId) || !isId(trackId) || !isId(scenarioId)) return { error: "bad_content_ref" };
  if (!isInt(step, 0, 10_000)) return { error: "step_out_of_range" };
  if (typeof scorePct !== "number" || !(scorePct >= 0 && scorePct <= 100)) return { error: "scorePct_out_of_range" };
  if (!isMs(at)) return { error: "at_unparseable" };
  if (at > now + MAX_FUTURE_SKEW_MS) return { error: "at_too_far_future" };
  return { event: { eventId: eventId || generateEventId(), vendorId, trackId, scenarioId, step, scorePct, at } };
}

/**
 * Telemetry event → POST /api/sync/telemetry (append-only). The web SPA has
 * no telemetry emitters yet; the builder exists so the queue/flush handle the
 * full mobile kind set. Payload keys must sit in the server's per-type schema
 * (validate.js PAYLOAD_KEYS) — an off-schema event is quarantined, not lost.
 */
export function buildTelemetryEvent({ eventType, vendorId, trackId, itemId, payload, eventId }) {
  if (!isId(eventType)) return { error: "unknown_event_type" };
  return {
    event: {
      eventId: eventId || generateEventId(),
      eventType,
      ...(vendorId !== undefined && vendorId !== null ? { vendorId } : {}),
      ...(trackId !== undefined && trackId !== null ? { trackId } : {}),
      ...(itemId !== undefined && itemId !== null ? { itemId } : {}),
      ...(payload !== undefined ? { payload } : {}),
    },
  };
}
