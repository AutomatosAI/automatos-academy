#!/usr/bin/env node
// The tutor proxy names the Academy's origin on the upstream call. The widget
// API denies an ak_pub_ key that arrives with no Origin/Referer (automatos-ai
// orchestrator/api/widgets/auth.py, P2-13), and Node's fetch never adds one —
// so before this, every signed-in learner's question came back 502
// upstream_error. Global fetch is stubbed (it is the proxy's default
// fetchImpl), so nothing leaves the box; route handlers are called directly.
import { mountTutorProxy, tutorConfig, DEFAULT_ORIGIN } from "../server/tutor.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// fetch stub: record what the proxy sends, answer 403 the way the platform
// does when it refuses the key — the handler then takes the refund path and
// never needs a real stream.
const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), headers: new Headers(init.headers) });
  return { ok: false, status: 403, body: null };
};

const pool = { query: async (sql) => (sql.startsWith("INSERT INTO tutor_usage") ? { rows: [{ count: 1 }] } : { rows: [] }) };

// minimal express stand-in: keep each route's final handler
function mount(env) {
  const routes = {};
  const app = {
    get: (path, ...h) => { routes[`GET ${path}`] = h[h.length - 1]; },
    post: (path, ...h) => { routes[`POST ${path}`] = h[h.length - 1]; },
  };
  const mounted = mountTutorProxy(app, { pool, auth: (_q, _s, next) => next(), env });
  return { routes, mounted };
}

async function ask(env) {
  const { routes } = mount(env);
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  calls.length = 0;
  await routes["POST /api/tutor/chat"]({ spineUser: { id: "u1" }, body: { message: "what is MCP?" } }, res);
  return { res, call: calls[0] };
}

const base = { ACADEMY_CHAT_API_BASE: "https://api.example.test/", ACADEMY_CHAT_PUBLIC_KEY: "ak_pub_test" };

// default: no ACADEMY_CHAT_ORIGIN set (today's Railway env)
let { res, call } = await ask(base);
ok(!!call, "the proxy calls global fetch when no fetchImpl is injected");
ok(call && call.url === "https://api.example.test/api/widgets/chat", "upstream is the widget chat endpoint");
ok(call && call.headers.get("origin") === "https://academy.automatos.app", "Origin defaults to https://academy.automatos.app");
ok(call && call.headers.get("referer") === "https://academy.automatos.app/", "Referer carries the same origin");
ok(call && call.headers.get("authorization") === "Bearer ak_pub_test", "the public key still rides Authorization");
ok(res.statusCode === 502 && res.body.error === "upstream_error" && res.body.status === 403, "a platform 403 still surfaces as 502 upstream_error (status 403)");

// override: reduced to a bare origin (path and trailing slash dropped)
({ call } = await ask({ ...base, ACADEMY_CHAT_ORIGIN: "https://academy-staging.up.railway.app/tutor/" }));
ok(call && call.headers.get("origin") === "https://academy-staging.up.railway.app", "ACADEMY_CHAT_ORIGIN overrides, reduced to scheme://host");
ok(call && call.headers.get("referer") === "https://academy-staging.up.railway.app/", "Referer follows the override");

// a port survives; a scheme-less or non-http value falls back to the default
ok(tutorConfig({ ACADEMY_CHAT_ORIGIN: "http://localhost:4321" }).origin === "http://localhost:4321", "dev origin keeps its port");
ok(tutorConfig({ ACADEMY_CHAT_ORIGIN: "academy.automatos.app" }).origin === DEFAULT_ORIGIN, "scheme-less value → default (warned)");
ok(tutorConfig({ ACADEMY_CHAT_ORIGIN: "javascript:alert(1)" }).origin === DEFAULT_ORIGIN, "non-http(s) value → default (warned)");
ok(tutorConfig({}).origin === DEFAULT_ORIGIN, "tutorConfig exposes the default origin");
ok(mount(base).mounted.origin === DEFAULT_ORIGIN, "mountTutorProxy reports the origin for the boot log");

globalThis.fetch = realFetch;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
