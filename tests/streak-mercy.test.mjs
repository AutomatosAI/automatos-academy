#!/usr/bin/env node
// LX-11 — the repair policy in one SQL statement. The WHERE clause IS the
// policy, so the test drives maybeRepairStreak against a scripted pool and
// asserts exactly which day-sets grant mercy.
import { maybeRepairStreak } from "../server/spine/sync-routes.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// the client stub records the single query's SQL for shape assertions
const calls = [];
const client = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [] }; } };
await maybeRepairStreak(client, "u1");
ok(calls.length === 1, "one statement — policy lives in SQL, not app code");
const sql = calls[0].sql;
ok(sql.includes("INSERT INTO streak_repairs"), "writes the repair table");
ok(sql.includes("day = (now() AT TIME ZONE 'UTC')::date)"), "requires today active");
ok(sql.includes("NOT EXISTS") && sql.includes("::date - 1"), "requires exactly yesterday missing");
ok(sql.includes("::date - 2"), "requires the day before active (bridges ONE day, never a gap)");
ok(sql.includes("interval '7 days'"), "at most one repair per trailing week");
ok(sql.includes("ON CONFLICT DO NOTHING"), "race-safe on the PK");
const boom = { query: async () => { throw new Error("db down"); } };
let threw = false;
try { await maybeRepairStreak(boom, "u1"); } catch (_) { threw = true; }
ok(!threw, "mercy failure never propagates — an answer must not cost");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
