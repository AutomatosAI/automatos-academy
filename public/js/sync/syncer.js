// The syncer (PRD-U2 S1) — composition root of the web sync client, porting
// the mobile client's src/sync/syncer.ts semantics:
//   • ONE pipeline: FLUSH → RECONCILE, in that order, always — reconcile only
//     runs after a clean push, so the server pull can never clobber unpushed
//     local answers;
//   • single-flight: overlapping triggers collapse into the run in progress;
//   • triggers: an answer/exam/scenario write (debounced), tab
//     visibilitychange + browser `online`, sign-in, and a modest interval;
//   • 429 → exponential backoff persisted in meta (30 s doubling to 15 min);
//   • multi-tab: a localStorage lock keeps two tabs from double-flushing —
//     and when they race anyway, eventId idempotence makes it harmless
//     server-side (the worst case is a duplicate send the server dedupes).
//
// Every new path here gates on isConfigured() && user(): signed-out (or an
// unconfigured deploy) the module registers an inert emitter and does nothing
// — no queue writes, no network, no storage keys. Byte-identical to pre-U2.

import { isConfigured, onAuthChange, user } from "../auth.js";
import { buildMockEvent, buildProgressEvent, buildScenarioEvent } from "./events.js";
import { flushOnce } from "./flush.js";
import { loadMeta, saveMeta } from "./meta.js";
import { append, stats } from "./queue.js";
import { reconcileOnce } from "./reconcile.js";
import { setSyncEmitter } from "../store.js";
import { maybeOfferBackfill } from "./backfill.js";

const WRITE_DEBOUNCE_MS = 4_000;
const INTERVAL_MS = 90_000;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 15 * 60_000;
const LOCK_KEY = "automatos-academy:v1:sync-lock";
const LOCK_TTL_MS = 120_000;

const TAB_ID = Math.random().toString(36).slice(2);
let started = false;
let flushing = false;
let debounceTimer = null;

const signedIn = () => isConfigured() && !!user();

// ── multi-tab flush lock (best-effort; races are harmless by design) ────
function acquireLock(now) {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      if (lock && lock.id !== TAB_ID && now - (lock.at || 0) < LOCK_TTL_MS) return false;
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify({ id: TAB_ID, at: now }));
    return true;
  } catch (_) {
    return true; // storage trouble — sync anyway, the server dedupes
  }
}
function releaseLock() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw && JSON.parse(raw).id === TAB_ID) localStorage.removeItem(LOCK_KEY);
  } catch (_) {}
}

/**
 * Flush → reconcile once. Never throws; failures land in the persisted meta
 * (lastErrorCode) so the profile can render an honest sync status.
 */
export async function syncNow(trigger) {
  if (!signedIn()) return;
  if (flushing) return; // single-flight
  const now = Date.now();
  const meta = loadMeta();
  if (meta.backoffUntil && now < meta.backoffUntil && trigger !== "manual") return;
  if (!acquireLock(now)) return; // another tab is on it
  flushing = true;
  try {
    const flush = await flushOnce();
    if (flush.rateLimited) {
      const strikes = (loadMeta().rateLimitStrikes || 0) + 1;
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** (strikes - 1), BACKOFF_MAX_MS);
      saveMeta({ lastErrorCode: "rate_limited", rateLimitStrikes: strikes, backoffUntil: Date.now() + delay });
      return;
    }
    if (flush.errorCode) {
      saveMeta({ lastErrorCode: flush.errorCode });
      return;
    }
    // clean push (quarantines are parked, not blockers) → authoritative pull
    const rec = await reconcileOnce(loadMeta().sinceCursor);
    if (rec === null) {
      saveMeta({ lastErrorCode: "reconcile_failed" });
      return;
    }
    saveMeta({
      sinceCursor: rec.serverTime,
      lastSyncedAt: Date.now(),
      lastErrorCode: flush.quarantined.length > 0 ? "events_rejected" : null,
      rateLimitStrikes: 0,
      backoffUntil: null,
      ...(rec.streak || rec.user
        ? { profile: { streak: rec.streak, user: rec.user, fetchedAt: Date.now() } }
        : {}),
    });
  } finally {
    releaseLock();
    flushing = false;
  }
}

function scheduleWriteSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { debounceTimer = null; syncNow("write"); }, WRITE_DEBOUNCE_MS);
}

// ── the store emitter: local write → wire event → durable queue ─────────
// Mirrors mobile outcomes.ts: ONE write path enqueues everything; inert when
// signed out, so the store behaves exactly as before U2.
function onStoreWrite(w) {
  if (!signedIn()) return;
  let built = null;
  if (w.type === "answer") {
    built = buildProgressEvent({ vendorId: w.vendorId, trackId: w.trackId, itemId: w.itemId, correct: w.correct, state: w.state });
  } else if (w.type === "mock") {
    built = buildMockEvent({ vendorId: w.vendorId, trackId: w.trackId, scaled: w.scaled, passed: w.passed, at: w.at });
  } else if (w.type === "scenario") {
    built = buildScenarioEvent({ vendorId: w.vendorId, trackId: w.trackId, scenarioId: w.scenarioId, step: w.step, scorePct: w.scorePct, at: w.at });
  }
  if (!built) return;
  if (built.error) { console.warn("[sync] write not queueable:", built.error); return; }
  append([{ kind: w.type === "answer" ? "progress" : w.type, event: built.event }]);
  scheduleWriteSync();
}

/** Sync health for the profile's "Your data" section. */
export function syncStatus() {
  const meta = loadMeta();
  return {
    configured: isConfigured(),
    signedIn: signedIn(),
    queue: stats(Date.now()),
    lastSyncedAt: meta.lastSyncedAt,
    lastErrorCode: meta.lastErrorCode,
    profile: meta.profile,
  };
}

/**
 * Wire the whole client up (called once from app.js). No-op on unconfigured
 * deploys — zero listeners, zero storage, today's SPA untouched.
 */
export function initSync() {
  if (started || !isConfigured()) return;
  started = true;

  setSyncEmitter(onStoreWrite);

  // Sign-in (and every signed-in boot): sync, then offer the one-time
  // backfill (S2) — consent-first, never before a user exists to consent.
  let wasSignedIn = false;
  onAuthChange((u) => {
    const is = !!u;
    if (is && !wasSignedIn) {
      wasSignedIn = true;
      syncNow("sign-in");
      maybeOfferBackfill();
    } else if (!is) {
      wasSignedIn = false;
    }
  });

  document.addEventListener("visibilitychange", () => syncNow("visibility"));
  window.addEventListener("online", () => syncNow("online"));
  setInterval(() => syncNow("interval"), INTERVAL_MS);
}
