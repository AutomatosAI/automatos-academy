// Local-first progress store. One namespace per (vendor, track). No backend
// required — everything lives in localStorage on the learner's device; the
// optional Spine sync (PRD-U1/U2) mirrors it server-side for signed-in
// learners without changing this store's contract.
// All updates are immutable (new state objects), per house style.

const VERSION = "v1";
const now = () => Date.now();
const DAY = 86400000;

const keyFor = (vendorId, trackId) => `automatos-academy:${VERSION}:${vendorId}/${trackId}`;

export class Store {
  constructor(vendorId, trackId) {
    this.key = keyFor(vendorId, trackId);
    this.s = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { lessons: {}, q: {}, exams: [], scenarios: {} };
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
    this.s = {
      ...this.s,
      q: { ...this.s.q, [id]: { seen, correct: corr, ease, interval, due, last: !!correct, domainId: domainId || prev.domainId, at: now() } },
    };
    this._save();
  }

  dueQuestions() {
    const t = now();
    return Object.entries(this.s.q).filter(([, v]) => v.due && v.due <= t).map(([id]) => id);
  }

  // ── exams ────────────────────────────────────────────────────────────
  pushExam(rec) {
    this.s = { ...this.s, exams: [...this.s.exams, { ...rec, at: now() }].slice(-25) };
    this._save();
  }
  bestMock() {
    return this.s.exams.reduce((b, e) => (e.scaled > (b ? b.scaled : -1) ? e : b), null);
  }
  bestPassedMock() {
    return this.s.exams.filter((e) => e.passed).reduce((b, e) => (e.scaled > (b ? b.scaled : -1) ? e : b), null);
  }

  // ── scenarios ────────────────────────────────────────────────────────
  pushScenario(id, scorePct) {
    this.s = { ...this.s, scenarios: { ...this.s.scenarios, [id]: { score: scorePct, at: now() } } };
    this._save();
  }
  scenarioScore(id) { return this.s.scenarios[id]; }

  reset() {
    this.s = { lessons: {}, q: {}, exams: [], scenarios: {} };
    this._save();
  }
}
