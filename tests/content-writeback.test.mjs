#!/usr/bin/env node
// PRD-CONTENT-LIFECYCLE — the text write-back plane. Pure units (validate,
// serve-time overlay, overrides cache) + route tests over an ephemeral express
// server with a stateful FAKE pool (no Postgres) — the media.test.mjs idiom.

import { createServer } from "http";
import express from "express";

import { validateDraft, deriveRelPath, MAX_DRAFT_BYTES } from "../server/content/validate.js";
import { applyContentOverride } from "../server/content/overlay.js";
import { createOverridesCache, scopeKey } from "../server/content/overrides-cache.js";
import { registerContentRoutes } from "../server/content/routes.js";
import { createRequireAdmin } from "../server/media/admin.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// ═══════════════════════════════════════════════════ unit — validate ══
console.log("validate (scope shape, byte-fidelity, guards)");
{
  const good = validateDraft({ scopeKind: "domain", vendorId: "anthropic", trackId: "cca-f", domainId: "d1",
    canonical: JSON.stringify({ id: "d1", name: "Agentic Architectures", lessons: [] }) });
  ok(good.ok && good.draft.sha256.length === 64 && good.draft.bytes > 0, "valid domain draft → ok with sha256 + bytes");
  ok(good.draft.relPath === "anthropic/cca-f/d1.json", "relPath derived for a domain scope");
  ok(good.draft.title === undefined && good.draft.payload.name === "Agentic Architectures", "payload parsed (name available)");

  const obj = validateDraft({ scopeKind: "manifest", canonical: { vendors: [] } });
  ok(obj.ok && typeof obj.draft.canonical === "string", "object canonical is stringified once");

  ok(validateDraft({ scopeKind: "nope", canonical: "{}" }).error === "bad_scope_kind", "unknown scope kind → bad_scope_kind");
  ok(validateDraft({ scopeKind: "domain", vendorId: "a", trackId: "b", canonical: "{}" }).error === "scope_shape", "domain missing domainId → scope_shape");
  ok(validateDraft({ scopeKind: "manifest", vendorId: "a", canonical: "{}" }).error === "scope_shape", "singleton with an id → scope_shape");
  ok(validateDraft({ scopeKind: "manifest", canonical: "{ not json" }).error === "canonical_not_json", "invalid JSON → canonical_not_json");
  ok(validateDraft({ scopeKind: "manifest" }).error === "canonical_required", "missing canonical → canonical_required");
  ok(validateDraft({ scopeKind: "manifest", canonical: "[]" }).error === "canonical_not_object", "non-object JSON (array) → canonical_not_object");
  ok(validateDraft({ scopeKind: "domain", vendorId: "a", trackId: "b", domainId: "d1",
    canonical: JSON.stringify({ id: "d2" }) }).error === "id_mismatch", "domain body id != domainId → id_mismatch");
  const big = validateDraft({ scopeKind: "manifest", canonical: JSON.stringify({ x: "z".repeat(MAX_DRAFT_BYTES) }) });
  ok(big.error === "too_large", "over the byte ceiling → too_large");
  ok(deriveRelPath({ scopeKind: "manifest" }) === "manifest.json", "deriveRelPath: manifest singleton");
}

// ═══════════════════════════════════════════════════ unit — overlay ══
console.log("overlay (whole-document swap, fail-soft)");
{
  const base = { id: "d1", name: "Base" };
  const none = applyContentOverride(base, "hbase", null);
  ok(none.body === base && none.hash === "hbase", "no override → base untouched, base hash");

  const ov = applyContentOverride(base, "hbase", { canonical: JSON.stringify({ id: "d1", name: "Draft" }), sha256: "abcdef0123456789" });
  ok(ov.body.name === "Draft" && ov.hash === "hbase-abcdef012345", "override → parsed body + folded ETag");
  ok(ov.body !== base, "override returns a NEW object (immutable, base never mutated)");

  const bad = applyContentOverride(base, "hbase", { canonical: "{ not json", sha256: "x" });
  ok(bad.body === base && bad.hash === "hbase", "malformed draft → base wins (never white-screens)");
}

// ═══════════════════════════════════════════════ unit — overrides cache ══
console.log("overrides cache (scope map, fail-soft)");
{
  ok(scopeKey("domain", "a", "b", "d1") === "domain|a|b|d1", "scopeKey joins the tuple");
  ok(scopeKey("manifest", null, null, null) === "manifest|||", "scopeKey folds NULL ids to empty");

  const rows = [
    { scope_kind: "domain", vendor_id: "anthropic", track_id: "cca-f", domain_id: "d1", canonical: '{"id":"d1"}', sha256: "s1" },
    { scope_kind: "manifest", vendor_id: null, track_id: null, domain_id: null, canonical: '{"vendors":[]}', sha256: "s2" },
  ];
  const cache = createOverridesCache({ pool: { query: async () => ({ rows }) } });
  await cache._loadOnce();
  ok(cache.size() === 2, "cache loaded both approved overrides");
  ok(cache.get("domain", "anthropic", "cca-f", "d1").sha256 === "s1", "get() resolves a domain override");
  ok(cache.get("manifest", null, null, null).sha256 === "s2", "get() resolves a singleton override");
  ok(cache.get("domain", "x", "y", "z") === null, "get() misses → null");

  let calls = 0;
  const flaky = createOverridesCache({ pool: { query: async () => { calls++; if (calls > 1) throw new Error("db down"); return { rows }; } }, logger: { warn() {} } });
  await flaky._loadOnce();
  await flaky.refresh(); // throws internally
  ok(flaky.size() === 2, "refresh error keeps the last-good map (fail-soft)");
}

// ═══════════════════════════════════════════════════ stateful fake pool ══
function fakeStore() {
  const rows = [];
  let seq = 0;
  const nn = (v) => (v == null ? null : v);
  const sameScope = (a, b) => a.scope_kind === b.scope_kind && nn(a.vendor_id) === nn(b.vendor_id) && nn(a.track_id) === nn(b.track_id) && nn(a.domain_id) === nn(b.domain_id);
  const byId = (id) => rows.find((r) => String(r.id) === String(id));
  return {
    rows,
    query: async (sql, args = []) => {
      if (/INSERT INTO content_drafts/i.test(sql)) {
        const [scope_kind, vendor_id, track_id, domain_id, rel_path, canonical, , sha256, bytes, source, note, created_by] = args;
        const cand = { scope_kind, vendor_id, track_id, domain_id };
        if (rows.find((r) => r.status === "pending" && sameScope(r, cand) && r.sha256 === sha256)) return { rows: [] };
        let payload = {}; try { payload = JSON.parse(canonical); } catch { /* validated upstream */ }
        const row = {
          id: ++seq, scope_kind, vendor_id: nn(vendor_id), track_id: nn(track_id), domain_id: nn(domain_id),
          rel_path, canonical, payload, sha256, bytes, status: "pending", source, note: nn(note),
          created_by: nn(created_by), created_at: new Date(1784760000000 + seq * 1000).toISOString(),
          reviewed_by: null, reviewed_at: null, title: payload && payload.name != null ? payload.name : null,
        };
        rows.push(row);
        return { rows: [row] };
      }
      if (/WHERE status = 'pending'[\s\S]*sha256 = \$5/i.test(sql)) {
        const [scope_kind, vendor_id, track_id, domain_id, sha256] = args;
        const r = rows.find((x) => x.status === "pending" && sameScope(x, { scope_kind, vendor_id, track_id, domain_id }) && x.sha256 === sha256);
        return { rows: r ? [r] : [] };
      }
      if (/payload->>'name'/i.test(sql)) {
        const [status, limit] = args;
        let out = rows.slice();
        if (status) out = out.filter((r) => r.status === status);
        out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        return { rows: out.slice(0, limit) };
      }
      if (/SELECT status FROM content_drafts/i.test(sql)) {
        const r = byId(args[0]);
        return { rows: r ? [{ status: r.status }] : [] };
      }
      if (/SELECT \* FROM content_drafts WHERE id = \$1/i.test(sql)) {
        const r = byId(args[0]);
        return { rows: r ? [r] : [] };
      }
      if (/WITH tgt AS/i.test(sql)) { // approve
        const [id, actor] = args;
        const tgt = byId(id);
        if (!tgt || tgt.status !== "pending") return { rows: [] };
        for (const r of rows) if (r.status === "approved" && sameScope(r, tgt)) { r.status = "superseded"; r.reviewed_by = actor; r.reviewed_at = new Date().toISOString(); }
        tgt.status = "approved"; tgt.reviewed_by = actor; tgt.reviewed_at = new Date().toISOString();
        return { rows: [tgt] };
      }
      if (/SET status = 'rejected'/i.test(sql)) { // reject / retire
        const [id, actor] = args;
        const r = byId(id);
        if (!r || (r.status !== "pending" && r.status !== "approved")) return { rows: [] };
        r.status = "rejected"; r.reviewed_by = actor; r.reviewed_at = new Date().toISOString();
        return { rows: [r] };
      }
      return { rows: [] };
    },
  };
}

async function serve(pool) {
  const app = express();
  const requireAdmin = createRequireAdmin({ adminKey: "K", allowlist: new Set(), verifier: null });
  const refreshed = { n: 0 };
  registerContentRoutes(app, { pool, requireAdmin, onChange: () => { refreshed.n++; } });
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const call = (method, path, body, withKey = true) =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { ...(withKey ? { "x-admin-key": "K" } : {}), "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  return { call, refreshed, close: () => new Promise((r) => server.close(r)) };
}

const DOMAIN = (name) => ({ scopeKind: "domain", vendorId: "anthropic", trackId: "cca-f", domainId: "d1",
  canonical: JSON.stringify({ id: "d1", name, lessons: [] }), source: "automatos", note: "daily gen" });

// ═══════════════════════════════════════════════════ routes — write-back ══
console.log("routes: write-back (auth, validate, idempotent)");
{
  const s = await serve(fakeStore());

  let r = await s.call("POST", "/api/admin/content", DOMAIN("v1"), false);
  ok(r.status === 403, "no admin key → 403 (fail-closed)");

  r = await s.call("POST", "/api/admin/content", DOMAIN("v1"));
  let j = await r.json();
  ok(r.status === 201 && j.ok && j.draft.status === "pending" && j.draft.scopeKind === "domain", "valid write-back → 201 pending draft");
  const firstId = j.draft.id;

  r = await s.call("POST", "/api/admin/content", DOMAIN("v1"));
  j = await r.json();
  ok(r.status === 200 && j.deduped && j.draft.id === firstId, "identical re-POST → 200 deduped (same id, no stacking)");

  r = await s.call("POST", "/api/admin/content", { scopeKind: "domain", vendorId: "a", trackId: "b", canonical: "{}" });
  ok(r.status === 400 && (await r.json()).error === "scope_shape", "bad scope → 400 scope_shape");

  r = await s.call("POST", "/api/admin/content", { scopeKind: "manifest", canonical: "{ not json" });
  ok(r.status === 400 && (await r.json()).error === "canonical_not_json", "bad JSON → 400 canonical_not_json");

  await s.close();
}

// ═══════════════════════════════════════════════════ routes — review flow ══
console.log("routes: review (list, get, approve supersedes, reject/retire)");
{
  const store = fakeStore();
  const s = await serve(store);

  const a = await (await s.call("POST", "/api/admin/content", DOMAIN("A"))).json();
  const b = await (await s.call("POST", "/api/admin/content", DOMAIN("B"))).json();
  ok(a.draft.id !== b.draft.id, "two different-content drafts for one scope both queue");

  let r = await s.call("GET", "/api/admin/content/drafts?status=pending");
  let j = await r.json();
  ok(r.status === 200 && j.drafts.length === 2, "list pending → both drafts");
  ok(j.drafts[0].canonical === undefined, "list omits the canonical body (metadata only)");

  r = await s.call("GET", `/api/admin/content/drafts/${a.draft.id}`);
  j = await r.json();
  ok(r.status === 200 && typeof j.draft.canonical === "string" && j.draft.title === "A", "get one → full canonical + title");

  const before = s.refreshed.n;
  r = await s.call("POST", `/api/admin/content/drafts/${a.draft.id}/approve`);
  ok(r.status === 200 && (await r.json()).draft.status === "approved", "approve A → 200 approved");
  ok(s.refreshed.n === before + 1, "approve triggers an overlay refresh (onChange)");

  r = await s.call("POST", `/api/admin/content/drafts/${a.draft.id}/approve`);
  ok(r.status === 409 && (await r.json()).error === "not_pending", "re-approve A → 409 not_pending");

  // Approving B (same scope) supersedes A — one live override per scope.
  r = await s.call("POST", `/api/admin/content/drafts/${b.draft.id}/approve`);
  ok(r.status === 200, "approve B (same scope) → 200");
  ok(store.rows.find((x) => x.id === a.draft.id).status === "superseded", "approving B superseded A (one approved per scope)");

  r = await s.call("GET", "/api/admin/content/drafts?status=approved");
  j = await r.json();
  ok(j.drafts.length === 1 && j.drafts[0].id === b.draft.id, "exactly one approved override (B)");

  // Retire the live override (reject an approved draft) → drops from the overlay.
  r = await s.call("POST", `/api/admin/content/drafts/${b.draft.id}/reject`);
  ok(r.status === 200 && (await r.json()).draft.status === "rejected", "retire B (reject approved) → 200 rejected");
  ok((await (await s.call("GET", "/api/admin/content/drafts?status=approved")).json()).drafts.length === 0, "no live overrides after retire");

  r = await s.call("POST", "/api/admin/content/drafts/9999/approve");
  ok(r.status === 404, "approve unknown id → 404");
  r = await s.call("POST", "/api/admin/content/drafts/9999/reject");
  ok(r.status === 404, "reject unknown id → 404");

  await s.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
