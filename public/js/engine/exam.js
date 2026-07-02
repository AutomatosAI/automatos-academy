// Mock-exam builder + scorer. Mirrors the real CCA-F format: N questions
// allocated across domains by blueprint weight, plus the "4 of 6 scenarios"
// structure folded in as scenario-step questions. Scored on a 1000 scale.

import { allScenarios } from "../content.js";
import { shuffle } from "./quiz.js";

// Hamilton / largest-remainder integer allocation of `total` across weights.
function largestRemainder(weights, total) {
  const entries = Object.entries(weights).map(([id, w]) => ({ id, exact: w * total }));
  const base = entries.map((e) => ({ id: e.id, n: Math.floor(e.exact), frac: e.exact - Math.floor(e.exact) }));
  const used = base.reduce((s, b) => s + b.n, 0);
  const rem = total - used;
  base.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < rem; i++) base[i % base.length].n++;
  return Object.fromEntries(base.map((b) => [b.id, b.n]));
}

function scenarioStepsAsQuestions(scn) {
  return (scn.steps || []).map((st, idx) => ({
    id: `${scn.id}::${st.id || idx}`,
    domainId: scn.domainId,
    type: "scenario-step",
    difficulty: st.difficulty || 3,
    stem: `**Scenario — ${scn.title}.** ${st.prompt}`,
    scenarioContext: scn.context,
    options: (st.choices || []).map((c) => ({ id: c.id, text: c.text, correct: c.verdict === "best" })),
    explanation: (st.choices || []).map((c) => `**${c.text}** — _${c.verdict}_. ${c.rationale || ""}`).join("\n\n"),
    sourceRefs: scn.sourceRefs || [],
  }));
}

export function buildMock(track, store) {
  const spec = track.exam || {};
  const targetN = spec.questionCount || 60;

  // Draw scenarios (e.g. 4 of 6) and turn their steps into questions.
  const pool = allScenarios(track);
  const present = Math.min(spec.scenariosPresented || 4, pool.length);
  const drawn = shuffle(pool).slice(0, present);
  const scenarioQs = drawn.flatMap(scenarioStepsAsQuestions);

  // Merge standalone + scenario questions per domain.
  const byDomain = {};
  for (const d of track.domains) byDomain[d.id] = (d.questions || []).map((q) => ({ ...q, domainId: d.id }));
  for (const sq of scenarioQs) (byDomain[sq.domainId] = byDomain[sq.domainId] || []).push(sq);

  const avail = Object.values(byDomain).reduce((s, a) => s + a.length, 0);
  const N = Math.min(targetN, avail);

  // Normalise weights over domains that actually have questions.
  const weights = {};
  let wsum = 0;
  for (const d of track.domains) {
    if ((byDomain[d.id] || []).length) { weights[d.id] = d.weight || 0; wsum += d.weight || 0; }
  }
  for (const id in weights) weights[id] /= wsum || 1;

  const alloc = largestRemainder(weights, N);

  const items = [];
  let shortfall = 0;
  for (const id in alloc) {
    const cap = (byDomain[id] || []).length;
    const take = Math.min(alloc[id], cap);
    shortfall += alloc[id] - take;
    items.push(...shuffle(byDomain[id]).slice(0, take));
  }
  if (shortfall > 0) {
    const used = new Set(items.map((q) => q.id));
    const rest = shuffle(Object.values(byDomain).flat().filter((q) => !used.has(q.id)));
    items.push(...rest.slice(0, shortfall));
  }

  const prepared = shuffle(items).map((q) => ({ ...q, options: shuffle(q.options || []) }));
  return {
    items: prepared,
    total: prepared.length,
    scenarioIds: drawn.map((s) => s.id),
    durationSec: (spec.durationMinutes || 120) * 60,
    spec,
    capped: prepared.length < targetN,
  };
}

// Scoring is scale-aware: real exams differ (CCA-F/GH-x are 0–1000, IAPP AIGP
// is 100–500). scoreFloor defaults to 0; scaled maps the raw fraction onto
// [floor, scale] so the mock reads like the real score report.
export function examScale(spec) {
  const scale = (spec && spec.scoreScale) || 1000;
  const floor = (spec && spec.scoreFloor) || 0;
  const passing = (spec && spec.passingScore) || 720;
  // A+ requires a pass WITH MARGIN. Tracks on a non-1000 scale must set
  // exam.aPlusScore explicitly (validator warns); 800 preserves the historic
  // 1000-scale bar.
  const aPlus = (spec && spec.aPlusScore) || (scale === 1000 ? 800 : Math.round(passing + 0.1 * (scale - passing)));
  return { scale, floor, passing, aPlus };
}

export function scoreMock(track, items, answers) {
  let correct = 0;
  const perDomain = {};
  for (const q of items) {
    const cIds = q.options.filter((o) => o.correct).map((o) => o.id).sort();
    const a = (answers[q.id] || []).slice().sort();
    const ok = cIds.length === a.length && cIds.every((id, i) => id === a[i]);
    if (ok) correct++;
    const d = (perDomain[q.domainId] = perDomain[q.domainId] || { correct: 0, total: 0 });
    d.total++;
    if (ok) d.correct++;
  }
  const total = items.length || 1;
  const { scale, floor, passing } = examScale(track.exam);
  const scaled = Math.round(floor + (correct / total) * (scale - floor));
  const passed = scaled >= passing;
  return { correct, total, scaled, passed, perDomain };
}
