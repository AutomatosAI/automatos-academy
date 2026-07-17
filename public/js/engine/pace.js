// The pacing engine (PRD-WEB-LOOP §4.1) — exam date + due volume + recent
// rate → an honest daily verdict. A pure port of the mobile engine
// (automatos-academy-app src/engine/pace.ts, MT-12 §4.3): same constants,
// same median-over-active-days velocity, same coverage-shaped verdict. PURE:
// no storage, no DOM — callers (views/continue.js heroPace, views/readiness.js)
// do the IO, so the worked examples in tests/web-loop.test.mjs are the law.
//
// Honesty rules (binding, MT-12 §4.3 → WEB-LOOP §4.1):
//   • "on pace" is a COVERAGE claim — "at your recent rate you will have
//     seen everything in scope and cleared reviews before exam day" — never
//     a prediction of the exam result. No learning-curve model exists;
//     inventing one would be fake precision.
//   • the verdict always carries its inputs (days left, due + unseen, the
//     observed rate) so the readiness view can show the arithmetic (§7).
//   • no exam date ⇒ no verdict, no invented urgency; exam-past says so
//     plainly. observedPerDay derives from last-answer-per-item timestamps —
//     an UNDERCOUNT of true throughput, so the copy says "recent rate" and
//     the error is conservative (it never flatters).

export const DAY_MS = 86_400_000;
/** trailing velocity window (days), matching mobile PACE_WINDOW_DAYS */
export const PACE_WINDOW_DAYS = 14;
/** the last days before the exam are reserved for full mocks */
export const MOCK_RESERVE_DAYS = 3;
/** within 20% under required still reads "close", not "behind" */
export const PACE_CLOSE_UNDER_SHARE = 0.2;
/** MT-12's daily serve cap — "items today" never asks for more than this */
export const SERVE_CAP = 30;

/** median of a list; 0 for an empty one (cold start) */
function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Bucket answer timestamps into PACE_WINDOW_DAYS LOCAL days ENDING YESTERDAY
 * (oldest first, zeros for idle days). Today is deliberately excluded — a
 * half-finished day is not a rate (the mobile engine's rule, kept verbatim).
 */
export function itemsPerDay(atList, now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today0 = start.getTime();
  const counts = new Array(PACE_WINDOW_DAYS).fill(0);
  for (const at of atList || []) {
    if (typeof at !== "number" || !(at < today0)) continue;
    const back = Math.floor((today0 - at) / DAY_MS); // 0 = yesterday
    if (back < PACE_WINDOW_DAYS) counts[PACE_WINDOW_DAYS - 1 - back] += 1;
  }
  return counts;
}

/**
 * Observed velocity: median items over ACTIVE days × active-day rate — 30
 * items every second day is a 15/day rate, not a 30/day one. Cold start (no
 * active days) reads 0 — honest, and activeDays is exposed so surfaces can
 * say so.
 */
export function observedRate(window) {
  const active = (window || []).filter((n) => n > 0);
  if (!active.length || !window.length) return { observedPerDay: 0, activeDays: 0 };
  return { observedPerDay: median(active) * (active.length / window.length), activeDays: active.length };
}

/**
 * Pace inputs from one track tree + its RAW store state (store.js shape —
 * s.q keyed by item id). Unseen is TREE-GATED (only questions that exist in
 * the tree count), so a renamed bank can never go negative; dueNow counts
 * everything the review queue would actually serve (standalone questions AND
 * knowledge checks — they share one queue).
 */
export function paceInputs(track, s, now) {
  const q = (s && s.q) || {};
  let total = 0, answered = 0;
  for (const d of (track && track.domains) || []) {
    for (const item of d.questions || []) {
      total += 1;
      if (q[item.id]) answered += 1;
    }
  }
  let dueNow = 0;
  const ats = [];
  for (const r of Object.values(q)) {
    if (!r) continue;
    if (r.due && r.due <= now) dueNow += 1;
    if (r.at) ats.push(r.at);
  }
  const { observedPerDay, activeDays } = observedRate(itemsPerDay(ats, now));
  return {
    dueNow,
    unseenInScope: Math.max(0, total - answered),
    totalInScope: total,
    answeredInScope: answered,
    observedPerDay,
    activeDays,
  };
}

/**
 * The verdict (PRD §4.1 shape): pace(examDateMs, dueNow, unseenInScope,
 * observedPerDay, now) → { verdict, daysLeft, requiredPerDay, inputs }.
 * requiredPerDay = ceil((dueNow + unseenInScope) / max(1, daysLeft − 3)) —
 * the last MOCK_RESERVE_DAYS belong to full mocks. requiredPerDay 0 means
 * everything in scope is seen and nothing is owed: ready-early is on-pace by
 * construction, whatever the observed rate.
 */
export function pace(examDateMs, dueNow, unseenInScope, observedPerDay, now) {
  const inputs = { dueNow, unseenInScope, observedPerDay };
  if (examDateMs == null) {
    return { verdict: "no-date", daysLeft: null, requiredPerDay: null, inputs };
  }
  const daysLeft = Math.ceil((examDateMs - now) / DAY_MS);
  if (daysLeft <= 0) {
    return { verdict: "exam-past", daysLeft, requiredPerDay: null, inputs };
  }
  const studyDays = Math.max(1, daysLeft - MOCK_RESERVE_DAYS);
  const requiredPerDay = Math.ceil((dueNow + unseenInScope) / studyDays);
  const verdict =
    requiredPerDay === 0 || observedPerDay >= requiredPerDay
      ? "on-pace"
      : observedPerDay >= requiredPerDay * (1 - PACE_CLOSE_UNDER_SHARE)
        ? "close"
        : "behind";
  return { verdict, daysLeft, requiredPerDay, inputs };
}

/**
 * The line's two clauses (PRD §4.1 exact copy — DoD S2 tests these strings).
 * Returns { count, verdict } — views join with " · ". dateLabel arrives
 * preformatted ("Sep 12") so the copy stays locale-free and testable. A
 * behind/close verdict names its ask (clamped presentation only — there is
 * no quota engine on web); exam-past says so plainly; no-date returns a null
 * verdict clause (the view renders the set-your-date link instead).
 */
export function paceLineCopy(verdict, dueTotal, requiredPerDay, dateLabel) {
  const due = Math.max(0, Math.floor(dueTotal || 0));
  const count = due > SERVE_CAP
    ? `${due} due — today covers the ${SERVE_CAP} most overdue`
    : `${due} item${due === 1 ? "" : "s"} today`;
  let v = null;
  if (verdict === "on-pace") v = `on pace for ${dateLabel}`;
  else if (verdict === "close") v = `close — ${requiredPerDay}/day keeps you on pace`;
  else if (verdict === "behind") v = `behind — ${requiredPerDay}/day gets there`;
  else if (verdict === "exam-past") v = "exam date passed — set a new one";
  return { count, verdict: v };
}
