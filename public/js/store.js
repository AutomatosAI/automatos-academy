// Local-first progress store. One namespace per (vendor, track). No backend
// required — everything lives in localStorage on the learner's device; the
// optional Spine sync (PRD-U1/U2) mirrors it server-side for signed-in
// learners without changing this store's contract.
// All updates are immutable (new state objects), per house style.
//
// PRD-U2 S1 — the sync seam: recordAnswer/pushExam/pushScenario ALSO hand the
// write to one registered emitter (sync/syncer.js), the web twin of the mobile
// client's single-write-path outcomes.ts. The emitter is null by default and
// the sync layer gates it on a signed-in user, so signed-out behaviour is
// byte-identical to today. Emitters may never break a learner's answer:
// every call is fire-and-forget behind a try/catch.
//
// loadRawState/saveRawState expose the SAME localStorage records to
// sync/reconcile.js — the local store IS the sync mirror; reconcile writes
// through this seam (not through the methods below) precisely so server rows
// never re-enter the emitter and echo back to the server.

const VERSION = "v1";
const now = () => Date.now();
const DAY = 86400000;

const keyFor = (vendorId, trackId) => `automatos-academy:${VERSION}:${vendorId}/${trackId}`;

const EMPTY = () => ({ lessons: {}, q: {}, exams: [], scenarios: {} });

// ── sync seam (PRD-U2) ─────────────────────────────────────────────────
let syncEmitter = null;

/** Register the one write-path emitter (or null to detach). Receives
 *  { type: "answer"|"mock"|"scenario", vendorId, trackId, ... } after the
 *  local write has been persisted. */
export function setSyncEmitter(fn) {
  syncEmitter = typeof fn === "function" ? fn : null;
}

function emit(payload) {
  if (!syncEmitter) return;
  try { syncEmitter(payload); } catch (e) { console.warn("[store] sync emitter failed:", (e && e.message) || e); }
}

/** Raw state for one track — for sync/reconcile.js and the profile view. */
export function loadRawState(vendorId, trackId) {
  try {
    const raw = localStorage.getItem(keyFor(vendorId, trackId));
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === "object") return { ...EMPTY(), ...s };
    }
  } catch (_) {}
  return EMPTY();
}

/** Overwrite one track's raw state (reconcile's apply path). */
export function saveRawState(vendorId, trackId, state) {
  try { localStorage.setItem(keyFor(vendorId, trackId), JSON.stringify(state)); } catch (_) {}
}

export class Store {
  constructor(vendorId, trackId) {
    this.vendorId = vendorId;
    this.trackId = trackId;
    this.key = keyFor(vendorId, trackId);
    this.s = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return EMPTY();
  }

  _save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.s)); } catch (_) {}
  }

  // ── lessons ──────────────────────────────────────────────────────────
  markLesson(id) {
    this.s = { ...this.s, lessons: { ...this.s.lessons, [id]: now() } };
    this._save();
  }
  lessonDone(id) { return !!this.s.lessons[id]; }

  // ── questions + spaced repetition (SM-2 flavoured) ───────────────────
  getQ(id) { return this.s.q[id]; }

  recordAnswer(id, correct, domainId) {
    const prev = this.s.q[id] || { seen: 0, correct: 0, ease: 2.3, interval: 0, due: 0, domainId };
    const seen = prev.seen + 1;
    const corr = prev.correct + (correct ? 1 : 0);
    let ease = prev.ease, interval = prev.interval;
    if (correct) {
      ease = Math.min(2.8, ease + 0.06);
      interval = interval === 0 ? 1 : interval === 1 ? 3 : Math.round(interval * ease);
    } else {
      ease = Math.max(1.5, ease - 0.2);
      interval = 1;
    }
    const due = now() + interval * DAY;
    const state = { seen, correct: corr, ease, interval, due, last: !!correct, domainId: domainId || prev.domainId, at: now() };
    this.s = { ...this.s, q: { ...this.s.q, [id]: state } };
    this._save();
    emit({ type: "answer", vendorId: this.vendorId, trackId: this.trackId, itemId: id, correct: !!correct, state });
  }

  dueQuestions() {
    const t = now();
    return Object.entries(this.s.q).filter(([, v]) => v.due && v.due <= t).map(([id]) => id);
  }

  // ── exams ────────────────────────────────────────────────────────────
  pushExam(rec) {
    const stored = { ...rec, at: now() };
    this.s = { ...this.s, exams: [...this.s.exams, stored].slice(-25) };
    this._save();
    emit({ type: "mock", vendorId: this.vendorId, trackId: this.trackId, scaled: stored.scaled, passed: !!stored.passed, at: stored.at });
  }
  bestMock() {
    return this.s.exams.reduce((b, e) => (e.scaled > (b ? b.scaled : -1) ? e : b), null);
  }
  bestPassedMock() {
    return this.s.exams.filter((e) => e.passed).reduce((b, e) => (e.scaled > (b ? b.scaled : -1) ? e : b), null);
  }

  // ── scenarios ────────────────────────────────────────────────────────
  pushScenario(id, scorePct, step = 0) {
    const at = now();
    this.s = { ...this.s, scenarios: { ...this.s.scenarios, [id]: { score: scorePct, at } } };
    this._save();
    emit({ type: "scenario", vendorId: this.vendorId, trackId: this.trackId, scenarioId: id, step, scorePct, at });
  }
  scenarioScore(id) { return this.s.scenarios[id]; }

  reset() {
    this.s = EMPTY();
    this._save();
  }
}
