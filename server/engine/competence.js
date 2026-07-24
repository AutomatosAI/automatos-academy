// Server-side competence math (PRD-MT-02 US-024) — a direct port of
// public/js/engine/readiness.js domainStats/overall, operating on DB
// `progress` rows instead of the localStorage Store. Formulas are kept
// IDENTICAL to the client engine (one canonical math, two carriers):
//   coverage  = lessons done / lessons total
//   knowledge = accuracy × attemptsFactor (gated by bank coverage, so one
//               lucky answer can't fake mastery)
//   mastery   = 0.35·coverage + 0.65·knowledge
// The only translation: "lesson done" = a progress row exists for the lesson
// id (the app records lesson completions as progress items), and question
// state comes from rows keyed by item_id.

/**
 * Per-domain stats from progress rows.
 * @param {object} domain — a per-domain content file ({id, weight, lessons, questions})
 * @param {Map<string,{seen:number,correct:number}>} rows — the user's progress
 *        rows for the domain's track, keyed by item_id
 */
export function domainStatsFromRows(domain, rows) {
  const lessons = domain.lessons || [];
  const lessonsDone = lessons.filter((l) => {
    const r = rows.get(l.id);
    return !!(r && r.seen > 0);
  }).length;
  const coverage = lessons.length ? lessonsDone / lessons.length : 0;

  const qs = domain.questions || [];
  let seen = 0, correct = 0, distinct = 0;
  for (const q of qs) {
    const r = rows.get(q.id);
    if (r) { seen += r.seen; correct += r.correct; distinct++; }
  }
  const accuracy = seen ? correct / seen : 0;
  const attemptsFactor = Math.min(1, distinct / Math.max(4, Math.ceil(qs.length * 0.6)));
  const knowledge = accuracy * attemptsFactor;
  const mastery = 0.35 * coverage + 0.65 * knowledge;

  return { coverage, accuracy, distinct, poolSize: qs.length, lessonsDone, lessonsTotal: lessons.length, knowledge, mastery, weight: domain.weight || 0, id: domain.id };
}

/**
 * The SAME math as domainStatsFromRows, generalised to an arbitrary member set
 * — what a CONCEPT rollup needs (PRD-WAVE-LIVING-ACADEMY LA-2), because a
 * concept can be a lesson (a handful of items) or a whole domain.
 *
 * Identical formulas, one difference of membership: a concept's question pool
 * includes in-lesson knowledge checks, which `domainStatsFromRows` deliberately
 * excludes from the blueprint-weighted mastery_map. Given a domain's exact
 * member set this returns the same coverage/accuracy/knowledge/mastery numbers
 * — pinned by an equivalence test rather than asserted in a comment.
 *
 * @param {{lessonIds: string[], questionIds: string[]}} members
 * @param {Map<string,{seen:number,correct:number}>} rows — keyed by item_id
 */
export function conceptStatsFromRows(members, rows) {
  const lessonIds = members.lessonIds || [];
  const questionIds = members.questionIds || [];

  const lessonsDone = lessonIds.filter((id) => {
    const r = rows.get(id);
    return !!(r && r.seen > 0);
  }).length;
  const coverage = lessonIds.length ? lessonsDone / lessonIds.length : 0;

  let seen = 0, correct = 0, distinct = 0;
  for (const id of questionIds) {
    const r = rows.get(id);
    if (r) { seen += r.seen; correct += r.correct; distinct++; }
  }
  const accuracy = seen ? correct / seen : 0;
  const attemptsFactor = Math.min(1, distinct / Math.max(4, Math.ceil(questionIds.length * 0.6)));
  const knowledge = accuracy * attemptsFactor;

  return {
    coverage, accuracy, distinct, knowledge,
    mastery: 0.35 * coverage + 0.65 * knowledge,
    poolSize: questionIds.length,
    lessonsDone, lessonsTotal: lessonIds.length,
    seen,
    // Recorded misses across the concept's items — the honest "lapse" signal
    // raw progress rows support (SM-2 lapse semantics would need per-answer
    // history the Spine deliberately doesn't keep).
    lapses: seen - correct,
  };
}

/**
 * Blueprint-weighted roll-up — readiness.js `overall` reduced to its math:
 * Σ(weight × competence) / Σweight. Used for both the per-track headline and
 * the cross-track `path` scope (03 §2), and pinned by the 03 §5 worked
 * example (weights .15/.30/.20/.20/.15 × comps .91/.68/.88/.90/.93 → 0.836).
 * @param {Array<{weight:number, competence:number}>} entries
 */
export function weightedCompetence(entries) {
  let sum = 0, wsum = 0;
  for (const e of entries) {
    sum += (e.weight || 0) * e.competence;
    wsum += e.weight || 0;
  }
  return wsum ? sum / wsum : 0;
}
