#!/usr/bin/env node
// Pure-logic tests for the engine modules, run against the real content files.
// No browser needed — the engines are framework-free.
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildMock, scoreMock } from "../public/js/engine/exam.js";
import { grade, overall, verdict } from "../public/js/engine/readiness.js";
import { buildQuiz, isCorrect } from "../public/js/engine/quiz.js";
import * as Scn from "../public/js/engine/scenario.js";
import { isSkillsTrack, completion, encodeCert, decodeCert, badgeCopy, linkedInAddUrl } from "../public/js/engine/certificate.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CCA = join(HERE, "..", "public", "content", "anthropic", "cca-f");

// assemble a track from the JSON on disk (however many domains exist)
const track = JSON.parse(readFileSync(join(CCA, "track.json"), "utf8"));
track.vendorId = "anthropic"; track.trackId = "cca-f";
track.domains = readdirSync(CCA)
  .filter((f) => /^d\d.*\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(CCA, f), "utf8")))
  .sort((a, b) => (a.order || 0) - (b.order || 0));

const stub = { lessonDone: () => false, getQ: () => undefined, dueQuestions: () => [], bestMock: () => null, s: { exams: [] } };

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

console.log(`\nTrack: ${track.domains.length} domains, ${track.domains.reduce((n, d) => n + (d.questions || []).length, 0)} standalone questions\n`);

// ── exam: build + score ──────────────────────────────────────────────
console.log("exam engine");
const mock = buildMock(track, stub);
ok(mock.total > 0, `buildMock returns ${mock.total} items`);
ok(mock.total <= (track.exam.questionCount || 60), `mock size ≤ exam.questionCount (${mock.total} ≤ ${track.exam.questionCount})`);
ok(mock.items.every((q) => q.options && q.options.length >= 2), "every item has ≥2 options");
ok(mock.items.every((q) => q.options.some((o) => o.correct)), "every item has a correct option");
ok(mock.scenarioIds.length === Math.min(track.exam.scenariosPresented || 4, track.domains.reduce((n, d) => n + (d.scenarios || []).length, 0)), `drew ${mock.scenarioIds.length} scenarios`);

const allRight = {}; mock.items.forEach((q) => (allRight[q.id] = q.options.filter((o) => o.correct).map((o) => o.id)));
const perfect = scoreMock(track, mock.items, allRight);
ok(perfect.scaled === 1000 && perfect.passed, `all-correct → 1000/1000, passed (${perfect.scaled})`);
const blank = scoreMock(track, mock.items, {});
ok(blank.scaled === 0 && !blank.passed, `blank → 0/1000, failed`);
const domTotals = Object.values(perfect.perDomain).reduce((n, d) => n + d.total, 0);
ok(domTotals === mock.total, `perDomain totals sum to mock size (${domTotals})`);

// weighting: D1 (0.27) should get the largest share when full track present
if (track.domains.length === 5) {
  const counts = {}; mock.items.forEach((q) => (counts[q.domainId] = (counts[q.domainId] || 0) + 1));
  const d1 = counts["d1-agentic-architectures"] || 0;
  ok(d1 >= Math.max(...Object.values(counts)) - 1, `D1 has ~largest share (${d1} of ${mock.total})`);
}

// ── readiness: the A+ gate ───────────────────────────────────────────
console.log("readiness engine");
ok(grade(0.95, { scaled: 860, passed: true }).grade === "A+", "0.95 mastery + 860 passed → A+");
ok(grade(0.95, { scaled: 860, passed: true }).qualified === true, "A+ is the qualifying grade");
ok(grade(0.95, { scaled: 760, passed: true }).grade !== "A+", "0.95 mastery but mock<800 → not A+ (margin gate)");
ok(grade(0.92, null).grade !== "A+", "high mastery but no passed mock → not A+");
ok(grade(0.1, null).grade === "F", "no work → F");
const v = verdict(track, stub);
ok(typeof v.headline === "string" && Array.isArray(v.reasons), "verdict returns headline + reasons");
ok(v.grade === "F" && !v.qualified, "fresh learner is F / not qualified");

// ── quiz ─────────────────────────────────────────────────────────────
console.log("quiz engine");
const d1 = track.domains[0];
const quiz = buildQuiz(d1, stub, 10);
ok(quiz.length === Math.min(10, (d1.questions || []).length), `buildQuiz returns ${quiz.length}`);
ok(quiz.every((q) => q.options.length >= 2), "quiz questions have options");
const q0 = quiz[0];
ok(isCorrect(q0, q0.options.filter((o) => o.correct).map((o) => o.id)) === true, "isCorrect true for the right set");
ok(isCorrect(q0, q0.options.filter((o) => !o.correct).map((o) => o.id).slice(0, 1)) === false, "isCorrect false for a wrong pick");

// ── scenario ─────────────────────────────────────────────────────────
console.log("scenario engine");
const scn = (d1.scenarios || [])[0];
if (scn) {
  let st = Scn.start(scn);
  while (!st.done) {
    const step = Scn.currentStep(st);
    const best = step.choices.find((c) => c.verdict === "best");
    st = Scn.choose(st, best.id);
  }
  const db = Scn.debrief(st);
  ok(db.pct === 100, `all-best path → 100% (${db.pct}%)`);
  ok(db.steps.length === (scn.steps || []).length, "debrief covers every step");
} else ok(false, "d1 has a scenario to test");

// ── certificate + track shapes ───────────────────────────────────────
console.log("certificate engine");
ok(isSkillsTrack({ name: "x" }) === true, "no exam{} → skills track");
ok(isSkillsTrack(track) === false, "CCA-F is an exam track");

const payload = encodeCert({ name: "Ada Lovelace", vendorId: "anthropic", trackId: "cca-f", code: "CCA-F", date: "2026-07-02" });
const decoded = decodeCert(payload);
ok(decoded && decoded.name === "Ada Lovelace" && decoded.trackId === "cca-f" && decoded.date === "2026-07-02", "cert payload roundtrips");
ok(decodeCert(payload.slice(0, -1) + (payload.endsWith("a") ? "b" : "a")) === null, "tampered checksum → rejected");
ok(decodeCert(payload.replace(/^./, payload[0] === "e" ? "f" : "e")) === null, "tampered body → rejected");
ok(decodeCert("garbage") === null && decodeCert("") === null, "malformed payloads → null");
const uniName = encodeCert({ name: "Zoë O'Brien—García 日本", vendorId: "a", trackId: "t", code: "", date: "2026-01-01" });
ok(decodeCert(uniName).name === "Zoë O'Brien—García 日本", "unicode names survive the codec");

const li = linkedInAddUrl({ certName: "Automatos Academy — CCA-F prep", certUrl: "https://x/cert/abc", certId: "zzz", issued: "2026-07-02" });
ok(li.startsWith("https://www.linkedin.com/profile/add?") && li.includes("issueYear=2026") && li.includes("certId=zzz"), "LinkedIn add-to-profile URL forms");

// exam-track completion follows the A+ verdict
const freshComp = completion(track, stub, verdict);
ok(freshComp.kind === "exam" && freshComp.complete === false, "fresh learner: exam track not complete");

// skills-track completion = every lesson done; weights not required
const skillsTrack = {
  name: "Skills demo", vendorId: "automatos", trackId: "demo",
  domains: [
    { id: "m1", name: "M1", lessons: [{ id: "l1" }, { id: "l2" }] },
    { id: "m2", name: "M2", lessons: [{ id: "l3" }] },
  ],
};
ok(isSkillsTrack(skillsTrack) === true, "skills demo detected");
const noneDone = completion(skillsTrack, stub, verdict);
ok(noneDone.complete === false && noneDone.total === 3 && noneDone.done === 0, "skills: 0/3 lessons → incomplete");
const allDone = completion(skillsTrack, { ...stub, lessonDone: () => true }, verdict);
ok(allDone.complete === true && allDone.pct === 1, "skills: 3/3 lessons → complete");
const empty = completion({ domains: [] }, { ...stub, lessonDone: () => true }, verdict);
ok(empty.complete === false, "skills: empty track can never be complete");

const bc = badgeCopy(skillsTrack);
ok(/Completed/.test(bc.completionLabel) && !!bc.definition, "skills badge copy generated");
const bcFallback = badgeCopy({ name: "Some Exam", code: "SE-1", exam: { questionCount: 60 }, domains: [] });
ok(/preparation/.test(bcFallback.definition) && /not the credential/.test(bcFallback.definition), "fallback exam badge copy stays honest (prep, not the credential)");
const bcCcaf = badgeCopy(track);
ok(/issued only by/.test(bcCcaf.definition), "CCA-F custom badge copy names the real issuer");

console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
