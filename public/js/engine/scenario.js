// Scenario simulator state machine. A scenario is a branching sequence of
// architectural decisions; each choice carries a verdict (best / viable /
// wrong) with graded rationale. We score the path and produce a debrief.

const verdictScore = (v) => (v === "best" ? 1 : v === "viable" ? 0.5 : 0);

export function start(scn) {
  const first = (scn.steps || [])[0] || {};
  return { scn, idx: 0, stepId: first.id, path: [], done: !(scn.steps || []).length };
}

export function currentStep(state) {
  return state.scn.steps.find((s) => s.id === state.stepId) || state.scn.steps[state.idx] || null;
}

export function choose(state, choiceId) {
  const step = currentStep(state);
  const choice = (step.choices || []).find((c) => c.id === choiceId);
  const bestChoice = (step.choices || []).find((c) => c.verdict === "best");
  const path = [
    ...state.path,
    {
      stepId: step.id,
      prompt: step.prompt,
      choiceText: choice ? choice.text : "",
      verdict: choice ? choice.verdict : "wrong",
      rationale: choice ? choice.rationale : "",
      best: bestChoice ? bestChoice.text : "",
    },
  ];

  let nextId = choice && choice.next;
  let nextIdx = state.idx + 1;
  if (nextId) {
    const ix = state.scn.steps.findIndex((s) => s.id === nextId);
    nextIdx = ix >= 0 ? ix : nextIdx;
  } else {
    const nxt = state.scn.steps[nextIdx];
    nextId = nxt ? nxt.id : null;
  }
  return { ...state, idx: nextIdx, stepId: nextId, path, done: !nextId };
}

export function debrief(state) {
  const steps = state.path;
  const max = steps.length || 1;
  const got = steps.reduce((s, p) => s + verdictScore(p.verdict), 0);
  return { pct: Math.round((got / max) * 100), steps, got, max };
}
