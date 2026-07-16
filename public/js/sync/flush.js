// Flush (PRD-U2 S1) — drain the durable queue to the Spine's four sync
// endpoints, porting the mobile client's src/sync/flush.ts invariants:
//   • kind-ordered drain: progress → telemetry → mock → scenario (progress
//     first — it drives the server-side mastery re-roll);
//   • batches of ≤ 500 (the server's MAX_BATCH — never exceed);
//   • events are removed ONLY after the server acks a batch, so a crash or
//     tab-close mid-flush re-sends and the per-event uuid makes the replay a
//     server-side no-op ("retries never double-apply");
//   • a 400 `invalid_event:{index}:{reason}` quarantines EXACTLY the
//     offending event (batches are all-or-nothing with a pointer at the first
//     bad one, server/spine/validate.js) and re-sends the rest — bounded
//     rounds so a pathological batch can't hammer the server;
//   • 429 → the caller gets a rate-limited signal (syncer.js applies the
//     exponential backoff); transport/auth/server errors leave everything
//     queued for the next trigger.

import { all, remove, quarantine } from "./queue.js";
import { spineRequest } from "./client.js";
import { KIND_ORDER, MAX_BATCH } from "./events.js";

const ENDPOINT = {
  progress: "/api/sync/progress",
  telemetry: "/api/sync/telemetry",
  mock: "/api/sync/mocks",
  scenario: "/api/sync/scenarios",
};

const INVALID_EVENT_RE = /^invalid_event:(\d+):(.*)$/;
/** cap quarantine-and-retry rounds inside ONE flush (mobile constant) */
const QUARANTINE_ROUNDS_MAX = 25;

/**
 * One full drain attempt. Never throws.
 * @returns {Promise<{attempted: number, flushed: number,
 *   quarantined: {seq: number, reason: string}[],
 *   errorCode: string|null, rateLimited: boolean}>}
 */
export async function flushOnce(now = Date.now) {
  const waiting = all();
  const result = { attempted: waiting.length, flushed: 0, quarantined: [], errorCode: null, rateLimited: false };
  if (waiting.length === 0) return result;

  for (const kind of KIND_ORDER) {
    const pending = waiting.filter((e) => e.kind === kind);
    for (let offset = 0; offset < pending.length; offset += MAX_BATCH) {
      let batch = pending.slice(offset, offset + MAX_BATCH);
      let rounds = 0;
      while (batch.length > 0) {
        if (rounds++ >= QUARANTINE_ROUNDS_MAX) {
          console.warn("[sync/flush] quarantine rounds exhausted", kind, batch.length);
          result.errorCode = "quarantine_rounds_exhausted";
          return result;
        }
        const res = await spineRequest(ENDPOINT[kind], {
          method: "POST",
          body: { events: batch.map((e) => e.event) },
        });

        if (res.code === null) {
          remove(batch.map((e) => e.seq)); // post-ack only
          result.flushed += batch.length;
          batch = [];
          continue;
        }

        const invalid = res.status === 400 ? INVALID_EVENT_RE.exec(res.code) : null;
        if (invalid) {
          // park the offending event with the server's verbatim reason
          // (e.g. answeredAt_too_far_future) — never retry-loop it
          const bad = batch[Number(invalid[1])];
          if (!bad) { result.errorCode = "invalid_event_index_out_of_range"; return result; }
          quarantine(bad.seq, invalid[2], now());
          result.quarantined.push({ seq: bad.seq, reason: invalid[2] });
          batch = batch.filter((e) => e.seq !== bad.seq);
          continue;
        }

        if (res.status === 429) {
          result.errorCode = "rate_limited";
          result.rateLimited = true;
          return result; // everything left stays queued; syncer backs off
        }

        // transport / auth / server failure — everything left stays queued
        result.errorCode = res.code;
        return result;
      }
    }
  }
  return result;
}
