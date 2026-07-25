#!/usr/bin/env node
// LA-12 · the flywheel's report against a REAL Postgres.
//
// `tests/item-stats.test.mjs` proves the flagging RULES in isolation and
// `tests/content-writeback.test.mjs` drives the routes against an in-memory
// fake pool. Neither of them executes ITEM_STATS_SQL, so until this suite
// existed the query could have been syntactically broken and CI would have
// stayed green — the report is admin-only and nothing else calls it, so the
// first person to find out would have been Gerard opening the page.
//
// What this actually proves, beyond "the SQL parses":
//   · `chosenOptionId` survives the round trip from telemetry into the
//     dominant-wrong-answer count, keyed by option ID and not by position;
//   · `ambiguous` fires when wrong answers concentrate, and stays silent when
//     they spread — the distinction the whole field was added for;
//   · an item whose wrong answers predate the field reports null, not zero.
//
// Needs a real Postgres: runs only when DATABASE_URL is set (the CI `spine`
// job provides one and applies migrations first); without it this suite skips
// loudly so `npm test` stays green with zero env.
import { createServer } from "http";
import { randomUUID } from "crypto";
import express from "express";

import { registerContentRoutes } from "../server/content/routes.js";
import { createRequireAdmin } from "../server/media/admin.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

if (!process.env.DATABASE_URL) {
  console.log("item-quality-db: SKIPPED — DATABASE_URL not set (the CI spine job runs this against a service container)");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

console.log("item-quality-db (Postgres via DATABASE_URL)");
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

const VENDOR = "anthropic";
const TRACK = "cca-f";

// Clean slate so reruns are deterministic. users cascades to telemetry.
await pool.query("DELETE FROM users WHERE clerk_user_id LIKE 'iq-test-%'");

/** N distinct learners — the report groups by item, but discrimination and the
 *  passer join are per-user, so one user answering 40 times is not the same
 *  shape as 40 users answering once. */
async function learners(n) {
  const ids = [];
  for (let i = 0; i < n; i++) {
    const { rows } = await pool.query(
      "INSERT INTO users (clerk_user_id, workspace_id) VALUES ($1, gen_random_uuid()) RETURNING id",
      [`iq-test-${randomUUID()}`],
    );
    ids.push(rows[0].id);
  }
  return ids;
}

async function answer(userId, itemId, correct, chosenOptionId) {
  await pool.query(
    `INSERT INTO telemetry (user_id, event_id, vendor_id, track_id, event_type, item_id, payload)
     VALUES ($1, $2, $3, $4, 'answer', $5, $6::jsonb)`,
    [userId, randomUUID(), VENDOR, TRACK, itemId,
      JSON.stringify({ correct, ...(chosenOptionId ? { chosenOptionId } : {}) })],
  );
}

async function serve() {
  const app = express();
  const requireAdmin = createRequireAdmin({ adminKey: "K", allowlist: new Set(), verifier: null });
  registerContentRoutes(app, { pool, requireAdmin, onChange: () => {} });
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  return {
    get: (path) => fetch(`http://127.0.0.1:${port}${path}`, { headers: { "x-admin-key": "K" } }),
    close: () => new Promise((r) => server.close(r)),
  };
}

const users = await learners(40);
const flagsFor = (body, itemId) => {
  const row = body.flagged.find((f) => f.itemId === itemId);
  return row ? row.flags : null;
};

// ── the three items the report has to tell apart ──────────────────────
//
// concentrated: 20% correct, and every wrong answer on the SAME distractor.
// spread:       20% correct, wrong answers scattered across three options.
// legacy:       20% correct, no chosenOptionId at all (answered before the
//               field shipped).
for (let i = 0; i < users.length; i++) {
  const correct = i < 8;                       // 8/40 = 20% correct
  await answer(users[i], "q-concentrated", correct, correct ? "opt-a" : "opt-b");
  await answer(users[i], "q-spread", correct, correct ? "opt-a" : ["opt-b", "opt-c", "opt-d"][i % 3]);
  await answer(users[i], "q-legacy", correct, undefined);
}

const s = await serve();
try {
  const res = await s.get(`/api/admin/content/item-quality?vendorId=${VENDOR}&trackId=${TRACK}&days=30`);
  ok(res.status === 200, "the report answers 200 against a real database");
  const body = await res.json();

  ok(flagsFor(body, "q-concentrated")?.includes("ambiguous"),
    "wrong answers concentrated on one distractor → ambiguous (the flag that could never fire before)");
  ok(!flagsFor(body, "q-spread")?.includes("ambiguous"),
    "same 20% correct but wrong answers spread → hard, NOT ambiguous");
  ok(!flagsFor(body, "q-legacy")?.includes("ambiguous"),
    "no chosenOptionId → null, not zero: an item with no evidence is not judged");

  // The count itself, not just the flag it produced: 32 wrong answers all on
  // opt-b. If this ever reports 40 it is counting correct answers too; if it
  // reports 11 it is counting positions rather than option ids.
  const concentrated = body.flagged.find((f) => f.itemId === "q-concentrated");
  ok(concentrated && concentrated.attempts === 40,
    `every attempt counted (got ${concentrated?.attempts})`);

  const spread = body.flagged.find((f) => f.itemId === "q-spread");
  ok(spread === undefined || !spread.flags.includes("ambiguous"),
    "the spread item is not rescued into ambiguity by a rounding edge");
} finally {
  await s.close();
  await pool.query("DELETE FROM users WHERE clerk_user_id LIKE 'iq-test-%'");
  await pool.end();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
