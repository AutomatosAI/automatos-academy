// Learner-context core (PRD-TUTOR-LIVE §4.4 / S3) — the pure half of the
// consented "tutor opens knowing your progress" feature: build the wire
// object, enforce the 1 KB cap, delimit the preamble, decide the resend
// cadence. No DOM, no fetch, no storage — node-testable against the same
// engine selectors the profile page uses (tests/tutor-context.test.mjs).
// The browser half (consent UI, eligibility, track pick) is tutor-context.js.
//
// PII guard: the wire object is PII-minimal BY CONSTRUCTION — track/domain
// ids and numbers only, never a name, email, or user id. Any new field
// re-opens decision D-T1 (PRD §7 "context vs privacy drift").
import { overall, verdict } from "./engine/readiness.js";
import { completion } from "./engine/certificate.js";
import { examScale } from "./engine/exam.js";

export const CONTEXT_VERSION = 1;
/** Hard cap from the PRD — worst case ~250 tokens of preamble. */
export const MAX_CONTEXT_BYTES = 1024;
/** D-T3(b): a conversation quiet this long gets fresh numbers on next send. */
export const CONTEXT_STALE_MS = 30 * 60_000;
/** D-T3(b): readiness moving this many points is a material change. */
export const READINESS_DELTA = 5;

const pct = (x) => Math.round((x || 0) * 100);

/**
 * The versioned wire shape (PRD §4.4). Mirrors the profile page's math
 * exactly — completion()/verdict() over the same store — so the tutor and
 * the profile can never disagree about a learner:
 *   • exam tracks — readiness = weighted mastery, grade + mocks included;
 *   • skills tracks (no exam) — readiness = lesson completion, grade/mocks
 *     null (no exam framing to leak into an operator-lane conversation).
 * `extras.streak` is the U2 server snapshot ({current, best}) — the one
 * server-derived field; absent before the first sync.
 */
export function contextFor(track, store, extras = {}) {
  const comp = completion(track, store, verdict);
  const skills = comp.kind === "skills";
  const ov = skills ? overall(track, store) : comp.verdict.overall;

  // lowest-mastery domains WITH an attemptable pool, as blueprint codes
  // (ids only — the agent's KB speaks "D3", never a learner detail)
  const codeOf = {};
  for (const d of track.domains || []) codeOf[d.id] = d.code || d.id;
  const weakest = Object.values(ov.perDomain || {})
    .filter((d) => d.poolSize > 0)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 2)
    .map((d) => ({ d: codeOf[d.id] || d.id, mastery: pct(d.mastery) }));

  const best = store.bestMock();
  const mocks = skills
    ? null
    : { count: (store.s.exams || []).length, best_scaled: best ? best.scaled : null, pass: examScale(track.exam).passing };

  const streak = extras.streak && typeof extras.streak.current === "number"
    ? { current: extras.streak.current, best: extras.streak.best || extras.streak.current }
    : null;

  return {
    v: CONTEXT_VERSION,
    track: `${track.vendorId}/${track.trackId}`,
    readiness: pct(skills ? comp.pct : ov.mastery),
    grade: skills ? null : comp.verdict.grade,
    due_reviews: store.dueQuestions().length,
    weakest,
    mocks,
    streak,
    // TODO(PRD-TUTOR-LIVE §4.4): exam_date has no web store today — it is a
    // mobile-side setting, and the web study-loop PR adds the web surface.
    // Wire it here (ISO date only, never a time) once a web surface stores
    // one; until then the field ships null so the schema is already v1-stable.
    exam_date: null,
  };
}

const byteLen = (s) => new TextEncoder().encode(s).length;

/**
 * Serialize under the hard 1 KB cap (DoD: "≤ 1 KB enforced"). Sheds the
 * optional arrays before refusing outright; returns null when even the bare
 * shape is over — in which case NOTHING is sent (privacy-safe fail-closed).
 * In practice the full shape is ~250 bytes and never sheds.
 */
export function encodeContext(ctx) {
  let c = ctx;
  let s = JSON.stringify(c);
  if (byteLen(s) <= MAX_CONTEXT_BYTES) return s;
  c = { ...c, weakest: (c.weakest || []).slice(0, 1) };
  s = JSON.stringify(c);
  if (byteLen(s) <= MAX_CONTEXT_BYTES) return s;
  c = { ...c, weakest: [], mocks: null };
  s = JSON.stringify(c);
  return byteLen(s) <= MAX_CONTEXT_BYTES ? s : null;
}

/**
 * D-T2 transport (a): a clearly delimited client-side preamble on the
 * outbound message — the agent prompt's LEARNER CONTEXT section reads
 * exactly this `learner_context` block (docs/ACADEMY_TUTOR_PROMPT.md). The
 * DURABLE form is D-T2(b): an additive optional `context` field on
 * POST /api/widgets/chat injected into the agent prompt server-side —
 * requested from the platform alongside S0; when it lands, move the JSON
 * into the request body and delete this preamble.
 */
export function preambleFor(json, message) {
  return `<learner_context>\n${json}\n</learner_context>\n\n${message}`;
}

/**
 * D-T3(b) cadence: send once per conversation, again only when the numbers
 * materially change or the conversation has gone stale. `last` is the mark
 * from sentMark() (null = nothing sent yet this conversation).
 */
export function shouldSend(last, ctx, now) {
  if (!last) return true; // first context of this conversation
  if (now - last.at > CONTEXT_STALE_MS) return true; // conversation went stale
  if (last.track !== ctx.track) return true; // learner switched course
  if (last.due !== ctx.due_reviews) return true; // reviews came due / were cleared
  if (Math.abs(last.readiness - ctx.readiness) >= READINESS_DELTA) return true;
  return false;
}

/** The cadence mark to keep once the platform has ACCEPTED a context send. */
export function sentMark(ctx, now) {
  return { at: now, track: ctx.track, due: ctx.due_reviews, readiness: ctx.readiness };
}
