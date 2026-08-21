#!/usr/bin/env node
// LX-15 — the tutor proxy: quota counting, the 429 boundary, refund on
// upstream failure, the allowance shape. Stubbed pool + stubbed upstream.
import express from "express";
import { createServer } from "http";
import { mountTutorProxy, tutorConfig } from "../server/tutor.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// upstream stub: SSE for good requests, 500 when the message says so
const upstream = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const msg = JSON.parse(body).message;
    if (msg === "boom") { res.writeHead(500); return res.end("nope"); }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.end('event: message\ndata: {"content":"hi"}\n\n');
  });
});
await new Promise((r) => upstream.listen(0, r));
const upstreamBase = `http://127.0.0.1:${upstream.address().port}`;

// pool stub with real counting semantics
const usage = new Map();
const key = (p) => `${p[0]}|${p[1]}`;
const pool = {
  query: async (sql, params) => {
    if (sql.startsWith("INSERT INTO tutor_usage")) {
      const k = key(params); const n = (usage.get(k) || 0) + 1; usage.set(k, n);
      return { rows: [{ count: n }] };
    }
    if (sql.startsWith("UPDATE tutor_usage SET count = GREATEST")) {
      const k = key(params); usage.set(k, Math.max((usage.get(k) || 0) - 1, 0));
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE tutor_usage SET count = $3")) {
      usage.set(key(params), params[2]); return { rows: [] };
    }
    if (sql.startsWith("SELECT count")) {
      return { rows: usage.has(key(params)) ? [{ count: usage.get(key(params)) }] : [] };
    }
    return { rows: [] };
  },
};
const auth = (req, _res, next) => { req.spineUser = { id: "00000000-0000-4000-8000-000000000001" }; next(); };

const app = express();
app.use(express.json());
mountTutorProxy(app, { pool, auth, env: { TUTOR_DAILY_LIMIT: "3", ACADEMY_CHAT_API_BASE: upstreamBase, ACADEMY_CHAT_PUBLIC_KEY: "k" } });
const server = createServer(app);
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const chat = (message) => fetch(`${base}/api/tutor/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });

ok(tutorConfig({}).limit === 10, "default limit is 10/day (D-LX5)");
ok(tutorConfig({ TUTOR_DAILY_LIMIT: "25" }).limit === 25, "env override works");

let r = await chat("hello");
ok(r.status === 200 && r.headers.get("x-tutor-remaining") === "2", "first question streams, remaining=2");
ok((await r.text()).includes("hi"), "SSE body passes through");

await chat("two"); await chat("three");
r = await chat("four");
ok(r.status === 429, "question 4 of 3 → 429");
const q = await r.json();
ok(q.error === "quota" && q.limit === 3 && typeof q.resetsAt === "string", "429 names the limit and the reset");

let a = await (await fetch(`${base}/api/tutor/allowance`)).json();
ok(a.used === 3 && a.remaining === 0 && a.limit === 3, "allowance shows used=3 remaining=0 (over-limit rolled back)");

// fresh day fresh user: refund on upstream failure
usage.clear();
r = await chat("boom");
ok(r.status === 502, "upstream 500 → 502 to the client");
a = await (await fetch(`${base}/api/tutor/allowance`)).json();
ok(a.used === 0, "a question no model saw costs nothing (refunded)");

r = await fetch(`${base}/api/tutor/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "" }) });
ok(r.status === 400, "empty message → 400");

server.close(); upstream.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
