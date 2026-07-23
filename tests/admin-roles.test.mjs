#!/usr/bin/env node
// PRD-ADMIN-CONSOLE S1 — the RBAC gate. Pure: requireRole + ROLE_RANK, no DB.
// (The owner-bootstrap-on-sign-in path is covered against real Postgres in
// tests/spine.test.mjs, which runs in the CI spine job.)

import { requireRole, ROLE_RANK } from "../server/spine/auth.js";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.error("  ✗ " + m)));

// Drive the middleware with a fake req/res; requireRole is synchronous.
function run(mw, role) {
  let status = 0, nexted = false;
  const req = { spineUser: role === undefined ? undefined : { role } };
  const res = { status: (c) => ((status = c), res), json: () => res };
  mw(req, res, () => { nexted = true; });
  return { status, nexted };
}

console.log("ROLE_RANK");
ok(ROLE_RANK.owner > ROLE_RANK.admin && ROLE_RANK.admin > ROLE_RANK.learner, "owner > admin > learner");

console.log("requireRole('admin')");
const admin = requireRole("admin");
ok(run(admin, "owner").nexted, "owner passes an admin gate");
ok(run(admin, "admin").nexted, "admin passes an admin gate");
ok(run(admin, "learner").status === 403 && !run(admin, "learner").nexted, "learner → 403");
ok(run(admin, undefined).status === 403, "no spineUser (unauth) → 403, fail-closed");
ok(run(admin, "banana").status === 403, "unknown role → 403, fail-closed");

console.log("requireRole('owner')");
const owner = requireRole("owner");
ok(run(owner, "owner").nexted, "owner passes an owner gate");
ok(run(owner, "admin").status === 403, "admin does NOT pass an owner gate");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
