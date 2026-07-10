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
