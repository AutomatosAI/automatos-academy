// Backfill offer (PRD-U2 S2, decision D-U5a: CONSENT-FIRST) — the one-time,
// per-browser prompt that brings a device's pre-account localStorage history
// into the signed-in account. Nothing is synthesized or sent until the
// learner says yes; declining is persisted and never auto-asks again (the
// offer stays reachable from the profile's "Sync this device").
//
// Idempotence: synthesized eventIds are minted once per record (stable key →
// uuid manifest) and the manifest is PERSISTED BEFORE anything is enqueued or
// sent — a retry, a crash mid-flush, or a restored backup re-offering the
// same records re-uses the SAME ids, so the server's eventId dedupe absorbs
// every replay (mock_attempts is append-only; a fresh uuid would duplicate
// history). The Spine's later-wall-clock-wins merge makes cross-device
// backfills safe by construction — original `at` timestamps ride the wire.
//
// Restore path: readiness.js calls noteRestore() after a successful
// progress-io import while signed in — the restored state gets a fresh offer
// and the reconcile cursor is reset so the next pull is a FULL state read
// (a restored backup may carry another browser's cursor-worth of history).

import { el } from "../ui.js";
import { isConfigured, user } from "../auth.js";
import { generateEventId } from "./events.js";
import { synthesizeTrackEvents } from "./synthesize.js";
import { append } from "./queue.js";
import { saveMeta } from "./meta.js";
import { loadRawState } from "../store.js";
import { syncNow } from "./syncer.js";

const CONSENT_KEY = "automatos-academy:v1:sync-backfill";
const MANIFEST_KEY = "automatos-academy:v1:sync-backfill-ids";
const REOFFER_KEY = "automatos-academy:v1:sync-reoffer";
const TRACK_KEY_RE = /^automatos-academy:v1:([^/:]+)\/(.+)$/;

const signedIn = () => isConfigured() && !!user();

const readJSON = (key) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
};
const writeJSON = (key, doc) => { try { localStorage.setItem(key, JSON.stringify(doc)); } catch (_) {} };

/** every (vendorId, trackId) with local progress on this browser */
function localTracks() {
  const tracks = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const m = TRACK_KEY_RE.exec(localStorage.key(i) || "");
      if (m) tracks.push({ vendorId: m[1], trackId: m[2] });
    }
  } catch (_) {}
  return tracks;
}

function hasLocalHistory() {
  return localTracks().some(({ vendorId, trackId }) => {
    const s = loadRawState(vendorId, trackId);
    return Object.keys(s.q).length > 0 || s.exams.length > 0 || Object.keys(s.scenarios).length > 0;
  });
}

/** Synthesize + enqueue everything on this browser. Returns counts. */
export function runBackfill() {
  const manifest = readJSON(MANIFEST_KEY) || {};
  let minted = false;
  const idFor = (key) => {
    if (!manifest[key]) { manifest[key] = generateEventId(); minted = true; }
    return manifest[key];
  };

  const batches = [];
  let skipped = 0;
  for (const { vendorId, trackId } of localTracks()) {
    const out = synthesizeTrackEvents(loadRawState(vendorId, trackId), vendorId, trackId, idFor);
    for (const e of out.progress) batches.push({ kind: "progress", event: e });
    for (const e of out.mocks) batches.push({ kind: "mock", event: e });
    for (const e of out.scenarios) batches.push({ kind: "scenario", event: e });
    skipped += out.skipped.length;
  }

  // ids are durable BEFORE anything can be sent — the idempotent-retry seam
  if (minted) writeJSON(MANIFEST_KEY, manifest);
  const queued = append(batches);

  writeJSON(CONSENT_KEY, { answer: "yes", at: Date.now() });
  try { localStorage.removeItem(REOFFER_KEY); } catch (_) {}
  syncNow("manual");
  return { events: batches.length, queued, skipped };
}

function declineBackfill() {
  writeJSON(CONSENT_KEY, { answer: "no", at: Date.now() });
  try { localStorage.removeItem(REOFFER_KEY); } catch (_) {}
}

// ── the in-page prompt (house panel — no modal library, no window.confirm) ─
let mounted = null;

function dismissPanel() {
  if (mounted) { mounted.remove(); mounted = null; }
}

function showOffer() {
  if (mounted) return;
  const yes = el("button", { class: "ac-btn ac-btn-solid", type: "button" }, ["Yes, sync it"]);
  const no = el("button", { class: "ac-btn", type: "button" }, ["No, keep it local"]);
  const panel = el("aside", { class: "sync-offer", role: "status", "aria-live": "polite" }, [
    el("span", { class: "mono-label", text: "Your account" }),
    el("h3", { text: "Bring this device's progress into your account?" }),
    el("p", { class: "muted", text: "Your answers, mock exams and scenario runs on this browser join your profile and follow you to other devices. Say no and everything stays local — you can sync later from your profile." }),
    el("div", { class: "row", style: { gap: "10px", marginTop: "14px", flexWrap: "wrap" } }, [yes, no]),
  ]);
  yes.addEventListener("click", () => {
    const r = runBackfill();
    dismissPanel();
    const note = el("aside", { class: "sync-offer", role: "status", "aria-live": "polite" }, [
      el("span", { class: "mono-label", text: "Your account" }),
      el("p", { text: `Syncing ${r.events} record${r.events === 1 ? "" : "s"} — they'll be on your profile in a moment.` }),
    ]);
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 6000);
  });
  no.addEventListener("click", () => { declineBackfill(); dismissPanel(); });
  mounted = panel;
  document.body.appendChild(panel);
}

/**
 * Offer if this browser has never answered (or a restore re-armed it) and
 * there is actually history to bring. `force` = the profile's "Sync this
 * device" — always re-offers for a signed-in learner.
 */
export function maybeOfferBackfill(force = false) {
  if (!signedIn()) return;
  if (!hasLocalHistory()) return; // nothing to bring — don't burn the ask
  const consent = readJSON(CONSENT_KEY);
  const reoffer = (() => { try { return !!localStorage.getItem(REOFFER_KEY); } catch (_) { return false; } })();
  if (!force && consent && consent.answer && !reoffer) return;
  showOffer();
}

/**
 * A file backup was just restored (progress-io) while signed in: re-arm the
 * offer for the restored state and force the next reconcile to pull FULL
 * state (the backup may have carried a foreign, too-new cursor).
 */
export function noteRestore() {
  if (!signedIn()) return;
  try { localStorage.setItem(REOFFER_KEY, "1"); } catch (_) {}
  saveMeta({ sinceCursor: null });
  maybeOfferBackfill();
}
