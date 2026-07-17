#!/usr/bin/env node
// Learner-context core tests (PRD-TUTOR-LIVE S3) — the pure half of the
// consented progress-aware tutor, run against the real CCA-F content the way
// engine.test.mjs does. Guards the four things the DoD names: the PII-minimal
// versioned schema (fields NEVER creep — any new field re-opens D-T1), the
// hard 1 KB cap, the delimited preamble the agent prompt reads, and the
// D-T3(b) resend cadence.
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  CONTEXT_STALE_MS, MAX_CONTEXT_BYTES,
  contextFor, encodeContext, preambleFor, sentMark, shouldSend,
} from "../public/js/tutor-context-core.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CCA = join(HERE, "..", "public", "content", "anthropic", "cca-f");

const track = JSON.parse(readFileSync(join(CCA, "track.json"), "utf8"));
track.vendorId = "anthropic"; track.trackId = "cca-f";
track.domains = readdirSync(CCA)
  .filter((f) => /^d\d.*\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(CCA, f), "utf8")))
  .sort((a, b) => (a.order || 0) - (b.order || 0));

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// in-memory twin of store.js's read surface (no localStorage in node)
function memStore(s) {
  const full = { lessons: {}, q: {}, exams: [], scenarios: {}, ...s };
  return {
    s: full,
    lessonDone: (id) => !!full.lessons[id],
    getQ: (id) => full.q[id],
    dueQuestions: () => { const t = Date.now(); return Object.entries(full.q).filter(([, v]) => v.due && v.due <= t).map(([id]) => id); },
    bestMock: () => (full.exams || []).reduce((b, e) => (e.scaled > (b ? b.scaled : -1) ? e : b), null),
  };
}

// ── schema: PII-minimal, versioned, exam-track branch ────────────────────
console.log("contextFor — exam track");
const d1 = track.domains[0];
const qids = (d1.questions || []).slice(0, 5).map((q) => q.id);
const past = Date.now() - 60_000;
const q = {};
for (const id of qids) q[id] = { seen: 2, correct: 1, ease: 2.3, interval: 1, due: past, at: past, domainId: d1.id };
const store = memStore({
  q,
  exams: [{ scaled: 680, passed: false, at: past }, { scaled: 745, passed: true, at: past }],
  lessons: { [((d1.lessons || [])[0] || {}).id || "l0"]: past },
});
const ctx = contextFor(track, store, { streak: { current: 6, best: 21 } });

const EXPECTED_KEYS = ["v", "track", "readiness", "grade", "due_reviews", "weakest", "mocks", "streak", "exam_date"];
ok(JSON.stringify(Object.keys(ctx)) === JSON.stringify(EXPECTED_KEYS), "fields are EXACTLY the v1 schema (PII guard — new fields re-open D-T1)");
ok(ctx.v === 1, "versioned: v === 1");
ok(ctx.track === "anthropic/cca-f", `track is ids only (${ctx.track})`);
ok(ctx.due_reviews === qids.length, `due_reviews from dueQuestions() (${ctx.due_reviews})`);
ok(Number.isInteger(ctx.readiness) && ctx.readiness >= 0 && ctx.readiness <= 100, `readiness is an integer pct (${ctx.readiness})`);
ok(typeof ctx.grade === "string" && ctx.grade.length <= 2, `exam track carries a grade (${ctx.grade})`);
ok(Array.isArray(ctx.weakest) && ctx.weakest.length <= 2, `weakest capped at 2 (${ctx.weakest.length})`);
ok(ctx.weakest.every((w) => typeof w.d === "string" && Number.isInteger(w.mastery)), "weakest entries are {d: id, mastery: int}");
ok(ctx.mocks && ctx.mocks.count === 2 && ctx.mocks.best_scaled === 745, `mocks count/best (${ctx.mocks.count}/${ctx.mocks.best_scaled})`);
ok(ctx.mocks.pass === (track.exam.passingScore || 720), `mocks.pass is the track's pass mark (${ctx.mocks.pass})`);
ok(ctx.streak && ctx.streak.current === 6 && ctx.streak.best === 21, "streak passes through the U2 snapshot");
ok(ctx.exam_date === null, "exam_date is the null seam until a web surface stores one");
const wire = JSON.stringify(ctx);
ok(!/"(name|email|user|user_id|userId)"\s*:/.test(wire) && !wire.includes("@"), "wire carries no name/email/user field — numbers and ids only");

const noStreak = contextFor(track, store, {});
ok(noStreak.streak === null, "no sync snapshot → streak null (never invented)");

// ── schema: skills-track branch (no exam framing) ────────────────────────
console.log("contextFor — skills track");
const skills = { ...track, exam: undefined, trackId: "apa-like" };
const firstLesson = (track.domains.flatMap((d) => d.lessons || [])[0] || {}).id;
const sctx = contextFor(skills, memStore({ lessons: firstLesson ? { [firstLesson]: past } : {} }), {});
ok(sctx.grade === null && sctx.mocks === null, "skills track → grade/mocks null (no exam framing to leak)");
ok(Number.isInteger(sctx.readiness), `skills readiness = lesson completion pct (${sctx.readiness})`);

// ── the 1 KB cap ─────────────────────────────────────────────────────────
console.log("encodeContext — hard cap");
const enc = encodeContext(ctx);
ok(enc !== null && new TextEncoder().encode(enc).length <= MAX_CONTEXT_BYTES, `real context well under 1 KB (${new TextEncoder().encode(enc).length} bytes)`);
ok(JSON.stringify(JSON.parse(enc)) === JSON.stringify(ctx), "encoding round-trips losslessly when under cap");
const fat = { ...ctx, weakest: Array.from({ length: 60 }, (_, i) => ({ d: `domain-with-a-very-long-identifier-${i}`, mastery: i })) };
const fatEnc = encodeContext(fat);
ok(fatEnc !== null && new TextEncoder().encode(fatEnc).length <= MAX_CONTEXT_BYTES, "oversized context sheds back under the cap");
ok(JSON.parse(fatEnc).weakest.length <= 1, "shedding trims weakest first");
const monster = { ...ctx, track: "x".repeat(2048) };
ok(encodeContext(monster) === null, "uncappable context → null (nothing is sent, fail-closed)");

// ── the delimited preamble ───────────────────────────────────────────────
console.log("preambleFor");
const pre = preambleFor(enc, "Why was my D3 answer wrong?");
ok(pre === `<learner_context>\n${enc}\n</learner_context>\n\nWhy was my D3 answer wrong?`, "block is exactly <learner_context>…</learner_context> + blank line + message");
ok(pre.endsWith("Why was my D3 answer wrong?"), "the learner's message survives verbatim");

// ── D-T3(b) cadence ──────────────────────────────────────────────────────
console.log("shouldSend — cadence");
const now = Date.now();
ok(shouldSend(null, ctx, now) === true, "first message of a conversation → send");
const mark = sentMark(ctx, now);
ok(shouldSend(mark, ctx, now + 1000) === false, "same numbers, fresh conversation → hold");
ok(shouldSend(mark, { ...ctx, due_reviews: ctx.due_reviews + 1 }, now + 1000) === true, "a new due item → resend");
ok(shouldSend(mark, { ...ctx, readiness: ctx.readiness + 4 }, now + 1000) === false, "readiness +4 → not material");
ok(shouldSend(mark, { ...ctx, readiness: ctx.readiness + 5 }, now + 1000) === true, "readiness ±5 → resend");
ok(shouldSend(mark, { ...ctx, track: "github/gh-500" }, now + 1000) === true, "track switch → resend");
ok(shouldSend(mark, ctx, now + CONTEXT_STALE_MS + 1) === true, "stale conversation → resend");

// ── parse/link gate for the browser half ─────────────────────────────────
// CI is the only execution gate for this repo, and nothing else parses the
// tutor client. Every module in this graph declares only consts/functions at
// top level (DOM/storage touched inside calls), so a plain import in node
// proves the whole S3 surface parses and links.
console.log("browser modules parse + link");
try {
  const tc = await import("../public/js/tutor-context.js");
  ok(["attachContext", "consentCard", "consentStrip", "consentState", "onContextChange", "refreshOffer", "setConsent"].every((k) => typeof tc[k] === "function"),
    "tutor-context.js exports the S3 surface");
} catch (e) { ok(false, `tutor-context.js imports cleanly (${e.message})`); }
try {
  const tut = await import("../public/js/tutor.js");
  ok(typeof tut.askTutor === "function" && typeof tut.mountTutor === "function" && typeof tut.tutorPageView === "function",
    "tutor.js parses with the S3 integration");
} catch (e) { ok(false, `tutor.js imports cleanly (${e.message})`); }

console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
