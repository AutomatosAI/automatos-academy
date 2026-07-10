#!/usr/bin/env node
// Spine tests (PRD-MT-02) — same zero-framework style as the other suites.
//
// Unit tests always run (pure engine + validation math). Integration tests
// need a real Postgres and run only when DATABASE_URL is set (the CI `spine`
// job provides a service container and applies migrations first); without it
// they skip loudly so `npm test` stays green in the plain job.
import { mkdtempSync, rmSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { randomUUID } from "crypto";
import express from "express";
import { buildContentIndex } from "../server/catalog.js";
import { domainStats } from "../public/js/engine/readiness.js";
import { domainStatsFromRows, weightedCompetence } from "../server/engine/competence.js";
import { DECAY_FLOOR, HALF_LIFE_MAX_DAYS, HALF_LIFE_MIN_DAYS, halfLifeDays, effectiveCompetence } from "../server/engine/decay.js";
import {
  parseTimestamp, collapseLatest, validateBatch,
  validateProgressEvent, validateTelemetryEvent, validateMockEvent, validateScenarioEvent,
} from "../server/spine/validate.js";
import { mountSpine } from "../server/spine/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DAY = 86_400_000;

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// ═══════════════════════════════════════════ unit — competence rollup ══
console.log("competence rollup (port of readiness.js)");

// 03 §5 worked example — five CCA-F domains; the blueprint-weighted rollup
// must land on Σ(weight×comp) = 0.836 ("≈ 0.84" in the doc).
const workedExample = [
  { weight: 0.15, competence: 0.91 },
  { weight: 0.30, competence: 0.68 },
  { weight: 0.20, competence: 0.88 },
  { weight: 0.20, competence: 0.90 },
  { weight: 0.15, competence: 0.93 },
];
const workedRollup = weightedCompetence(workedExample);
ok(near(workedRollup, 0.836), `03 §5 worked example → 0.836 (got ${workedRollup})`);
ok(Math.round(workedRollup * 100) === 84, "…which reads as ≈0.84, matching the doc");
ok(weightedCompetence([]) === 0, "empty scope → 0 competence");

// Hand-computed domain stats: 2 lessons (1 done) + 5 questions (4 distinct,
// all correct twice) → coverage .5, attemptsFactor 1, mastery .825.
const synthDomain = {
  id: "d-synth", weight: 0.3,
  lessons: [{ id: "l1" }, { id: "l2" }],
  questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }, { id: "q5" }],
};
const synthRows = new Map([
  ["l1", { seen: 1, correct: 1 }],
  ["q1", { seen: 2, correct: 2 }], ["q2", { seen: 2, correct: 2 }],
  ["q3", { seen: 2, correct: 2 }], ["q4", { seen: 2, correct: 2 }],
]);
const synthStats = domainStatsFromRows(synthDomain, synthRows);
ok(near(synthStats.coverage, 0.5), "coverage = lessons done / total");
ok(near(synthStats.knowledge, 1), "4 distinct of 5, all correct → knowledge 1 (attempts gate met)");
ok(near(synthStats.mastery, 0.825), `mastery = .35·cov + .65·knowledge = .825 (got ${synthStats.mastery})`);

const oneLucky = domainStatsFromRows(synthDomain, new Map([["q1", { seen: 1, correct: 1 }]]));
ok(near(oneLucky.knowledge, 0.25), "one lucky answer gated by attemptsFactor (1/4)");

// Port parity: identical inputs through the CLIENT engine (readiness.js) and
// the server port must agree exactly — one canonical math, two carriers.
const storeStub = { lessonDone: (id) => synthRows.has(id), getQ: (id) => synthRows.get(id) };
const clientStats = domainStats(synthDomain, storeStub);
ok(clientStats.mastery === synthStats.mastery, "server port ≡ client readiness.js on identical inputs");

// ═══════════════════════════════════════════════════════ unit — decay ══
console.log("decay curve (03 §2)");
ok(halfLifeDays(0) === HALF_LIFE_MAX_DAYS, "weight 0 → slowest decay (120d half-life)");
ok(halfLifeDays(0.4) === HALF_LIFE_MIN_DAYS && halfLifeDays(1) === HALF_LIFE_MIN_DAYS, "half-life saturates at 30d for heavy weights");
ok(halfLifeDays(0.3) < halfLifeDays(0.1), "heavier (exam-important) domains decay faster");

const t0 = Date.parse("2026-01-01T00:00:00Z");
ok(effectiveCompetence(0.9, t0, t0, 0.27) === 0.9, "Δt=0 → stored value untouched");
const atHalfLife = effectiveCompetence(0.9, t0, t0 + halfLifeDays(0.27) * DAY, 0.27);
ok(near(atHalfLife, DECAY_FLOOR + (0.9 - DECAY_FLOOR) / 2), `Δt=halfLife → floor + half the gap (got ${atHalfLife})`);
const d30 = effectiveCompetence(0.9, t0, t0 + 30 * DAY, 0.27);
const d90 = effectiveCompetence(0.9, t0, t0 + 90 * DAY, 0.27);
ok(d30 > d90, "monotone: more silence, less competence");
const d10y = effectiveCompetence(0.9, t0, t0 + 3650 * DAY, 0.27);
ok(d10y >= DECAY_FLOOR && d10y < DECAY_FLOOR + 1e-4, "never rots below the floor (residual baseline)");
ok(effectiveCompetence(0.9, t0, t0 + 60 * DAY, 0.3) < effectiveCompetence(0.9, t0, t0 + 60 * DAY, 0.1), "same silence, heavier weight → lower effective");
ok(effectiveCompetence(0.15, t0, t0 + 365 * DAY, 0.3) === 0.15, "at/below floor → no decay (and no lift toward it)");
ok(effectiveCompetence(0.9, t0 + DAY, t0, 0.3) === 0.9, "decay_at in the future clamps to Δt=0");

// ═══════════════════════════════ unit — conflict rule + validation ═════
console.log("conflict rule (02 §5) + event validation");

// Two devices, interleaved offline answers on the same item: the later
// device wall-clock wins, whatever order the events sit in the batch.
const evA = { key: "x", t: 100, device: "A" };
const evB = { key: "x", t: 200, device: "B" };
const evC = { key: "y", t: 50, device: "A" };
for (const batchOrder of [[evA, evB, evC], [evB, evA, evC]]) {
  const { winners, discarded } = collapseLatest(batchOrder, (v) => v.key, (v) => v.t);
  const x = winners.find((w) => w.key === "x");
  ok(x.device === "B" && x.t === 200 && discarded === 1, `later answeredAt wins, earlier discarded (order ${batchOrder.map((e) => e.device + e.t).join(",")})`);
  ok(winners.some((w) => w.key === "y"), "other items untouched by the collapse");
}

const nowMs = Date.now();
const goodProgress = {
  eventId: randomUUID(), vendorId: "anthropic", trackId: "cca-f", itemId: "q-1",
  correct: true, answeredAt: nowMs - 1000, dueAt: nowMs + DAY, seen: 3, correct_count: 2, ease: 2.42, interval: 3,
};
ok(!validateProgressEvent(goodProgress, nowMs).error, "well-formed progress event accepted");
ok(validateProgressEvent({ ...goodProgress, answeredAt: nowMs + 49 * 3_600_000 }, nowMs).error === "answeredAt_too_far_future", "FR-2: answeredAt >48h in the future rejected");
ok(!validateProgressEvent({ ...goodProgress, answeredAt: nowMs + 47 * 3_600_000 }, nowMs).error, "…but <48h clock skew tolerated");
ok(validateProgressEvent({ ...goodProgress, eventId: "not-a-uuid" }, nowMs).error === "eventId_not_uuid", "eventId must be a uuid");
ok(validateProgressEvent({ ...goodProgress, correct_count: 5 }, nowMs).error === "correct_count_out_of_range", "correct_count ≤ seen enforced");
ok(validateProgressEvent({ ...goodProgress, answeredAt: "banana" }, nowMs).error === "answeredAt_unparseable", "unparseable timestamp rejected");

const goodTelemetry = { eventId: randomUUID(), eventType: "answer", vendorId: "anthropic", trackId: "cca-f", itemId: "q-1", payload: { correct: true, timeMs: 4200 } };
ok(!validateTelemetryEvent(goodTelemetry).error, "well-formed telemetry accepted");
ok(String(validateTelemetryEvent({ ...goodTelemetry, payload: { noteText: "my name is Ada and…" } }).error).startsWith("payload_key_not_in_schema"), "US-023 PII: free-text field outside the event schema rejected");
ok(String(validateTelemetryEvent({ ...goodTelemetry, payload: { correct: { deep: true } } }).error).startsWith("payload_value_not_scalar"), "nested payload values rejected");
ok(String(validateTelemetryEvent({ ...goodTelemetry, payload: { bucket: "x".repeat(200) } }).error).startsWith("payload_string_too_long"), "over-long payload strings rejected");
ok(validateTelemetryEvent({ ...goodTelemetry, eventType: "pageview" }).error === "unknown_event_type", "event_type outside the enum rejected");

ok(!validateMockEvent({ eventId: randomUUID(), vendorId: "a", trackId: "t", scaled: 812, passed: true, at: nowMs }, nowMs).error, "well-formed mock accepted");
ok(validateMockEvent({ eventId: randomUUID(), vendorId: "a", trackId: "t", scaled: 812, passed: true, at: nowMs + 49 * 3_600_000 }, nowMs).error === "at_too_far_future", "mock `at` skew-checked");
ok(validateScenarioEvent({ eventId: randomUUID(), vendorId: "a", trackId: "t", scenarioId: "s", step: 2, scorePct: 101, at: nowMs }, nowMs).error === "scorePct_out_of_range", "scenario scorePct bounded");

ok(validateBatch("nope", validateProgressEvent, nowMs).error === "events_not_array", "batch must be an array");
ok(validateBatch([], validateProgressEvent, nowMs).error === "events_empty", "empty batch rejected");
const batchWithBad = validateBatch([goodProgress, { ...goodProgress, eventId: "bad" }], validateProgressEvent, nowMs);
ok(batchWithBad.error === "eventId_not_uuid" && batchWithBad.index === 1, "batch validation points at the offending event");
ok(parseTimestamp("1720000000000") === 1720000000000, "epoch-ms-as-string parses (query params)");
ok(parseTimestamp("2026-07-01T00:00:00Z") === Date.parse("2026-07-01T00:00:00Z"), "ISO strings parse");
ok(parseTimestamp("banana") === null, "garbage → null");

// ══════════════════════════════════════════════════════ integration ════
if (!process.env.DATABASE_URL) {
  console.log("\nintegration: SKIPPED — DATABASE_URL not set (the CI spine job runs these against a service container)");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

console.log("integration (Postgres via DATABASE_URL)");
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

const scratch = mkdtempSync(join(tmpdir(), "spine-test-"));
const contentIndex = buildContentIndex(join(HERE, "..", "public", "content"), join(scratch, "journal.json"));

// Fixture verifier (FR-4: mock Clerk verification — a verified-token fixture;
// the live-Clerk smoke is on the deploy checklist).
const verifier = async (token) => {
  if (token === "shapeless") return { azp: "verified-but-no-sub" };
  const m = /^fixture:(.+)$/.exec(token);
  if (!m) throw new Error("unverifiable token");
  return { sub: m[1] };
};
const clerkDeletions = [];
const mkApp = async (opts = {}) => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  mountSpine(app, {
    contentIndex, pool, verifier,
    clerkUserDeleter: "clerkUserDeleter" in opts ? opts.clerkUserDeleter : (async (id) => clerkDeletions.push(id)),
    rateLimit: opts.rateLimit || { max: 10_000, windowMs: 60_000 },
  });
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
};
const main = await mkApp();
const servers = [main.server];

const request = async (method, path, { token, body, headers, base = main.base } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

// Clean slate so reruns are deterministic (CASCADE clears the child tables).
await pool.query("TRUNCATE users CASCADE");

// migrations created the full 7-table schema
const TABLES = ["users", "mastery_map", "progress", "content_cache", "telemetry", "mock_attempts", "scenario_progress"];
const { rows: tableRows } = await pool.query(
  "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)", [TABLES],
);
ok(tableRows[0].n === 7, "migration created all 7 spine tables");

// ── auth: 401 vs 403, users-on-first-auth ─────────────────────────────
const noToken = await request("GET", "/api/me/state");
ok(noToken.status === 401 && noToken.body.success === false && noToken.body.error === "missing_token", "no token → 401 envelope");
const badToken = await request("GET", "/api/me/state", { token: "garbage" });
ok(badToken.status === 401 && badToken.body.error === "invalid_token", "unverifiable token → 401");
const shapeless = await request("GET", "/api/me/state", { token: "shapeless" });
ok(shapeless.status === 403 && shapeless.body.error === "token_missing_subject", "verified token with no subject → 403 (wrong shape ≠ unauthenticated)");

const alice = "fixture:user_alice";
const first = await request("GET", "/api/me/state", { token: alice });
ok(first.status === 200 && first.body.success === true && first.body.error === null, "first authenticated call succeeds");
ok(Array.isArray(first.body.data.progress) && first.body.data.progress.length === 0, "fresh user → empty state");
const { rows: aliceRows } = await pool.query("SELECT * FROM users WHERE clerk_user_id = 'user_alice'");
ok(aliceRows.length === 1, "users row minted on first authenticated call");
ok(/^[0-9a-f-]{36}$/.test(aliceRows[0].workspace_id) && aliceRows[0].plan === "free", "…with a workspace_id and plan 'free'");
const aliceWorkspace = aliceRows[0].workspace_id;

// ── sync round-trip + server-derived rollups ──────────────────────────
const cca = contentIndex.tracks.get("anthropic/cca-f");
const d1 = [...cca.domains.values()].find((d) => d.data.id === "d1-agentic-architectures").data;
const q = (i) => d1.questions[i].id;
const lessonId = d1.lessons[0].id;
const T = Date.now() - 60_000; // answers happened a minute ago
const progressEvent = (itemId, answeredAtMs, over = {}) => ({
  eventId: randomUUID(), vendorId: "anthropic", trackId: "cca-f", itemId,
  correct: true, answeredAt: new Date(answeredAtMs).toISOString(),
  dueAt: new Date(answeredAtMs + DAY).toISOString(), seen: 1, correct_count: 1, ease: 2.36, interval: 1, ...over,
});

const batch1 = [progressEvent(q(0), T), progressEvent(q(1), T + 1000), progressEvent(lessonId, T + 2000)];
const sync1 = await request("POST", "/api/sync/progress", { token: alice, body: { events: batch1 } });
ok(sync1.status === 200 && sync1.body.data.applied === 3 && sync1.body.data.discarded === 0, `progress batch applied (${JSON.stringify(sync1.body.data && { applied: sync1.body.data.applied })})`);
const d1Roll = (sync1.body.data.mastery || []).find((m) => m.scopeType === "domain" && m.scopeId === d1.id);
ok(!!d1Roll && d1Roll.competence > 0, "sync ack carries the re-derived domain scope (02 §5)");

// expected mastery from the ported math on exactly these rows
const expectRows = new Map([[q(0), { seen: 1, correct: 1 }], [q(1), { seen: 1, correct: 1 }], [lessonId, { seen: 1, correct: 1 }]]);
const expected = domainStatsFromRows(d1, expectRows).mastery;
ok(near(d1Roll.competenceRaw, expected, 1e-6), `domain competence re-derived server-side (${d1Roll.competenceRaw} ≈ ${expected})`);

const pathsWithCca = (contentIndex.paths.data.paths || []).filter((p) => (p.tracks || []).some((t) => t.vendorId === "anthropic" && t.trackId === "cca-f"));
ok(pathsWithCca.length > 0, `content has ${pathsWithCca.length} path(s) spanning cca-f to roll up`);
const pathRolls = (sync1.body.data.mastery || []).filter((m) => m.scopeType === "path");
ok(pathsWithCca.every((p) => pathRolls.some((r) => r.scopeId === p.id)), "every path touching the synced track got a path-scope rollup");
ok(pathRolls.every((r) => r.vendorId === null && r.trackId === null), "path rows are track-unqualified (scope_id is the global path id)");

const state1 = await request("GET", "/api/me/state", { token: alice });
ok(state1.body.data.progress.length === 3, "GET /api/me/state reflects the synced items");
const stateD1 = state1.body.data.masteryMap.find((m) => m.scopeType === "domain" && m.scopeId === d1.id);
ok(!!stateD1 && near(stateD1.competenceRaw, expected, 1e-6), "state carries the same server-derived mastery");
const item0 = state1.body.data.progress.find((p) => p.itemId === q(0));
ok(item0 && item0.seen === 1 && item0.ease === 2.36 && item0.interval === 1, "SM-2 state round-trips field-for-field");

// ── idempotent retry: the exact same batch replayed applies nothing ───
const retry = await request("POST", "/api/sync/progress", { token: alice, body: { events: batch1 } });
ok(retry.status === 200 && retry.body.data.applied === 0 && retry.body.data.discarded === 3, "replayed batch → 0 applied (idempotent)");

// ── conflict: two devices, later device wall-clock wins over arrival ──
const conflictItem = q(2);
const deviceB = progressEvent(conflictItem, T + 50_000, { seen: 5, correct_count: 4, ease: 2.5 }); // answered LATER…
const deviceA = progressEvent(conflictItem, T + 10_000, { seen: 1, correct_count: 1, ease: 2.36 }); // …but A answered first
const syncB = await request("POST", "/api/sync/progress", { token: alice, body: { events: [deviceB] } }); // B reconnects first
const syncA = await request("POST", "/api/sync/progress", { token: alice, body: { events: [deviceA] } }); // A arrives late
ok(syncB.body.data.applied === 1 && syncA.body.data.applied === 0 && syncA.body.data.discarded === 1, "earlier answer arriving later is discarded, not merged");
const { rows: conflictRows } = await pool.query(
  "SELECT seen, ease FROM progress WHERE user_id = $1 AND item_id = $2", [aliceRows[0].id, conflictItem],
);
ok(conflictRows[0].seen === 5 && conflictRows[0].ease === 2.5, "stored SM-2 state is the later-answered device's, wholesale");

// same rule inside one batch, order-independent
const both = await request("POST", "/api/sync/progress", { token: alice, body: { events: [
  progressEvent(q(3), T + 40_000, { seen: 9, correct_count: 9 }),
  progressEvent(q(3), T + 45_000, { seen: 2, correct_count: 1 }),
] } });
const { rows: q3Rows } = await pool.query("SELECT seen FROM progress WHERE user_id = $1 AND item_id = $2", [aliceRows[0].id, q(3)]);
ok(both.body.data.applied === 1 && q3Rows[0].seen === 2, "in-batch collapse keeps the later wall-clock answer");

// ── FR-2: bounded clock skew on the wire ──────────────────────────────
const farFuture = await request("POST", "/api/sync/progress", { token: alice, body: { events: [progressEvent(q(4), Date.now() + 49 * 3_600_000)] } });
ok(farFuture.status === 400 && farFuture.body.error.includes("answeredAt_too_far_future"), "future-dated answer rejected at the boundary");

// unknown-track events land as raw truth, no rollup (content may ship later)
const unknown = await request("POST", "/api/sync/progress", { token: alice, body: { events: [progressEvent("mystery-item", T, { vendorId: "newvendor", trackId: "unreleased" })] } });
ok(unknown.status === 200 && unknown.body.data.applied === 1 && unknown.body.data.mastery.length === 0, "unknown-to-index track: rows stored, rollup deferred");

// ── telemetry: append-only + uuid dedupe + PII schema ─────────────────
const tele = { eventId: randomUUID(), eventType: "answer", vendorId: "anthropic", trackId: "cca-f", itemId: q(0), payload: { correct: true, timeMs: 3100 } };
const tele1 = await request("POST", "/api/sync/telemetry", { token: alice, body: { events: [tele, { ...tele, eventId: randomUUID(), eventType: "session", itemId: null, payload: { surface: "feed", durationMs: 120000 } }] } });
ok(tele1.status === 200 && tele1.body.data.applied === 2, "telemetry batch stored");
const tele2 = await request("POST", "/api/sync/telemetry", { token: alice, body: { events: [tele] } });
ok(tele2.body.data.applied === 0 && tele2.body.data.deduped === 1, "same event uuid twice → one row (dedupe)");
const teleBad = await request("POST", "/api/sync/telemetry", { token: alice, body: { events: [{ ...tele, eventId: randomUUID(), payload: { freeText: "I studied at 12 Elm Street" } }] } });
ok(teleBad.status === 400 && teleBad.body.error.includes("payload_key_not_in_schema"), "free-text telemetry field rejected (PII minimization)");

// ── mocks: append-only attempts feeding the readiness gate ────────────
const mockEv = { eventId: randomUUID(), vendorId: "anthropic", trackId: "cca-f", scaled: 812, passed: true, at: new Date(T).toISOString() };
const mocks1 = await request("POST", "/api/sync/mocks", { token: alice, body: { events: [mockEv, { ...mockEv, eventId: randomUUID(), scaled: 640, passed: false, at: new Date(T - DAY).toISOString() }] } });
ok(mocks1.status === 200 && mocks1.body.data.applied === 2, "mock attempts stored");
const mocks2 = await request("POST", "/api/sync/mocks", { token: alice, body: { events: [mockEv] } });
ok(mocks2.body.data.applied === 0 && mocks2.body.data.deduped === 1, "mock retry deduped on event uuid");

// ── scenarios: later wall-clock wins ──────────────────────────────────
const scnId = ((d1.scenarios || [])[0] || { id: "scn-1" }).id;
const scnEvent = (step, scorePct, atMs) => ({ eventId: randomUUID(), vendorId: "anthropic", trackId: "cca-f", scenarioId: scnId, step, scorePct, at: new Date(atMs).toISOString() });
await request("POST", "/api/sync/scenarios", { token: alice, body: { events: [scnEvent(2, 50, T + 20_000)] } });
const scnStale = await request("POST", "/api/sync/scenarios", { token: alice, body: { events: [scnEvent(1, 10, T + 5_000)] } });
ok(scnStale.body.data.applied === 0, "stale scenario update (earlier wall-clock) discarded");
const scnNewer = await request("POST", "/api/sync/scenarios", { token: alice, body: { events: [scnEvent(3, 80, T + 30_000)] } });
ok(scnNewer.body.data.applied === 1, "newer scenario step applied");

// ── GET /api/me/state — deltas via ?since=, decay on read ─────────────
const stateAll = await request("GET", "/api/me/state", { token: alice });
ok(stateAll.body.data.mockAttempts.length === 2 && stateAll.body.data.scenarioProgress.length === 1, "state spans mocks + scenarios");
const scn = stateAll.body.data.scenarioProgress[0];
ok(scn.step === 3 && scn.scorePct === 80, "scenario state is the winning update");
const sinceFuture = await request("GET", `/api/me/state?since=${encodeURIComponent(new Date(Date.now() + 3_600_000).toISOString())}`, { token: alice });
const sf = sinceFuture.body.data;
ok(sf.progress.length === 0 && sf.masteryMap.length === 0 && sf.mockAttempts.length === 0 && sf.scenarioProgress.length === 0, "since=future → empty delta");
const sinceEpoch = await request("GET", "/api/me/state?since=0", { token: alice });
ok(sinceEpoch.body.data.progress.length === stateAll.body.data.progress.length, "since=0 (epoch ms) → full state");
const sinceBad = await request("GET", "/api/me/state?since=banana", { token: alice });
ok(sinceBad.status === 400 && sinceBad.body.error === "since_unparseable", "junk since → 400");

// Decay applied on read: push d1 to full mastery, then age decay_at a year.
const fullBatch = [
  ...d1.questions.slice(0, 19).map((qq, i) => progressEvent(qq.id, T + i, { seen: 1, correct_count: 1 })),
  ...d1.lessons.map((l, i) => progressEvent(l.id, T + 100 + i)),
];
const fullSync = await request("POST", "/api/sync/progress", { token: alice, body: { events: fullBatch } });
const fullRoll = fullSync.body.data.mastery.find((m) => m.scopeType === "domain" && m.scopeId === d1.id);
ok(fullRoll && fullRoll.competenceRaw > 0.9, `19 distinct correct + all lessons → mastery ~1 (got ${fullRoll && fullRoll.competenceRaw})`);
await pool.query("UPDATE mastery_map SET decay_at = now() - interval '365 days' WHERE user_id = $1 AND scope_type = 'domain' AND scope_id = $2", [aliceRows[0].id, d1.id]);
const decayed = await request("GET", "/api/me/state", { token: alice });
const decayedD1 = decayed.body.data.masteryMap.find((m) => m.scopeType === "domain" && m.scopeId === d1.id);
ok(decayedD1.competence < 0.35 && decayedD1.competence >= DECAY_FLOOR, `a year of silence decays toward the floor on read (${decayedD1.competence})`);
ok(decayedD1.competenceRaw > 0.9, "stored competence stays raw — decay is a view, never a write");

// ── rate limiting (per user, sync routes) ─────────────────────────────
const limited = await mkApp({ rateLimit: { max: 2, windowMs: 60_000 } });
servers.push(limited.server);
const bob = "fixture:user_bob";
const tinyBatch = () => ({ events: [progressEvent(q(0), Date.now() - 5000)] });
const r1 = await request("POST", "/api/sync/progress", { token: bob, body: tinyBatch(), base: limited.base });
const r2 = await request("POST", "/api/sync/progress", { token: bob, body: tinyBatch(), base: limited.base });
const r3 = await request("POST", "/api/sync/progress", { token: bob, body: tinyBatch(), base: limited.base });
ok(r1.status === 200 && r2.status === 200 && r3.status === 429 && r3.body.error === "rate_limited", "third call in the window → 429");

// ── export: all 7 tables (GDPR access/portability) ────────────────────
const exported = await request("GET", "/api/me/export", { token: alice });
const ex = exported.body.data;
ok(exported.status === 200 && ["user", "masteryMap", "progress", "contentCache", "telemetry", "mockAttempts", "scenarioProgress"].every((k) => k in ex), "export spans all 7 tables");
ok(ex.user.clerkUserId === "user_alice" && ex.progress.length > 0 && ex.telemetry.length === 2 && ex.mockAttempts.length === 2, "export carries the user's actual rows");

// ── DELETE /api/me/data — wipe rows, keep the Clerk identity ──────────
const wipe = await request("DELETE", "/api/me/data", { token: alice });
ok(wipe.status === 200 && wipe.body.data.deleted.users === 1, "data deletion returns per-table counts");
ok(wipe.body.data.deleted.progress > 0 && wipe.body.data.deleted.mastery_map > 0 && wipe.body.data.deleted.telemetry === 2, `…counting what was wiped (${JSON.stringify(wipe.body.data.deleted)})`);
const afterWipe = await request("GET", "/api/me/state", { token: alice });
ok(afterWipe.status === 200 && afterWipe.body.data.progress.length === 0 && afterWipe.body.data.masteryMap.length === 0, "deleted user re-signs-up clean (fresh empty state)");
const { rows: aliceAfter } = await pool.query("SELECT workspace_id FROM users WHERE clerk_user_id = 'user_alice'");
ok(aliceAfter.length === 1 && aliceAfter[0].workspace_id !== aliceWorkspace, "re-signup minted a FRESH workspace (old rows unreachable)");
const wipe2 = await request("DELETE", "/api/me/data", { token: alice });
ok(wipe2.status === 200 && wipe2.body.data.deleted.progress === 0, "second wipe is a clean no-op (idempotent)");

// ── DELETE /api/me/account — confirmed, wipes rows AND Clerk identity ─
const carol = "fixture:user_carol";
await request("POST", "/api/sync/progress", { token: carol, body: { events: [progressEvent(q(0), T)] } });
const noConfirm = await request("DELETE", "/api/me/account", { token: carol });
ok(noConfirm.status === 403 && noConfirm.body.error === "confirmation_required", "account deletion without the confirmation header → 403");
const wrongConfirm = await request("DELETE", "/api/me/account", { token: carol, headers: { "X-Confirm-Account-Deletion": "someone_else" } });
ok(wrongConfirm.status === 403, "confirmation must name the caller's own clerk_user_id");
const confirmed = await request("DELETE", "/api/me/account", { token: carol, headers: { "X-Confirm-Account-Deletion": "user_carol" } });
ok(confirmed.status === 200 && confirmed.body.data.clerkDeleted === true, "confirmed account deletion succeeds");
ok(clerkDeletions.includes("user_carol"), "…and the Clerk user-deletion API was called");
const { rows: carolRows } = await pool.query("SELECT * FROM users WHERE clerk_user_id = 'user_carol'");
ok(carolRows.length === 0, "users row gone with the account");
const carolBack = await request("GET", "/api/me/state", { token: carol });
ok(carolBack.status === 200 && carolBack.body.data.progress.length === 0, "deleted account can re-sign-up clean");

// Clerk deletion failing/unavailable: rows still wiped, loud enveloped error.
const failing = await mkApp({ clerkUserDeleter: async () => { throw new Error("clerk down"); } });
servers.push(failing.server);
const dave = "fixture:user_dave";
await request("POST", "/api/sync/progress", { token: dave, body: { events: [progressEvent(q(0), T)] }, base: failing.base });
const daveDel = await request("DELETE", "/api/me/account", { token: dave, headers: { "X-Confirm-Account-Deletion": "user_dave" }, base: failing.base });
ok(daveDel.status === 502 && daveDel.body.success === false && daveDel.body.error === "clerk_deletion_failed", "Clerk failure → 502, never a silent skip");
ok(daveDel.body.data.clerkDeleted === false && daveDel.body.data.deleted.users === 1, "…but the Spine rows are wiped regardless (retry-safe)");
const noDeleter = await mkApp({ clerkUserDeleter: null });
servers.push(noDeleter.server);
const erin = "fixture:user_erin";
const erinDel = await request("DELETE", "/api/me/account", { token: erin, headers: { "X-Confirm-Account-Deletion": "user_erin" }, base: noDeleter.base });
ok(erinDel.status === 502 && erinDel.body.error === "clerk_deletion_unavailable", "no Clerk key/deleter configured → skipped WITH error, per the PRD");

// ── teardown ──────────────────────────────────────────────────────────
for (const s of servers) s.close();
await pool.end();
rmSync(scratch, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
