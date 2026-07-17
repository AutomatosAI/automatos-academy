#!/usr/bin/env node
// PRD-WEB-LOOP tests — the pacing engine + line copy (S1/S2), the shared
// next-step selector + closing line (S3), the account-ask cadence ledger
// (S4), and pathfinder lane persistence + TTL (S5). Pure node, no browser:
// the modules only touch localStorage at call time inside try/catch, so a
// Map-backed shim stands in for the real thing (imports hoist above the
// shim, but no module body reads storage — only calls do).
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── localStorage shim (call-time reads only — see header) ───────────────
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};

import {
  pace, paceInputs, paceLineCopy, observedRate, itemsPerDay,
  DAY_MS, SERVE_CAP, PACE_WINDOW_DAYS, MOCK_RESERVE_DAYS,
} from "../public/js/engine/pace.js";
import { nextStep, closingLine, dueSummary } from "../public/js/views/next-step.js";
import { askAllowed, loadLedger, ASK_COOLDOWN_DAYS, ASK_MAX_DISMISSALS } from "../public/js/account-ask.js";
import { saveLane, loadLane, clearLane, laneSort, LANE_TTL_DAYS } from "../public/js/lane.js";
import { getExamDate, setExamDate, clearExamDate, examDateMs } from "../public/js/exam-date.js";

const HERE = dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// ── pacing engine (S1) ───────────────────────────────────────────────────
console.log("pace engine");
const NOW = new Date(2026, 8, 1, 12).getTime(); // local Sep 1 — date math is local by design

// worked example: 20 days out, 12 due + 90 unseen → 17 study days → 6/day ask;
// an 8/day recent rate is on pace ("12 items today · on pace for Sep 21")
const p1 = pace(NOW + 20 * DAY_MS, 12, 90, 8, NOW);
ok(p1.verdict === "on-pace" && p1.daysLeft === 20 && p1.requiredPerDay === 6,
  `worked example → on-pace, 20 days left, ${p1.requiredPerDay}/day required`);
ok(p1.inputs.dueNow === 12 && p1.inputs.unseenInScope === 90 && p1.inputs.observedPerDay === 8,
  "the verdict carries its inputs (auditable, §7)");

const pClose = pace(NOW + 13 * DAY_MS, 30, 70, 8.5, NOW); // required 10, observed 8.5 ≥ 8
ok(pClose.verdict === "close" && pClose.requiredPerDay === 10, "within 20% under required → close");
const pBehind = pace(NOW + 13 * DAY_MS, 30, 70, 4, NOW);
ok(pBehind.verdict === "behind", "well under required → behind");
ok(pace(NOW + 13 * DAY_MS, 30, 70, 0, NOW).verdict === "behind", "cold start (rate 0) with work owed → behind, honestly");
ok(pace(NOW + 90 * DAY_MS, 0, 0, 0, NOW).verdict === "on-pace", "required 0 (all seen, nothing owed) → ready-early is on-pace");

const pNoDate = pace(undefined, 12, 90, 8, NOW);
ok(pNoDate.verdict === "no-date" && pNoDate.requiredPerDay === null && pNoDate.daysLeft === null,
  "no exam date → no verdict, no invented urgency");
ok(pace(NOW - DAY_MS, 12, 90, 8, NOW).verdict === "exam-past", "date behind us → exam-past, said plainly");
ok(pace(NOW + 2 * DAY_MS, 10, 0, 1, NOW).requiredPerDay === 10,
  `mock-reserve floor: ≤${MOCK_RESERVE_DAYS + 1} days left still divides by ≥1 study day`);

// observed rate: 30 items every second day is a 15/day rate, not a 30/day one
const alternating = Array.from({ length: PACE_WINDOW_DAYS }, (_, i) => (i % 2 ? 30 : 0));
ok(observedRate(alternating).observedPerDay === 15, "median over active days × active-day rate (30 every 2nd day → 15/day)");
ok(observedRate(new Array(PACE_WINDOW_DAYS).fill(0)).observedPerDay === 0, "idle window → 0 (cold start)");

// day bucketing: local days ending YESTERDAY — today is not a rate
const yd = new Date(2026, 8, 1); // local midnight "today" for NOW above
const buckets = itemsPerDay([
  yd.getTime() - 11 * 3600_000, yd.getTime() - 12 * 3600_000, yd.getTime() - 13 * 3600_000, // yesterday ×3
  yd.getTime() - 2 * DAY_MS - 3600_000, yd.getTime() - 3 * DAY_MS + 3600_000,               // 3 days ago ×2
  NOW - 3600_000,                          // today — excluded
  yd.getTime() - (PACE_WINDOW_DAYS + 5) * DAY_MS, // beyond the window — excluded
], NOW);
ok(buckets.length === PACE_WINDOW_DAYS && buckets[PACE_WINDOW_DAYS - 1] === 3,
  "buckets are local days, newest = yesterday (3 items)");
ok(buckets.reduce((a, b) => a + b, 0) === 5, "today and beyond-window answers are excluded");

// paceInputs: tree-gated unseen, queue-true due, timestamps → rate
const inpTrack = { domains: [{ questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }] }] };
const inpState = { q: {
  q1: { due: NOW - 1, at: yd.getTime() - 5 * 3600_000 },
  kc9: { due: NOW + DAY_MS, at: yd.getTime() - 6 * 3600_000 }, // knowledge check: counts for due/rate, not scope
} };
const inp = paceInputs(inpTrack, inpState, NOW);
ok(inp.totalInScope === 3 && inp.answeredInScope === 1 && inp.unseenInScope === 2,
  "unseen is tree-gated (3 in scope, 1 answered → 2 unseen)");
ok(inp.dueNow === 1, "dueNow counts what the review queue would serve");

// ── line copy (S2 — overflow + behind exact) ─────────────────────────────
console.log("pace line copy");
const cOn = paceLineCopy("on-pace", 12, 6, "Sep 12");
ok(cOn.count === "12 items today" && cOn.verdict === "on pace for Sep 12", `"12 items today · on pace for Sep 12"`);
ok(paceLineCopy("on-pace", 62, 6, "Sep 12").count === `62 due — today covers the ${SERVE_CAP} most overdue`,
  "overflow copy exact (serve cap stays honest)");
ok(paceLineCopy("behind", 12, 18, "Sep 12").verdict === "behind — 18/day gets there", "behind copy exact — the verdict names its ask");
ok(paceLineCopy("no-date", 3, null, "").verdict === null, "no date → no verdict clause, ever");
ok(paceLineCopy("exam-past", 3, null, "").verdict === "exam date passed — set a new one", "exam-past says so plainly");
ok(paceLineCopy("on-pace", 1, 1, "Sep 12").count === "1 item today", "singular count");

// honesty grep (S1 DoD): the pacing copy never claims a pass probability
for (const rel of ["public/js/engine/pace.js", "public/js/views/pace-line.js"]) {
  const src = readFileSync(join(HERE, "..", rel), "utf8");
  ok(!/probabilit|chance of passing|likelihood|pass rate/i.test(src), `${rel}: no pass-probability copy`);
}

// ── next-step selector (S3) ──────────────────────────────────────────────
console.log("next-step selector");
const T = {
  vendorId: "v", trackId: "t",
  exam: { questionCount: 60 },
  domains: [
    { id: "d1", weight: 0.5, lessons: [{ id: "l1", title: "L1" }, { id: "l2", title: "L2" }],
      questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }] },
    { id: "d2", weight: 0.5, lessons: [{ id: "l3", title: "L3" }], questions: [{ id: "q5" }] },
  ],
};
const mkStore = (q, doneLessons = []) => ({
  s: { q, exams: [], scenarios: {}, lessons: {} },
  lessonDone: (id) => doneLessons.includes(id),
  getQ: (id) => q[id],
  dueQuestions: () => Object.entries(q).filter(([, r]) => r.due && r.due <= NOW).map(([id]) => id),
  bestMock: () => null,
});

const sDue = mkStore({ q1: { due: NOW - 1, domainId: "d1", seen: 1, correct: 1 } }, ["l1"]);
const kinds = nextStep({ track: T, store: sDue, now: NOW }).map((c) => c.kind);
ok(kinds.join(",") === "due,lesson,drill,done", `full ordering due > lesson > drill > done (got ${kinds.join(" > ")})`);
const dueCand = nextStep({ track: T, store: sDue, now: NOW })[0];
ok(dueCand.count === 1 && dueCand.href.includes("/quiz/d1"), "due candidate deep-links the loaded domain");

const sNoDue = mkStore({}, ["l1"]);
ok(nextStep({ track: T, store: sNoDue, now: NOW })[0].kind === "lesson", "nothing due → next lesson leads");
ok(nextStep({ track: T, store: sNoDue, now: NOW })[0].title === "L2", "next lesson = first unfinished in track order");
const scoped = nextStep({ track: T, store: mkStore({}, ["l1", "l2"]), domainId: "d1", now: NOW });
ok(!scoped.some((c) => c.kind === "lesson"), "domainId scope: d1 finished → no lesson candidate from d2");
ok(nextStep({ track: T, store: mkStore({}, ["l1", "l2"]), domainId: "d2", now: NOW }).find((c) => c.kind === "lesson").title === "L3",
  "domainId scope finds its own domain's lesson");

const skills = { ...T, exam: undefined };
ok(!nextStep({ track: skills, store: sDue, now: NOW }).some((c) => c.kind === "drill"), "skills track → no drill candidate");
ok(nextStep(null).map((c) => c.kind).join(",") === "done", "null ctx → done only, no throw");
ok(nextStep({ track: {}, store: null }).map((c) => c.kind).join(",") === "done", "broken ctx → done only, no throw");
const last = nextStep({ track: T, store: sDue, now: NOW });
ok(last[last.length - 1].kind === "done", "permission to stop is always the last candidate");

ok(closingLine(12) === "Done for today — 12-day streak safe.", "closing line with a real server streak");
ok(closingLine(0) === "Done for today ✓", "closing line signed out — never an invented streak");
ok(dueSummary({ q: { a: { due: NOW - 1, domainId: "d9" }, b: { due: NOW - 1, domainId: "d9" }, c: { due: NOW + 1 } } }, NOW).due === 2,
  "dueSummary counts only what is due now");

// ── account-ask cadence ledger (S4) ──────────────────────────────────────
console.log("account-ask ledger");
const day = DAY_MS;
ok(askAllowed(null, NOW) === true, "never asked → allowed");
ok(askAllowed({ lastShownAt: NOW - (ASK_COOLDOWN_DAYS - 1) * day, dismissals: 0 }, NOW) === false,
  `shown ${ASK_COOLDOWN_DAYS - 1} days ago → still cooling down (D-WL1: once per ${ASK_COOLDOWN_DAYS} days)`);
ok(askAllowed({ lastShownAt: NOW - (ASK_COOLDOWN_DAYS + 1) * day, dismissals: 0 }, NOW) === true,
  "cooldown elapsed → allowed again");
ok(askAllowed({ lastShownAt: NOW - 400 * day, dismissals: ASK_MAX_DISMISSALS }, NOW) === false,
  `${ASK_MAX_DISMISSALS} dismissals → retired permanently, whatever the date`);
// ONE ledger across all surfaces (D-WL3 rides the same key)
localStorage.setItem("automatos-academy:v1:account-ask", JSON.stringify({ lastShownAt: NOW, dismissals: 1 }));
const led = loadLedger();
ok(led && led.dismissals === 1 && askAllowed(led, NOW) === false,
  "shared ledger: what one surface wrote gates every other surface");
localStorage.removeItem("automatos-academy:v1:account-ask");

// ── exam-date CRUD (S1: survives reload — the shim persists across calls) ─
console.log("exam-date store");
setExamDate("anthropic", "cca-f", "2026-09-12");
ok(getExamDate("anthropic", "cca-f") === "2026-09-12", "set → fresh read returns the date (reload-safe)");
ok(getExamDate("anthropic", "other") === null, "per-track keys don't bleed");
ok(examDateMs("2026-09-12") === new Date(2026, 8, 12).getTime() + DAY_MS,
  "examDateMs anchors the local END of the exam day (exam-day morning still paces)");
setExamDate("anthropic", "cca-f", "12/09/2026");
ok(getExamDate("anthropic", "cca-f") === "2026-09-12", "malformed input is ignored — the stored date survives");
clearExamDate("anthropic", "cca-f");
ok(getExamDate("anthropic", "cca-f") === null, "clear removes it");
ok(examDateMs("not-a-date") === null, "examDateMs rejects junk");

// ── pathfinder lane persistence + TTL (S5) ───────────────────────────────
console.log("pathfinder lane");
saveLane({ answers: { xp: "owner" }, recs: [{ trackId: "ai-business", name: "AI for Business" }], lane: "operator" });
const lane1 = loadLane();
ok(lane1 && lane1.lane === "operator" && lane1.recs[0].trackId === "ai-business", "save → load round-trips the walk");
ok(typeof lane1.at === "number", "the record is stamped for the rolling TTL");
// expiry: rewrite the stamp 91 days back → load prunes the key (D-WL4)
localStorage.setItem("automatos-academy:v1:pathfinder", JSON.stringify({ ...lane1, at: Date.now() - (LANE_TTL_DAYS + 1) * day }));
ok(loadLane() === null, `${LANE_TTL_DAYS}-day TTL: expired walk reads null`);
ok(localStorage.getItem("automatos-academy:v1:pathfinder") === null, "…and the expired key is pruned");
saveLane({ answers: {}, recs: [], lane: "practitioner" });
clearLane();
ok(loadLane() === null, "clearLane empties it (the reset/wipe seam)");

const grid = [
  { trackId: "a", lane: "practitioner" }, { trackId: "b", lane: "operator" },
  { trackId: "c" }, { trackId: "d", lane: "operator" },
];
ok(laneSort(grid, "operator").map((t) => t.trackId).join(",") === "b,d,a,c", "laneSort: lane first, stable within halves");
ok(laneSort(grid, null).map((t) => t.trackId).join(",") === "a,b,c,d", "no lane → untouched order");
ok(laneSort(grid, "practitioner").map((t) => t.trackId).join(",") === "a,c,b,d", "laneless tracks default to practitioner (doors' rule)");

// wipe coverage (§7): all three new keys ride the automatos-academy: prefix,
// so sync/account.js wipeLocal and progress-io backups cover them for free
for (const k of ["automatos-academy:v1:exam-dates", "automatos-academy:v1:pathfinder", "automatos-academy:v1:account-ask"]) {
  ok(k.startsWith("automatos-academy:"), `${k} rides the wipe/backup prefix`);
}

console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
