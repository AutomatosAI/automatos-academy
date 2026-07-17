#!/usr/bin/env node
// Digest tests (PRD-DIGEST) — same zero-framework style as the other suites.
// Pure tests (delta math, compose, copy register, source hygiene) always run;
// integration (prefs CRUD, ledger idempotence, unsubscribe round-trip, GDPR
// coverage) needs Postgres and runs only when DATABASE_URL is set.
//
// Time discipline: every assertion is hour-of-day independent (fixed dates or
// relative-to-now windows) — the spine suite's midnight sundial (#39) is not
// getting a sibling.
import { mkdtempSync } from "fs";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { createServer } from "http";
import express from "express";
import { weekStartUtc, buildStats } from "../server/digest/snapshot.js";
import { weekDeltas, daysToExam, composeDigest } from "../server/digest/compose.js";
import { createMailer } from "../server/digest/mailer.js";
import { runDigest, buildMeta } from "../server/digest/send.js";
import { registerDigestRoutes } from "../server/digest/routes.js";
import { mountSpine } from "../server/spine/index.js";
import { buildContentIndex } from "../server/catalog.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DAY = 86_400_000;

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// ═══════════════════════════════════════════════ unit — week anchoring ══
console.log("week anchoring (UTC Monday)");
ok(weekStartUtc(new Date("2026-07-19T18:30:00Z")) === "2026-07-13", "Sunday evening belongs to the Monday-anchored week it closes");
ok(weekStartUtc(new Date("2026-07-13T00:00:00Z")) === "2026-07-13", "Monday 00:00 anchors to itself");
ok(weekStartUtc(new Date("2026-07-15T11:59:00Z")) === "2026-07-13", "midweek anchors back to Monday");

// ═══════════════════════════════════════════════ unit — stats assembly ══
console.log("stats assembly (buildStats)");
const NOW = Date.parse("2026-07-19T18:00:00Z");
const miniDomain = {
  id: "d1", name: "Identity & Access Mgmt", weight: 0.3,
  lessons: [{ id: "l1" }, { id: "l2" }],
  questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }, { id: "q5" }],
};
const miniIndex = { tracks: new Map([["acme/cert-a", {
  track: { data: { name: "Cert A" } },
  domains: new Map([["d1", { data: miniDomain }]]),
}]]) };
const rows = [
  { vendor_id: "acme", track_id: "cert-a", item_id: "l1", seen: 1, correct: 1, due_at: null, answered_at: new Date(NOW - 2 * DAY) },
  { vendor_id: "acme", track_id: "cert-a", item_id: "q1", seen: 2, correct: 2, due_at: new Date(NOW - 3600e3), answered_at: new Date(NOW - 2 * DAY) },
  { vendor_id: "acme", track_id: "cert-a", item_id: "q2", seen: 2, correct: 2, due_at: new Date(NOW + 5 * DAY), answered_at: new Date(NOW - 30 * DAY) },
  { vendor_id: "acme", track_id: "cert-a", item_id: "q3", seen: 2, correct: 2, due_at: new Date(NOW - DAY), answered_at: new Date(NOW - 2 * DAY) },
  { vendor_id: "acme", track_id: "cert-a", item_id: "q4", seen: 2, correct: 2, due_at: null, answered_at: new Date(NOW - 40 * DAY) },
  { vendor_id: "unknown", track_id: "gone", item_id: "x", seen: 9, correct: 9, due_at: null, answered_at: new Date(NOW) },
];
const stats = buildStats({ rows, index: miniIndex, streak: { current: 12, best: 12 }, nowMs: NOW });
const tA = stats.tracks["acme/cert-a"];
ok(!!tA && stats.tracks["unknown/gone"] === undefined, "retired/unknown tracks are ignored, known ones kept");
ok(tA.seenSum === 9 && tA.correctSum === 9, "seen/correct sums add across the track's rows");
ok(tA.dueCount === 2, "dueCount counts rows due at snapshot time only");
ok(tA.weekTouched === 3 && tA.touchedDomains.length === 1 && tA.touchedDomains[0] === "d1", "week-touched rows + touched domains derived from answered_at recency");
ok(Math.abs(tA.perDomain.d1 - 0.825) < 1e-9, "perDomain carries the RAW competence math (readiness port, .825 worked example)");

// ═══════════════════════════════════════════════════ unit — delta math ══
console.log("delta math (weekDeltas)");
const prevStats = { streak: { current: 5, best: 9 }, tracks: { "acme/cert-a": { seenSum: 7, correctSum: 6, dueCount: 0, weekTouched: 4, touchedDomains: ["d1"], perDomain: { d1: 0.60, d2: 0.90 } } } };
const currStats = { streak: { current: 12, best: 12 }, tracks: { "acme/cert-a": { seenSum: 50, correctSum: 44, dueCount: 12, weekTouched: 9, touchedDomains: ["d1"], perDomain: { d1: 0.72, d2: 0.40 } } } };
const d1 = weekDeltas(currStats, prevStats);
ok(d1.questions === 43, `questions = seenSum diff, repeats included (got ${d1.questions})`);
ok(d1.topGain && d1.topGain.domainId === "d1" && Math.abs(d1.topGain.delta - 0.12) < 1e-9, "biggest gain named from TOUCHED domains only");
ok(d1.dueTotal === 12 && d1.zeroWeek === false && d1.firstDigest === false, "due total + flags carried");
// d2 collapsed .90→.40 but was NOT touched this week — it must never surface
// (untouched deltas are phantom drops, §4.2) and a drop never headlines.
const dropOnly = weekDeltas(
  { streak: { current: 1, best: 1 }, tracks: { t: { seenSum: 10, weekTouched: 2, touchedDomains: ["d9"], perDomain: { d9: 0.30 } } } },
  { tracks: { t: { seenSum: 5, perDomain: { d9: 0.80 } } } },
);
ok(dropOnly.topGain === null, "a touched domain that FELL never headlines (no shame line)");
const first = weekDeltas({ streak: { current: 0, best: 0 }, tracks: { t: { seenSum: 500, weekTouched: 12, touchedDomains: [], perDomain: {} } } }, null);
ok(first.firstDigest === true && first.questions === 12, "first digest counts the week's touched items, never all-time seenSum");
ok(weekDeltas({ streak: { current: 0, best: 3 }, tracks: {} }, prevStats).zeroWeek === true, "no activity → zeroWeek");

// ═══════════════════════════════════════════════════ unit — countdown ══
console.log("exam countdown (daysToExam)");
ok(daysToExam("2026-08-11", NOW) === 23, "23 days to an exam 23 days out");
ok(daysToExam("2026-07-19", NOW) === 1, "exam-day itself still honestly has a day");
ok(daysToExam("2026-07-01", NOW) === null, "a past exam date renders nothing");
ok(daysToExam("11-08-2026", NOW) === null && daysToExam(undefined, NOW) === null, "malformed dates render nothing");

// ═══════════════════════════════════════════════════════ unit — compose ══
console.log("compose (register + variants)");
const meta = {
  ...buildMeta(miniIndex),
  examDates: { "acme/cert-a": "2026-08-11" },
  baseUrl: "https://academy.example",
  unsubUrl: "https://academy.example/digest/unsubscribe?u=U&t=T",
  nowMs: NOW,
};
const mail = composeDigest({ curr: currStats, prev: prevStats, meta });
ok(/43 questions practised/.test(mail.subject), `subject carries the real number (got "${mail.subject}")`);
ok(/streak intact/.test(mail.subject), "subject notes the intact streak");
ok(mail.html.includes("Identity &amp; Access Mgmt up 12%") && mail.text.includes("Identity & Access Mgmt up 12%"), "biggest move named with the domain's display name");
ok(mail.html.includes("23 days to Cert A") && /coverage is what counts/.test(mail.html), "countdown present, coverage framing");
ok(mail.html.includes("Clear your 12 due reviews") && mail.html.includes("?src=digest"), "CTA deep-links the due queue with the src=digest beacon tag");
// the HTML part correctly &amp;-escapes the href; the text part carries it raw
ok(mail.html.includes("/digest/unsubscribe?u=U&amp;t=T") && mail.text.includes(meta.unsubUrl), "one-click unsubscribe link in both parts (html escaped, text raw)");
const noDate = composeDigest({ curr: currStats, prev: prevStats, meta: { ...meta, examDates: {} } });
ok(!/days to/.test(noDate.html), "no exam date → no countdown line, never invented");
const zero = composeDigest({ curr: { streak: { current: 0, best: 9 }, tracks: {} }, prev: prevStats, meta });
ok(zero.zeroWeek === true && /quiet/.test(zero.subject), "zero week → the gentle variant");
ok(/ended at 9/.test(zero.text) && /day 1 is waiting/i.test(zero.text), "ended streak framed protectively, day 1 waiting");
for (const banned of [/verified/i, /guarantee/i, /you're losing/i, /don't break/i, /you failed/i]) {
  ok(!banned.test(mail.html) && !banned.test(zero.html) && !banned.test(mail.subject), `register: ${banned} never appears`);
}
const hostile = composeDigest({
  curr: { streak: { current: 1, best: 1 }, tracks: { "acme/cert-a": { seenSum: 9, weekTouched: 1, touchedDomains: ["d1"], perDomain: { d1: 0.9 } } } },
  prev: { tracks: { "acme/cert-a": { seenSum: 1, perDomain: { d1: 0.1 } } } },
  meta: { ...meta, domainNames: { "acme/cert-a/d1": '<script>alert(1)</script>' }, examDates: {} },
});
ok(!hostile.html.includes("<script>"), "display names are escaped into the HTML part");

// ═══════════════════════════════════════════ unit — mailer fail-loud ═══
console.log("mailer (env posture)");
let threw = false;
try { createMailer({}); } catch (_) { threw = true; }
ok(threw, "missing SMTP config throws (fail-loud boot, never a half-alive mailer)");
const m = createMailer({ SMTP_HOST: "mail.privateemail.com", SMTP_PORT: "465", SMTP_USER: "digest@example.test", SMTP_PASS: "x" });
ok(m.from.includes("digest@example.test"), "From defaults to the authenticated mailbox (DMARC alignment)");

// ═══════════════════════════════════ unit — log hygiene (S3 DoD grep) ═══
console.log("source hygiene — addresses never logged");
const digestDir = join(HERE, "..", "server", "digest");
let dirty = [];
for (const f of readdirSync(digestDir)) {
  const src = readFileSync(join(digestDir, f), "utf8");
  for (const line of src.split("\n")) {
    if (/console\.\w+|log\.(log|warn|error)/.test(line) && /\$\{to\}|emailAddress|\bto\b.*\$\{/.test(line)) dirty.push(`${f}: ${line.trim()}`);
  }
}
ok(dirty.length === 0, `no digest log line interpolates a recipient address${dirty.length ? ` — ${dirty[0]}` : ""}`);

// ═══════════════════════════════════════════════════════ integration ═══
if (!process.env.DATABASE_URL) {
  console.log("\nintegration: SKIPPED — DATABASE_URL not set (the CI spine job runs these against a service container)");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

console.log("integration (Postgres via DATABASE_URL)");
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const scratch = mkdtempSync(join(tmpdir(), "digest-test-"));
const contentIndex = buildContentIndex(join(HERE, "..", "public", "content"), join(scratch, "journal.json"));

const verifier = async (token) => {
  const mm = /^fixture:(.+)$/.exec(token);
  if (!mm) throw new Error("unverifiable token");
  return { sub: mm[1] };
};

const sentMails = [];
const fakeMailer = { send: async (mm) => { sentMails.push(mm); } };
const addresses = new Map(); // clerk_user_id → address | null
const fetchEmail = async (clerkUserId) => addresses.get(clerkUserId) || null;

const app = express();
app.use(express.json({ limit: "1mb" }));
mountSpine(app, { contentIndex, pool, verifier, clerkUserDeleter: async () => {}, rateLimit: { max: 10_000, windowMs: 60_000 } });
const runNow = () => runDigest({ pool, index: contentIndex, mailer: fakeMailer, fetchEmail, baseUrl: "https://academy.example", log: { log: () => {}, warn: () => {}, error: () => {} } });
registerDigestRoutes(app, { pool, adminKey: "test-admin-key", runNow });
const server = createServer(app);
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const request = async (method, path, { token, body, headers } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
};

await pool.query("TRUNCATE users CASCADE");

const { rows: tbl } = await pool.query(
  "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)",
  [["user_prefs", "mastery_snapshots"]],
);
ok(tbl[0].n === 2, "migration created user_prefs + mastery_snapshots");

// ── prefs CRUD: default-off, partial updates, validation, rotation ─────
const dora = "fixture:user_dora";
const p0 = await request("GET", "/api/me/prefs", { token: dora });
ok(p0.status === 200 && p0.body.data.digestEnabled === false && Object.keys(p0.body.data.examDates).length === 0, "prefs default: digest OFF, no exam dates (no row needed)");

const pOn = await request("PUT", "/api/me/prefs", { token: dora, body: { digestEnabled: true } });
ok(pOn.status === 200 && pOn.body.data.digestEnabled === true, "opt-in via PUT");
const pDates = await request("PUT", "/api/me/prefs", { token: dora, body: { examDates: { "anthropic/cca-f": "2026-08-11" } } });
ok(pDates.status === 200 && pDates.body.data.digestEnabled === true && pDates.body.data.examDates["anthropic/cca-f"] === "2026-08-11", "examDates push does NOT reset the digest toggle (partial update)");

for (const [bad, code] of [
  [{ digestEnabled: "yes" }, "digest_enabled_not_boolean"],
  [{ examDates: [] }, "exam_dates_not_object"],
  [{ examDates: { "BAD KEY": "2026-08-11" } }, "exam_dates_bad_key"],
  [{ examDates: { "a/b": "11-08-2026" } }, "exam_dates_bad_date"],
  [{}, "no_known_fields"],
]) {
  const r = await request("PUT", "/api/me/prefs", { token: dora, body: bad });
  ok(r.status === 400 && r.body.error === code, `validation: ${code}`);
}

const doraId = (await pool.query("SELECT id FROM users WHERE clerk_user_id = 'user_dora'")).rows[0].id;
const tok1 = (await pool.query("SELECT unsub_token FROM user_prefs WHERE user_id = $1", [doraId])).rows[0].unsub_token;
await request("PUT", "/api/me/prefs", { token: dora, body: { digestEnabled: false } });
await request("PUT", "/api/me/prefs", { token: dora, body: { digestEnabled: true } });
const tok2 = (await pool.query("SELECT unsub_token FROM user_prefs WHERE user_id = $1", [doraId])).rows[0].unsub_token;
ok(tok1 !== tok2, "re-opt-in rotates the unsubscribe token (forwarded old links die)");

// ── seed a real week of progress on a live track ───────────────────────
const ccafKey = [...contentIndex.tracks.keys()].find((k) => k === "anthropic/cca-f") || [...contentIndex.tracks.keys()][0];
const [vendorId, trackId] = ccafKey.split("/");
const ccaf = contentIndex.tracks.get(ccafKey);
const firstDomain = [...ccaf.domains.values()][0].data;
const qIds = (firstDomain.questions || []).slice(0, 5).map((q) => q.id);
addresses.set("user_dora", "dora@example.test");
const now = new Date();
for (const [i, qid] of qIds.entries()) {
  await pool.query(
    `INSERT INTO progress (user_id, vendor_id, track_id, item_id, seen, correct, ease, "interval", due_at, answered_at)
     VALUES ($1, $2, $3, $4, 3, 2, 2.5, 1, $5, $6)`,
    [doraId, vendorId, trackId, qid, new Date(now.getTime() - 3600e3), new Date(now.getTime() - (i + 1) * 3600e3 - DAY)],
  );
}

// ── the run: snapshot → claim → send, then idempotence (US-D5) ─────────
const run1 = await runNow();
ok(run1.ran === true && run1.sent === 1 && run1.failed === 0, `first run sends exactly one digest (${JSON.stringify(run1)})`);
ok(sentMails.length === 1 && sentMails[0].to === "dora@example.test", "the mail went to the Clerk-resolved address");
ok(/Your week at the Academy/.test(sentMails[0].subject), "subject in the digest voice");
ok(sentMails[0].unsubUrl.includes(`u=${doraId}`), "unsubscribe URL carries the user id + token");

const run2 = await runNow();
ok(run2.ran === true && run2.sent === 0, "re-run same week: ledger says done, zero re-sends (US-D5)");
ok(sentMails.length === 1, "…and the mailbox agrees");

// ── unsubscribe round-trip, signed out (US-D2) ─────────────────────────
const unsubPath = sentMails[0].unsubUrl.replace("https://academy.example", "");
const un1 = await request("GET", unsubPath);
ok(un1.status === 200 && /unsubscribed/i.test(un1.body.raw), "GET unsubscribe: 200, plain confirmation, no sign-in");
const prefAfter = (await pool.query("SELECT digest_enabled FROM user_prefs WHERE user_id = $1", [doraId])).rows[0];
ok(prefAfter.digest_enabled === false, "…and the toggle is actually off");
const unBad = await request("POST", "/digest/unsubscribe?u=" + doraId + "&t=00000000-0000-4000-8000-000000000000");
ok(unBad.status === 200 && /expired/i.test(unBad.body.raw), "wrong token: honest 'expired' page, still 200, nothing changed");

// ── skip semantics: no address / SMTP failure ──────────────────────────
const evan = "fixture:user_evan";
await request("PUT", "/api/me/prefs", { token: evan, body: { digestEnabled: true } });
const evanId = (await pool.query("SELECT id FROM users WHERE clerk_user_id = 'user_evan'")).rows[0].id;
await pool.query(
  `INSERT INTO progress (user_id, vendor_id, track_id, item_id, seen, correct, ease, "interval", due_at, answered_at)
   VALUES ($1, $2, $3, $4, 1, 1, 2.5, 1, now(), now() - interval '1 day')`,
  [evanId, vendorId, trackId, qIds[0]],
);
addresses.delete("user_evan"); // Clerk can't resolve → skip, row stays claimable
const run3 = await runNow();
ok(run3.skipped >= 1 && sentMails.length === 1, "no resolvable address → skipped this week, nothing sent");
const evanRow = (await pool.query("SELECT emailed_at FROM mastery_snapshots WHERE user_id = $1", [evanId])).rows[0];
ok(evanRow && evanRow.emailed_at === null, "…and the row stays UNCLAIMED (retryable next tick)");

addresses.set("user_evan", "evan@example.test");
const realSend = fakeMailer.send;
fakeMailer.send = async () => { throw Object.assign(new Error("smtp 550"), { code: 550 }); };
const run4 = await runNow();
fakeMailer.send = realSend;
ok(run4.failed === 1, "SMTP refusal → failed count, run survives");
const evanRow2 = (await pool.query("SELECT emailed_at FROM mastery_snapshots WHERE user_id = $1", [evanId])).rows[0];
ok(evanRow2.emailed_at !== null, "claim-then-send: the failed week is SKIPPED for good, never doubled (late > double, §4.5)");

// ── zero-week auto-pause (D-D4) ────────────────────────────────────────
const finn = "fixture:user_finn";
await request("PUT", "/api/me/prefs", { token: finn, body: { digestEnabled: true } });
const finnId = (await pool.query("SELECT id FROM users WHERE clerk_user_id = 'user_finn'")).rows[0].id;
addresses.set("user_finn", "finn@example.test");
const thisWeek = weekStartUtc(new Date());
for (let w = 1; w <= 3; w++) {
  const ws = new Date(Date.parse(thisWeek) - w * 7 * DAY).toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO mastery_snapshots (user_id, week_start, stats, emailed_at) VALUES ($1, $2, $3, now())`,
    [finnId, ws, JSON.stringify({ streak: { current: 0, best: 2 }, tracks: {}, zeroWeek: true })],
  );
}
const run5 = await runNow();
ok(run5.paused === 1, "three sent zero-weeks + a fourth quiet week → paused, not mailed (D-D4)");
const finnRow = (await pool.query("SELECT stats, emailed_at FROM mastery_snapshots WHERE user_id = $1 AND week_start = $2", [finnId, thisWeek])).rows[0];
ok(finnRow && finnRow.stats.paused === true && finnRow.emailed_at === null, "…marked paused in the ledger, never claimed");
const run6 = await runNow();
ok(run6.paused === 0 && run6.sent === 0, "paused rows are not revisited on re-run");

// ── admin trigger ──────────────────────────────────────────────────────
const noKey = await request("POST", "/api/digest/run");
ok(noKey.status === 403, "manual run without the admin key → 403");
const wrongKey = await request("POST", "/api/digest/run", { headers: { "x-digest-admin-key": "guess" } });
ok(wrongKey.status === 403, "wrong admin key → 403");
const goodKey = await request("POST", "/api/digest/run", { headers: { "x-digest-admin-key": "test-admin-key" } });
ok(goodKey.status === 200 && goodKey.body.data.ran === true, "correct key runs the same ledger-guarded loop");

// ── GDPR: export carries the new tables; both wipes empty them ─────────
const exp = await request("GET", "/api/me/export", { token: evan });
ok(Array.isArray(exp.body.data.userPrefs) && exp.body.data.userPrefs.length === 1, "export includes user_prefs");
ok(Array.isArray(exp.body.data.masterySnapshots) && exp.body.data.masterySnapshots.length >= 1, "export includes mastery_snapshots");
const del = await request("DELETE", "/api/me/data", { token: evan });
ok(del.status === 200 && del.body.data.deleted.user_prefs === 1 && del.body.data.deleted.mastery_snapshots >= 1, "wipe reports per-table counts for the new tables");
const gone = await pool.query("SELECT (SELECT count(*) FROM user_prefs WHERE user_id = $1)::int AS p, (SELECT count(*) FROM mastery_snapshots WHERE user_id = $1)::int AS s", [evanId]);
ok(gone.rows[0].p === 0 && gone.rows[0].s === 0, "…and the rows are verifiably gone (US-D3)");

server.close();
await pool.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
