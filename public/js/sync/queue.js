// Durable outbound sync queue (PRD-U2 S1) — the web port of the mobile
// client's src/sync/queue.ts invariants, on localStorage instead of an async
// KV: append is IDEMPOTENT on the wire event's eventId (a retried write path
// can never double-queue), growth is BOUNDED (oldest waiting dropped past the
// hard cap, warned), events leave the queue ONLY after a server ack, and
// server-rejected events are QUARANTINED — parked and inspectable, never
// silently lost, never retry-looped.
//
// Storage: ONE key per namespace (waiting + quarantine), each holding a JSON
// doc — localStorage.setItem is a single atomic write, so the mobile port's
// key-per-event crash-safety dance isn't needed here. Every operation is
// read-modify-write against storage (no long-lived in-memory index): tabs
// share localStorage, and re-reading per op keeps two tabs from clobbering
// each other's view. A cross-tab race can still last-writer-lose a removal or
// re-add a flushed event — harmless by design, the server dedupes on eventId.
//
// clearAll() is THE wipe seam (mobile delta review D-H1): every path that
// erases account data must clear the queue through it, or the next flush
// re-uploads "deleted" events to the server that just confirmed the deletion.

const QUEUE_KEY = "automatos-academy:v1:sync-queue";
const QUARANTINE_KEY = "automatos-academy:v1:sync-quarantine";

/** hard ceiling on waiting events — beyond it the OLDEST is dropped, warned */
export const QUEUE_HARD_MAX = 2000;
/** soft nudge threshold: this deep (or 7 days stale) = "sync needed" */
const BACKPRESSURE_MAX = 1000;
const BACKPRESSURE_MAX_AGE_MS = 7 * 86_400_000;
/** parked server-rejects stay inspectable but bounded */
const QUARANTINE_MAX = 500;

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const doc = JSON.parse(raw);
    if (!doc || typeof doc !== "object" || !Array.isArray(doc.events)) return fallback;
    return doc;
  } catch (_) {
    // corrupt or storage unavailable — a wedged queue must never break the
    // learner's session; sync degrades, the local store stays the truth
    return fallback;
  }
};
const write = (key, doc) => {
  try { localStorage.setItem(key, JSON.stringify(doc)); return true; }
  catch (e) { console.warn("[sync/queue] persist failed:", (e && e.message) || e); return false; }
};

const loadQueue = () => {
  const doc = read(QUEUE_KEY, { v: 1, nextSeq: 1, events: [] });
  if (!Number.isInteger(doc.nextSeq)) {
    // partial/foreign doc (e.g. an edited backup restored over the key):
    // re-derive the allocator past every seq ever seen so nothing collides
    doc.nextSeq = doc.events.reduce((m, e) => Math.max(m, (e && e.seq) || 0), 0) + 1;
  }
  return doc;
};
const loadQuarantine = () => read(QUARANTINE_KEY, { v: 1, events: [] });

/**
 * Durably append wire events; returns how many were newly queued. Idempotent
 * on eventId — re-appending a waiting eventId is a no-op, not a duplicate.
 * Batched (the backfill enqueues hundreds) so storage churn stays O(1) writes.
 * @param {ReadonlyArray<{kind: string, event: object}>} items
 */
export function append(items, enqueuedAt) {
  const at = typeof enqueuedAt === "number" ? enqueuedAt : Date.now();
  const doc = loadQueue();
  const waitingIds = new Set(doc.events.map((e) => e.event.eventId));
  let added = 0;
  for (const { kind, event } of items) {
    if (!event || !event.eventId || waitingIds.has(event.eventId)) continue;
    while (doc.events.length >= QUEUE_HARD_MAX) {
      const dropped = doc.events.shift(); // oldest-first eviction, warned
      waitingIds.delete(dropped.event.eventId);
      console.warn("[sync/queue] hard cap reached — dropped the oldest waiting event", dropped.seq);
    }
    doc.events.push({ seq: doc.nextSeq++, kind, enqueuedAt: at, event });
    waitingIds.add(event.eventId);
    added++;
  }
  if (added > 0) write(QUEUE_KEY, doc);
  return added;
}

/** every waiting envelope, in append (seq) order */
export function all() {
  return loadQueue().events.slice().sort((a, b) => a.seq - b.seq);
}

/** drop flushed events — POST-ACK ONLY; the ack is what makes this safe */
export function remove(seqs) {
  const drop = new Set(seqs);
  const doc = loadQueue();
  const kept = doc.events.filter((e) => !drop.has(e.seq));
  if (kept.length !== doc.events.length) write(QUEUE_KEY, { ...doc, events: kept });
}

/** park a server-rejected event out of the flush path, keeping the data +
 *  the server's verbatim reason (honest, inspectable) */
export function quarantine(seq, reason, now) {
  const doc = loadQueue();
  const envelope = doc.events.find((e) => e.seq === seq);
  if (!envelope) return; // already gone — nothing to park
  const park = loadQuarantine();
  park.events.push({ ...envelope, reason, quarantinedAt: typeof now === "number" ? now : Date.now() });
  while (park.events.length > QUARANTINE_MAX) park.events.shift(); // bounded, oldest dropped
  // write the copy BEFORE deleting the original — a failure between the two
  // duplicates (harmless, idempotent eventIds) rather than loses the event
  write(QUARANTINE_KEY, park);
  write(QUEUE_KEY, { ...doc, events: doc.events.filter((e) => e.seq !== seq) });
}

/** parked events, in seq order */
export function quarantined() {
  return loadQuarantine().events.slice().sort((a, b) => a.seq - b.seq);
}

export function stats(now) {
  const t = typeof now === "number" ? now : Date.now();
  const doc = loadQueue();
  let oldestEnqueuedAt = null;
  for (const e of doc.events) {
    if (oldestEnqueuedAt === null || e.enqueuedAt < oldestEnqueuedAt) oldestEnqueuedAt = e.enqueuedAt;
  }
  return {
    count: doc.events.length,
    oldestEnqueuedAt,
    quarantinedCount: loadQuarantine().events.length,
    backpressure: doc.events.length > BACKPRESSURE_MAX ||
      (oldestEnqueuedAt !== null && t - oldestEnqueuedAt > BACKPRESSURE_MAX_AGE_MS),
  };
}

/**
 * Wipe the WHOLE queue — waiting AND quarantined (mobile D-H1). Every data
 * wipe (delete-my-data, delete-my-account) MUST come through this seam so no
 * pre-deletion event survives to re-upload. Afterwards the queue is
 * indistinguishable from a fresh browser (seq restarts, the dedupe forgets —
 * safe, because nothing is left to overwrite).
 */
export function clearAll() {
  try { localStorage.removeItem(QUEUE_KEY); } catch (_) {}
  try { localStorage.removeItem(QUARANTINE_KEY); } catch (_) {}
}
