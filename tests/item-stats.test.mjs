#!/usr/bin/env node
// LA-12 — the flywheel's judgement layer. Aggregation is SQL; what a set of
// numbers MEANS is here, so it can be tested without Postgres.
//
// The bar these tests hold: a flag is a claim that an item is failing
// learners, and it becomes the evidence line on a revision draft. A flag that
// fires on noise sends the factory rewriting content that was fine.

import {
  ITEM_FLAG_RULES,
  discrimination,
  flagEvidence,
  flagItem,
  flagItems,
} from "../server/content/item-stats.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const R = ITEM_FLAG_RULES;
const S = (over = {}) => ({
  itemId: "q-d1-1",
  attempts: 100, correct: 70,
  served: 100, skipped: 5,
  medianMsOnCard: 8000,
  topWrongCount: null,
  passerAttempts: 50, passerCorrect: 40,
  nonPasserAttempts: 50, nonPasserCorrect: 30,
  ...over,
});

console.log("the attempts floor — nothing is judged on noise");
{
  ok(flagItem(S({ attempts: 3, correct: 3, served: 3, skipped: 3 })).flags.length === 0,
    "3 attempts, 100% correct, 100% skipped → NO flags (unmeasured, not perfect)");
  ok(flagItem(S({ attempts: R.minAttempts - 1, correct: R.minAttempts - 1 })).flags.length === 0,
    "one attempt under the floor → still nothing");
  ok(flagItem(S({ attempts: R.minAttempts, correct: R.minAttempts })).flags.includes("too-easy"),
    "at the floor with 100% correct → too-easy");
}

console.log("too-easy");
{
  ok(flagItem(S({ attempts: 100, correct: 99 })).flags.includes("too-easy"), "99% correct → too-easy");
  ok(!flagItem(S({ attempts: 100, correct: 97 })).flags.includes("too-easy"), "97% correct → not flagged");
}

console.log("dead card (skip rate)");
{
  ok(flagItem(S({ served: 100, skipped: 45 })).flags.includes("dead"), "45% skipped → dead");
  ok(!flagItem(S({ served: 100, skipped: 39 })).flags.includes("dead"), "39% skipped → not dead");
  // Skip rate is over SERVED, not attempted — a card skipped is a card never
  // attempted, so dividing by attempts would hide exactly the cards that fail.
  ok(flagItem(S({ attempts: 60, correct: 40, served: 100, skipped: 40 })).flags.includes("dead"),
    "skip rate divides by served, not attempts");
}

console.log("ambiguous — refuses to fire without the distractor data");
{
  // The PRD's rule is "≤30% correct AND a concentrated wrong answer". The
  // answer telemetry payload is a closed flat-scalar set and does not carry
  // the chosen option, so topWrongCount is null in production today. Merely
  // hard is NOT a defect — an item can be hard because the material is hard —
  // so with no concentration evidence the flag must stay silent rather than
  // degrade into "low score = bad question".
  ok(!flagItem(S({ attempts: 100, correct: 20, topWrongCount: null })).flags.includes("ambiguous"),
    "20% correct with no distractor data → NOT flagged ambiguous");
  ok(flagItem(S({ attempts: 100, correct: 20, topWrongCount: 60 })).flags.includes("ambiguous"),
    "20% correct + 75% of wrong answers on one distractor → ambiguous");
  ok(!flagItem(S({ attempts: 100, correct: 20, topWrongCount: 25 })).flags.includes("ambiguous"),
    "20% correct but wrong answers spread → hard, not ambiguous");
}

console.log("discrimination");
{
  ok(Math.abs(discrimination({ passerCorrect: 40, passerAttempts: 50, nonPasserCorrect: 30, nonPasserAttempts: 50 }) - 0.2) < 1e-9,
    "passers 80% vs non-passers 60% → +0.20");

  // Null, never 0, when a group is too small. Zero is a real and damning value
  // (the item separates nobody) — returning it for "we don't know" would
  // manufacture the worst finding out of missing data.
  ok(discrimination({ passerCorrect: 2, passerAttempts: 2, nonPasserCorrect: 30, nonPasserAttempts: 50 }) === null,
    "too few passers → null, not 0");
  ok(!flagItem(S({ passerAttempts: 2, passerCorrect: 2 })).flags.includes("backwards"),
    "a thin passer group never produces a backwards flag");

  ok(flagItem(S({ passerCorrect: 20, passerAttempts: 50, nonPasserCorrect: 40, nonPasserAttempts: 50 })).flags.includes("backwards"),
    "passers do WORSE than non-passers → backwards");
  ok(flagItem(S({ passerCorrect: 30, passerAttempts: 50, nonPasserCorrect: 30, nonPasserAttempts: 50 })).flags.includes("backwards"),
    "zero separation → backwards (the item measures nothing)");
}

console.log("report shaping");
{
  const rows = [
    S({ itemId: "clean" }),
    S({ itemId: "one-flag", attempts: 100, correct: 99 }),
    S({ itemId: "two-flags", attempts: 100, correct: 99, served: 100, skipped: 50 }),
  ];
  const out = flagItems(rows);
  ok(out.length === 2, "only flagged items are reported");
  ok(out[0].itemId === "two-flags", "worst first — most flags leads");
  ok(!out.some((r) => r.itemId === "clean"), "a healthy item never appears");

  // Determinism: the admin report must not reshuffle between loads.
  ok(JSON.stringify(flagItems(rows)) === JSON.stringify(flagItems(rows.slice().reverse())),
    "ordering is stable regardless of input order");

  const ev = flagEvidence(flagItem(S({ attempts: 100, correct: 99 })));
  ok(ev.includes("too-easy") && ev.includes("100 attempts") && ev.includes("99% correct"),
    "evidence line carries the numbers, not just the verdict");
  ok(flagEvidence(flagItem(S())).includes("no flags"), "an unflagged item says so plainly");
}

console.log("rates are null, never fabricated");
{
  const never = flagItem(S({ attempts: 0, correct: 0, served: 0, skipped: 0 }));
  ok(never.correctRate === null && never.skipRate === null, "no data → null rates, not 0%");
  ok(never.flags.length === 0, "no data → no verdict");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
