// Consented learner context — browser half (PRD-TUTOR-LIVE §4.4 / S3).
// Owns the D-T1(c) ask-once consent card + the persistent header toggle,
// the eligibility gate, the track pick, and the wire attach; the pure math
// (schema, 1 KB cap, cadence) lives in tutor-context-core.js.
//
// The gates, in order — each one failing means ZERO context bytes leave the
// device (devtools-verifiable, DoD):
//   1. offered — signed in AND synced learner state exists (a started track
//      in the local store, which for signed-in learners IS the reconciled
//      sync mirror). Signed out, everything here is inert: no card, no
//      toggle, no catalog fetch — byte-identical to a pre-S3 deploy.
//   2. consent — the ask-once card (D-T1c: an explicit choice, no silent
//      default) or the header toggle said yes, persisted in localStorage.
//      Honoured on EVERY send path, deep-link askTutor() included, because
//      the one attach point is tutor.js's shared stream().
//   3. cadence — D-T3(b): once per conversation, refreshed on material
//      change or staleness (core's shouldSend).
import { el } from "./ui.js";
import { loadCatalog, loadTrack } from "./content.js";
import { Store } from "./store.js";
import { isConfigured, onAuthChange, user } from "./auth.js";
import { syncStatus } from "./sync/syncer.js";
import { contextFor, encodeContext, preambleFor, sentMark, shouldSend } from "./tutor-context-core.js";

const CONSENT_KEY = "automatos-academy:v1:tutor-context-consent";
const EVT = "academy:tutor-context"; // consent or offer changed → resync UI
const BUILD_TIMEOUT_MS = 1500; // a slow catalog must never stall a send

const signedIn = () => isConfigured() && !!user();

let offered = false; // cached eligibility — refreshOffer() recomputes
let lastSent = null; // cadence mark; one page load = one conversation
let watching = false;

// ── consent state (persisted; null = never asked — the card shows) ───────
export function consentState() {
  try {
    const d = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
    return d && (d.choice === "granted" || d.choice === "declined") ? d.choice : null;
  } catch (_) {
    return null;
  }
}

export function setConsent(granted) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: granted ? "granted" : "declined", at: Date.now() }));
  } catch (_) { /* storage unavailable — behaves as "never asked" next open */ }
  // D-T4: consent flips are counted (a boolean only — never the numbers)
  import("./analytics.js").then((a) => a.track("tutor_consent", { granted: !!granted })).catch(() => {});
  fire();
}

// ── change fan-out (strips + lists resync; listeners self-detach) ────────
function fire() {
  try { window.dispatchEvent(new CustomEvent(EVT)); } catch (_) {}
}

/** Run fn on every consent/offer change for as long as anchor stays in the
 *  DOM — page-view listeners self-remove after their surface unmounts. */
export function onContextChange(anchor, fn) {
  let seen = false;
  const h = () => {
    if (anchor.isConnected) seen = true;
    else if (seen) { window.removeEventListener(EVT, h); return; }
    fn();
  };
  window.addEventListener(EVT, h);
}

// ── eligibility (gate 1) ──────────────────────────────────────────────────
// mirrors views/continue.js — one localStorage read per catalog track,
// no track-tree fetches
function lastActiveAt(s) {
  let t = 0;
  for (const at of Object.values(s.lessons || {})) t = Math.max(t, at || 0);
  for (const r of Object.values(s.q || {})) t = Math.max(t, (r && r.at) || 0);
  for (const e of s.exams || []) t = Math.max(t, (e && e.at) || 0);
  for (const r of Object.values(s.scenarios || {})) t = Math.max(t, (r && r.at) || 0);
  return t;
}

/** Cached, synchronous: is the context feature offered to this learner? */
export function contextOffered() {
  return offered;
}

/** Recompute the offer: signed in AND at least one started track. Cheap
 *  (cached catalog + localStorage), async, never throws. Fires the resync
 *  event on change. Call on mount, panel open, and page-view mount. */
export async function refreshOffer() {
  ensureWatch();
  let next = false;
  if (signedIn()) {
    try {
      const cat = await loadCatalog();
      outer: for (const v of cat.vendors || []) {
        for (const t of v.tracks || []) {
          if (lastActiveAt(new Store(v.id, t.trackId).s) > 0) { next = true; break outer; }
        }
      }
    } catch (_) {
      next = false; // catalog unreachable — don't offer what we can't build
    }
  }
  if (next !== offered) { offered = next; fire(); }
  return offered;
}

function ensureWatch() {
  if (watching) return;
  watching = true;
  onAuthChange(() => { refreshOffer(); }); // sign-in offers, sign-out retracts
}

// ── track pick: current route's live track, else most-recently-studied ───
// two-line hash parse mirrors tutor.js routeTrackRef — cheaper than an
// import cycle between tutor.js and this module
function routeTrackRef() {
  const m = (location.hash || "").match(/^#\/t\/([^/]+)\/([^/]+)/);
  return m ? { vendorId: decodeURIComponent(m[1]), trackId: decodeURIComponent(m[2]) } : null;
}

function pickTrackRef(cat) {
  const ref = routeTrackRef();
  if (ref) {
    const v = (cat.vendors || []).find((x) => x.id === ref.vendorId);
    if (v && (v.tracks || []).some((x) => x.trackId === ref.trackId && x.status === "live")) return ref;
  }
  // off-track pages: the most-recently-studied track (PRD §4.4 — one track
  // per message; the tutor tutors the course you're in, it doesn't audit
  // your life)
  let best = null, bestAt = 0;
  for (const v of cat.vendors || []) {
    for (const t of v.tracks || []) {
      const at = lastActiveAt(new Store(v.id, t.trackId).s);
      if (at > bestAt) { bestAt = at; best = { vendorId: v.id, trackId: t.trackId }; }
    }
  }
  return best;
}

// ── the attach point (called by tutor.js stream() for every send) ────────
/**
 * Decide what this send carries. Resolves (never rejects, never hangs) to
 *   { wire, ctx, accepted } where
 *   • wire — the network message: preamble + text, or the text untouched;
 *   • ctx  — tutor_message telemetry: "sent" | "held" | "off", or null when
 *     the feature isn't offered (so signed-out analytics stay byte-identical);
 *   • accepted — call once the platform accepts the request (res.ok): marks
 *     the cadence THEN, so a refused/unreachable send retries WITH context
 *     rather than silently without.
 */
export async function attachContext(message) {
  if (!offered || consentState() !== "granted") {
    return { wire: message, ctx: offered ? "off" : null, accepted: null };
  }
  let built = null;
  try {
    built = await Promise.race([
      buildPreamble(message),
      new Promise((r) => setTimeout(() => r(undefined), BUILD_TIMEOUT_MS)),
    ]);
  } catch (_) {
    built = null; // any build failure → send the plain message, never block
  }
  return built || { wire: message, ctx: "held", accepted: null };
}

async function buildPreamble(message) {
  const cat = await loadCatalog();
  const ref = pickTrackRef(cat);
  if (!ref) return null;
  const track = await loadTrack(ref.vendorId, ref.trackId);
  const store = new Store(ref.vendorId, ref.trackId);
  const prof = syncStatus().profile;
  const ctx = contextFor(track, store, { streak: prof && prof.streak });
  if (!shouldSend(lastSent, ctx, Date.now())) return { wire: message, ctx: "held", accepted: null };
  const json = encodeContext(ctx);
  if (!json) return null; // over the 1 KB cap even after shedding — send nothing
  return {
    wire: preambleFor(json, message),
    ctx: "sent",
    accepted: () => { lastSent = sentMark(ctx, Date.now()); },
  };
}

// ── consent UI ────────────────────────────────────────────────────────────
/** The persistent toggle (PRD: "a visible toggle in the panel header area").
 *  Self-hides until the feature is offered; self-syncs on every change. */
export function consentStrip() {
  const input = el("input", { type: "checkbox", class: "tut-consent-check", "aria-label": "Let the tutor see my progress" });
  const wrap = el("label", { class: "tut-consent", hidden: true }, [
    input,
    el("span", { text: "Let the tutor see my progress" }),
  ]);
  const sync = () => {
    if (!offered) { wrap.setAttribute("hidden", ""); return; }
    wrap.removeAttribute("hidden");
    input.checked = consentState() === "granted";
  };
  input.addEventListener("change", () => setConsent(input.checked));
  onContextChange(wrap, sync);
  sync();
  return wrap;
}

/** D-T1(c) ask-once explainer — renders only while the choice is unmade
 *  (and the feature is offered), listing exactly what would be shared.
 *  "Not now" is the dismissal: persisted, so it never re-asks. */
export function consentCard() {
  if (!offered || consentState() !== null) return null;
  return el("div", { class: "tut-consent-card" }, [
    el("p", { class: "tut-consent-title", text: "Let the tutor see my progress?" }),
    el("p", { text: "Say yes and the tutor opens already knowing where you are — and coaches from it. It sees numbers and track/domain ids only, never your name or email:" }),
    el("ul", { class: "tut-consent-fields" }, [
      el("li", { text: "reviews due now" }),
      el("li", { text: "readiness % and grade" }),
      el("li", { text: "weakest domains" }),
      el("li", { text: "mock exams — count and best score" }),
      el("li", { text: "study streak" }),
      el("li", { text: "exam date, once you set one" }),
    ]),
    el("div", { class: "tut-consent-actions" }, [
      el("button", { class: "tut-retry", type: "button", text: "Share my progress", onclick: () => setConsent(true) }),
      el("button", { class: "tut-consent-later", type: "button", text: "Not now", onclick: () => setConsent(false) }),
    ]),
    el("p", { class: "tut-consent-note", text: "Asked once, never assumed — the toggle beside the tutor changes it any time." }),
  ]);
}
