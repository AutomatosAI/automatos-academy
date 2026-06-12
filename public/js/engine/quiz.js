// Quiz selection + grading. Picks questions for a domain, prioritising
// spaced-repetition-due, unseen, and recently-missed items, then shuffles
// question order and option order.

export function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function prep(q) {
  return { ...q, options: shuffle(q.options || []) };
}

export function buildQuiz(domain, store, n = 8) {
  const qs = (domain.questions || []).map((q) => ({ ...q, domainId: domain.id }));
  if (!qs.length) return [];
  const t = Date.now();
  const scored = qs.map((q) => {
    const r = store.getQ(q.id);
    let pr;
    if (!r) pr = 3;                          // unseen
    else if (r.due && r.due <= t) pr = 4;    // due for review
    else if (!r.last) pr = 3.5;              // missed last time
    else pr = 1;                             // known
    return { q, pr, rand: Math.random() };
  });
  scored.sort((a, b) => b.pr - a.pr || a.rand - b.rand);
  return shuffle(scored.slice(0, Math.min(n, qs.length)).map((s) => prep(s.q)));
}

export function isCorrect(question, chosenIds) {
  const correct = (question.options || []).filter((o) => o.correct).map((o) => o.id).sort();
  const chosen = [...chosenIds].sort();
  return correct.length === chosen.length && correct.every((id, i) => id === chosen[i]);
}

export const isMulti = (q) => (q.options || []).filter((o) => o.correct).length > 1 || q.type === "multi";
