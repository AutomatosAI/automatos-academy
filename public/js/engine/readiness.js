// Readiness model — the heart of "A+ prep for A+ people".
//
// Per-domain mastery blends lesson coverage with PROVEN question accuracy
// (gated by how much of the bank you've actually attempted, so one lucky
// answer can't fake mastery). Overall readiness is the blueprint-weighted
// sum. The grade band turns that into a letter, where A+ is the
// qualification bar: ≥90% weighted mastery AND a full mock passed with margin.

export function domainStats(domain, store) {
  const lessons = domain.lessons || [];
  const lessonsDone = lessons.filter((l) => store.lessonDone(l.id)).length;
  const coverage = lessons.length ? lessonsDone / lessons.length : 0;

  const qs = domain.questions || [];
  let seen = 0, correct = 0, distinct = 0;
  for (const q of qs) {
    const r = store.getQ(q.id);
    if (r) { seen += r.seen; correct += r.correct; distinct++; }
  }
  const accuracy = seen ? correct / seen : 0;
  const attemptsFactor = Math.min(1, distinct / Math.max(4, Math.ceil(qs.length * 0.6)));
  const knowledge = accuracy * attemptsFactor;
  const mastery = 0.35 * coverage + 0.65 * knowledge;

  return { coverage, accuracy, distinct, poolSize: qs.length, lessonsDone, lessonsTotal: lessons.length, knowledge, mastery, weight: domain.weight, name: domain.name, id: domain.id };
}

export function overall(track, store) {
  const perDomain = {};
  let sum = 0, wsum = 0;
  for (const d of track.domains) {
    const st = domainStats(d, store);
    perDomain[d.id] = st;
    sum += (d.weight || 0) * st.mastery;
    wsum += d.weight || 0;
  }
  return { mastery: wsum ? sum / wsum : 0, perDomain };
}

export function grade(mastery, bestMock) {
  const mockScaled = bestMock ? bestMock.scaled : 0;
  const passed = bestMock ? bestMock.passed : false;
  const composite = 0.65 * mastery + 0.35 * (mockScaled / 1000);

  let g;
  if (mastery >= 0.9 && passed && mockScaled >= 800) g = "A+";
  else if (composite >= 0.84 && passed) g = "A";
  else if (composite >= 0.78) g = "A-";
  else if (composite >= 0.72) g = "B+";
  else if (composite >= 0.64) g = "B";
  else if (composite >= 0.54) g = "C";
  else if (composite >= 0.44) g = "D";
  else g = "F";

  return { grade: g, qualified: g === "A+", composite, mockScaled, passed };
}

export function verdict(track, store) {
  const ov = overall(track, store);
  const bestMock = store.bestMock();
  const gr = grade(ov.mastery, bestMock);
  const due = store.dueQuestions().length;
  const weakest = Object.values(ov.perDomain).filter((d) => d.poolSize).sort((a, b) => a.mastery - b.mastery)[0];

  let headline, next;
  if (gr.qualified) {
    headline = "A+ — qualified.";
    next = "Elite-ready. Keep it warm: clear the review queue and re-sit a mock close to exam day.";
  } else {
    headline = `${gr.grade} — not yet qualified.`;
    const bits = [];
    if (ov.mastery < 0.9) bits.push(`lift weighted mastery to 90%+ (now ${(ov.mastery * 100).toFixed(0)}%)`);
    if (!gr.passed) bits.push("pass a full-length mock (60 Q · 120 min)");
    else if (gr.mockScaled < 800) bits.push(`pass a mock with margin — ≥800/1000 (best ${gr.mockScaled})`);
    next = `A+ is the only qualifying grade. To reach it: ${bits.join("; ")}.`;
  }

  const reasons = [];
  if (weakest) reasons.push(`Weakest domain — ${weakest.name}: ${(weakest.mastery * 100).toFixed(0)}% mastery.`);
  if (due) reasons.push(`${due} spaced-repetition item${due > 1 ? "s" : ""} due now.`);
  if (!bestMock) reasons.push("No full mock attempted — readiness is unproven until you sit one.");

  return { ...gr, overall: ov, headline, next, reasons, weakest, due, bestMock };
}
