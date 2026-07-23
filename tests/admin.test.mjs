#!/usr/bin/env node
// PRD-ADMIN-CONSOLE S2/S3/S4 — users/progress routes over a fake pool + fake
// auth, and the billing pure core (signature, plan mapping, event → DB). No
// Postgres, no Stripe. (The migration + real bootstrap run in the CI spine job.)

import { createServer } from "http";
import crypto from "node:crypto";
import express from "express";

import { createUsersRouter } from "../server/admin/users.js";
import { createAuditor } from "../server/admin/audit.js";
import { verifyStripeSig, planForSubscription, handleStripeEvent } from "../server/admin/billing.js";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.error("  ✗ " + m)));

const miniIndex = { paths: { data: { paths: [] } }, tracks: new Map() };
const USER = { id: "u-1", clerk_user_id: "user_alice", workspace_id: "w-1", plan: "free", role: "learner", created_at: new Date("2026-01-01") };

function fakePool(state = {}) {
  const calls = [];
  const query = async (sql, args) => {
    const s = sql.replace(/\s+/g, " ").trim();
    calls.push({ s: s.slice(0, 48), args });
    if (/count\(\*\)::int AS n FROM users/.test(s)) return { rows: [{ n: state.total ?? 1 }] };
    if (/FROM users .*LIMIT/.test(s)) return { rows: state.list ?? [USER] };
    if (/FROM users WHERE id = \$1/.test(s)) return { rows: state.user === null ? [] : [state.user || USER] };
    if (/count\(\*\)::int AS n FROM (progress|mock_attempts)/.test(s)) return { rows: [{ n: 3 }] };
    if (/^UPDATE users SET/.test(s)) return { rows: state.user === null ? [] : [{ ...(state.user || USER), ...state.updated }] };
    if (/SELECT clerk_user_id FROM users/.test(s)) return { rows: state.user === null ? [] : [{ clerk_user_id: (state.user || USER).clerk_user_id }] };
    if (/UPDATE subscriptions SET .*RETURNING user_id/.test(s)) return { rows: state.subUser ? [{ user_id: state.subUser }] : [] };
    if (/WITH days|mastery_map|FROM progress WHERE user_id|FROM mock_attempts WHERE user_id/.test(s)) {
      return /WITH days/.test(s) ? { rows: [{ current: 1, best: 3 }] } : { rows: [] };
    }
    return { rows: [] };
  };
  const connect = async () => ({ query: async () => ({ rowCount: 1 }), release() {} });
  return { calls, query, connect };
}

// Mount the users router behind a test middleware that injects req.spineUser.
async function serveUsers({ pool, actorRole = "admin" }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.spineUser = { id: "admin-1", clerk_user_id: "user_admin", role: actorRole }; next(); });
  app.use("/api/admin/users", createUsersRouter({ pool, index: miniIndex, audit: createAuditor(pool, { warn() {} }), clerkUserDeleter: async () => {} }));
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  return {
    call: (m, p, b) => fetch(`http://127.0.0.1:${port}${p}`, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json() })),
    close: () => new Promise((r) => server.close(r)),
  };
}

// ═══════════════════════════════════════════════════ users routes ══
console.log("users routes (list/get/patch/delete over a fake pool)");
{
  const s = await serveUsers({ pool: fakePool({ updated: { plan: "pro" } }) });
  let r = await s.call("GET", "/api/admin/users?q=ali&limit=10");
  ok(r.status === 200 && r.body.data.users.length === 1 && r.body.data.total === 1, "list returns users + total");
  ok(r.body.data.users[0].clerkUserId === "user_alice" && r.body.data.users[0].role === "learner", "user wire shape (camelCase, role)");

  r = await s.call("GET", "/api/admin/users/u-1");
  ok(r.status === 200 && r.body.data.counts.progress === 3, "get one user + activity counts");

  r = await s.call("PATCH", "/api/admin/users/u-1", { plan: "pro" });
  ok(r.status === 200 && r.body.data.user.plan === "pro", "admin can change plan");
  await s.close();
}
console.log("users routes — the guards");
{
  // an ADMIN (not owner) may NOT change roles
  const adminOnly = await serveUsers({ pool: fakePool(), actorRole: "admin" });
  let r = await adminOnly.call("PATCH", "/api/admin/users/u-1", { role: "admin" });
  ok(r.status === 403 && r.body.error === "owner_only_role_change", "admin cannot change roles (owner-only)");
  await adminOnly.close();

  const owner = await serveUsers({ pool: fakePool(), actorRole: "owner" });
  r = await owner.call("PATCH", "/api/admin/users/u-1", { role: "admin" });
  ok(r.status === 200 && r.body.data.user, "owner CAN change roles");
  r = await owner.call("PATCH", "/api/admin/users/u-1", { role: "wizard" });
  ok(r.status === 400 && r.body.error === "bad_role", "an invalid role → 400");
  await owner.close();

  const s = await serveUsers({ pool: fakePool() });
  r = await s.call("DELETE", "/api/admin/users/admin-1");
  ok(r.status === 400 && r.body.error === "use_self_service_delete", "an admin can't delete themselves via the admin route");
  r = await s.call("DELETE", "/api/admin/users/u-1");
  ok(r.status === 200 && r.body.data.clerkDeleted === true, "delete wipes rows + the clerk identity, audited");
  const missing = await serveUsers({ pool: fakePool({ user: null }) });
  r = await missing.call("GET", "/api/admin/users/nope");
  ok(r.status === 404 && r.body.error === "user_not_found", "unknown user → 404");
  await s.close(); await missing.close();
}

// ═══════════════════════════════════════════════════ billing core ══
console.log("billing — signature, plan mapping, event → DB");
{
  const secret = "whsec_test";
  const body = JSON.stringify({ type: "x" });
  const t = 1_000_000;
  const good = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  ok(verifyStripeSig(body, `t=${t},v1=${good}`, secret, { nowSec: t + 10 }), "a correctly-signed webhook verifies");
  ok(!verifyStripeSig(body + "x", `t=${t},v1=${good}`, secret, { nowSec: t + 10 }), "a tampered body fails");
  ok(!verifyStripeSig(body, `t=${t},v1=${good}`, secret, { nowSec: t + 10_000 }), "an old timestamp fails (replay window)");
  ok(!verifyStripeSig(body, "garbage", secret), "a malformed signature header fails");
}
{
  ok(planForSubscription("active") === "pro" && planForSubscription("trialing") === "pro", "active/trialing → pro");
  ok(planForSubscription("canceled") === "free" && planForSubscription("past_due") === "free", "canceled/past_due → free");
}
{
  const pool = fakePool({ subUser: "u-9" });
  const co = await handleStripeEvent(pool, { type: "checkout.session.completed", data: { object: { client_reference_id: "u-1", customer: "cus_1", subscription: "sub_1" } } });
  ok(co.userId === "u-1" && co.plan === "pro" && pool.calls.some((c) => /UPDATE users SET plan = 'pro'/.test(c.s) || /^UPDATE users SET plan/.test(c.s)), "checkout.session.completed → plan pro + subscription upsert");
  const del = await handleStripeEvent(pool, { type: "customer.subscription.deleted", data: { object: { customer: "cus_1", id: "sub_1" } } });
  ok(del.userId === "u-9" && del.plan === "free", "subscription.deleted → the mapped user goes free");
  const ig = await handleStripeEvent(pool, { type: "invoice.paid", data: { object: {} } });
  ok(ig.handled === null && ig.ignored === "invoice.paid", "an unhandled event type is ignored, not errored");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
