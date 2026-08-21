#!/usr/bin/env node
// LX-5 — the funnel receiver: allowlist, caps, and the admin summary shape.
// Express app with a stubbed pool — no Postgres needed.
import express from "express";
import { createServer } from "http";
import { mountFunnelEvents } from "../server/events.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const inserts = [];
const pool = {
  query: async (sql, params) => {
    if (sql.startsWith("INSERT")) { inserts.push(params); return { rows: [] }; }
    return { rows: [
      { event: "page_view", n: 100, sessions: 60 },
      { event: "track_start", n: 30, sessions: 25 },
      { event: "first_question_answered", n: 12, sessions: 12 },
    ] };
  },
};
const auth = (_req, _res, next) => next();
const requireRole = () => (_req, _res, next) => next();

const app = express();
mountFunnelEvents(app, { pool, auth, requireRole });
const server = createServer(app);
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (body) => fetch(`${base}/api/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

let r = await post({ event: "page_view", path: "/t/github/gh-500", session: "abc", at: Date.now(), props: { a: 1 } });
ok(r.status === 204, "good event → 204");
ok(inserts.length === 1 && inserts[0][0] === "page_view", "row inserted with the event name");

r = await post({ event: "not_a_thing" });
ok(r.status === 400, "unknown event → 400 (allowlist)");

r = await post({ event: "lesson_opened", props: { pad: "x".repeat(4000) } });
ok(r.status === 204 && JSON.parse(inserts[1] ? "1" : "1"), "oversized props accepted but stripped");
ok(inserts[1] && inserts[1][4] === "{}", "props over 2KB stored as {}");

r = await post({ event: "signed_in", session: "s".repeat(200) });
ok(inserts[2] && inserts[2][3].length === 64, "session capped at 64 chars");

r = await fetch(`${base}/api/admin/funnel?days=7`);
const body = await r.json();
ok(r.status === 200 && body.days === 7, "admin summary answers");
ok(Array.isArray(body.steps) && body.steps[0].step === "page_view" && body.steps[0].count === 100, "steps in funnel order with counts");
ok(body.steps.find((s) => s.step === "signed_in").count === 0, "missing steps report zero, not absent");

server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
