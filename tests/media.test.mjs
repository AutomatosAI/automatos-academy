#!/usr/bin/env node
// PRD-WAVE-CONTENT-OPS C3+C6 — the media admin plane + inventory. Pure units
// (validate, inventory, admin gate) plus route tests over an ephemeral express
// server with FAKE pool + s3 (no Postgres, no AWS) — the digest.test.mjs idiom.

import { createServer } from "http";
import express from "express";

import {
  validatePresign,
  mediaKey,
  sanitizeFilename,
  MEDIA_RULES,
} from "../server/media/validate.js";
import { buildInventory } from "../server/media/inventory.js";
import { createRequireAdmin, parseAllowlist } from "../server/media/admin.js";
import { registerMediaRoutes } from "../server/media/routes.js";

let pass = 0,
  fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const CDN = "https://widgets.automatos.app";

// A mini served index — the buildContentIndex shape (tracks Map → {track,domains}).
const miniIndex = () => ({
  contentVersion: "v_test",
  generatedAt: "2026-07-23T00:00:00Z",
  tracks: new Map([
    [
      "anthropic/cca-f",
      {
        track: {
          data: {
            name: "Claude Certified Architect",
            videos: [
              { id: "v-d1-1", title: "Agentic architectures", status: "placeholder", url: "" },
              { id: "v-ov-1", title: "Overview", status: "published", url: `${CDN}/academy/anthropic/videos/v-ov-1.mp4` },
            ],
          },
          hash: "htrack",
        },
        domains: new Map([
          [
            "d1",
            {
              data: {
                name: "Agentic Architectures",
                lessons: [{ id: "l1", title: "The loop" }],
                questions: [{ id: "q1", stem: "Which statement best captures…" }],
                scenarios: [{ id: "s1", title: "Design a coordinator" }],
                videos: [{ id: "v-dom-1", title: "A domain lesson video", status: "placeholder", url: "" }],
              },
              hash: "hd1",
            },
          ],
        ]),
      },
    ],
  ]),
});

// ═══════════════════════════════════════════════════ unit — validate ══
console.log("validate (presign guards + key locking)");
ok(sanitizeFilename("../../etc/passwd").indexOf("/") === -1, "sanitizeFilename strips path separators");
ok(sanitizeFilename("d1 acing!.mp4") === "d1_acing_.mp4", "sanitizeFilename keeps a safe basename");
ok(
  mediaKey({ vendorId: "anthropic", trackId: "cca-f", slotId: "v-d1-1", filename: "x.mp4" }) ===
    "academy/anthropic/cca-f/v-d1-1-x.mp4",
  "mediaKey is locked under academy/<vendor>/<track>/",
);

const good = validatePresign(
  { vendor: "anthropic", track: "cca-f", slotId: "v-d1-1", kind: "video", filename: "a.mp4", contentType: "video/mp4" },
  { cdnBase: CDN },
);
ok(good.ok && good.url === `${CDN}/academy/anthropic/cca-f/v-d1-1-a.mp4`, "valid video presign resolves the CDN url");
ok(validatePresign({ kind: "gif" }, { cdnBase: CDN }).error === "bad_kind", "unknown kind → bad_kind");
ok(
  validatePresign({ vendor: "an", track: "cca-f", slotId: "s", kind: "video", contentType: "text/plain" }, { cdnBase: CDN }).error ===
    "bad_content_type",
  "wrong content-type → bad_content_type",
);
ok(
  validatePresign({ vendor: "bad vendor", track: "cca-f", slotId: "s", kind: "video", contentType: "video/mp4" }, { cdnBase: CDN })
    .error === "bad_slot_ref",
  "malformed vendor → bad_slot_ref",
);
ok(MEDIA_RULES.audio.types.includes("audio/mpeg"), "audio kind allows mp3");

// ═══════════════════════════════════════════════════ unit — inventory ══
console.log("inventory (C6 — what exists, with hashes)");
const inv = buildInventory(miniIndex());
const scope = (s) => inv.items.filter((i) => i.scope === s);
ok(inv.contentVersion === "v_test", "inventory carries the content version");
ok(scope("track").length === 1 && scope("track")[0].hash === "htrack", "track item present with its hash");
ok(scope("video-slot").length === 2, "both video slots inventoried");
ok(scope("video-slot").find((v) => v.id === "v-d1-1").status === "placeholder", "placeholder status surfaced");
ok(scope("lesson").length === 1 && scope("question").length === 1 && scope("scenario").length === 1, "lesson/question/scenario inventoried");
ok(scope("question")[0].hash === "hd1", "question carries its domain hash (change-detection unit)");

// ═══════════════════════════════════════════════════ unit — admin gate ══
console.log("admin gate (machine key + clerk allowlist, fail-closed)");
const runGate = async (mw, headers) => {
  let status = 0,
    nexted = false;
  const req = { headers };
  const res = { status: (c) => ((status = c), res), json: () => res };
  await new Promise((resolve) => mw(req, res, () => ((nexted = true), resolve())) ?? resolve());
  await new Promise((r) => setTimeout(r, 0));
  return { status, nexted, actor: req.adminActor };
};
const verifier = async (t) => (t === "goodtoken" ? { sub: "user_admin1" } : null);
const gate = createRequireAdmin({ adminKey: "SEKRIT", allowlist: parseAllowlist("user_admin1, user_admin2"), verifier });

ok((await runGate(gate, { "x-admin-key": "SEKRIT" })).nexted, "correct X-Admin-Key passes (machine)");
ok((await runGate(gate, { "x-admin-key": "wrong" })).status === 403, "wrong X-Admin-Key → 403");
ok((await runGate(gate, { authorization: "Bearer goodtoken" })).actor === "user_admin1", "allow-listed clerk token passes (browser)");
ok((await runGate(gate, { authorization: "Bearer goodtoken-but-unknown" })).status === 403, "non-allow-listed clerk token → 403");
ok((await runGate(gate, {})).status === 403, "no credentials → 403 (fail-closed)");
ok((await runGate(gate, { "x-admin-key": "SEKRIT-longer" })).status === 403, "length-mismatched key → 403, no throw (timing-safe)");

// ═══════════════════════════════════════════════════ routes (ephemeral) ══
console.log("routes (presign/bind/slots over a fake pool + s3)");

function fakePool(overrides = {}) {
  const calls = [];
  return {
    calls,
    query: async (sql, args) => {
      calls.push({ sql: sql.trim().split(/\s+/)[0], args });
      if (/^SELECT/i.test(sql)) return { rows: overrides.list || [] };
      if (/^INSERT/i.test(sql))
        return { rows: [{ vendor_id: args[0], track_id: args[1], slot_id: args[2], kind: args[3], url: args[4] }] };
      return { rows: [] };
    },
  };
}
const fakeS3 = (headExists = true) => ({
  bucket: "b",
  presignPut: async (key) => `https://s3.example/${key}?sig=x`,
  headObject: async () => (headExists ? { exists: true, size: 42, contentType: "video/mp4" } : { exists: false }),
});

async function serve({ pool, s3 }) {
  const app = express();
  const requireAdmin = createRequireAdmin({ adminKey: "K", allowlist: new Set(), verifier: null });
  registerMediaRoutes(app, { pool, requireAdmin, s3, cdnBase: CDN, getIndex: miniIndex });
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const call = (method, path, body) =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { "x-admin-key": "K", "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  return { call, close: () => new Promise((r) => server.close(r)) };
}

{
  const pool = fakePool({ list: [{ slot_id: "v-d1-1", kind: "video", url: `${CDN}/academy/anthropic/cca-f/v-d1-1-a.mp4` }] });
  const s = await serve({ pool, s3: fakeS3(true) });

  let r = await s.call("GET", "/api/admin/media/slots?vendor=anthropic&track=cca-f");
  let j = await r.json();
  ok(r.status === 200 && j.slots.find((x) => x.slotId === "v-d1-1").state === "bound", "slots: a bound placeholder reads 'bound'");
  ok(j.slots.find((x) => x.slotId === "v-ov-1").state === "published", "slots: a git-published slot reads 'published'");

  r = await s.call("GET", "/api/admin/media/slots?vendor=nope&track=x");
  ok(r.status === 404, "slots: unknown track → 404");

  r = await s.call("POST", "/api/admin/media/presign", {
    vendor: "anthropic", track: "cca-f", slotId: "v-d1-1", kind: "video", filename: "a.mp4", contentType: "video/mp4",
  });
  j = await r.json();
  ok(r.status === 200 && j.putUrl.startsWith("https://s3.example/") && j.finalUrl === `${CDN}/academy/anthropic/cca-f/v-d1-1-a.mp4`, "presign: valid → putUrl + CDN finalUrl");

  r = await s.call("POST", "/api/admin/media/presign", {
    vendor: "anthropic", track: "cca-f", slotId: "v-nope", kind: "video", filename: "a.mp4", contentType: "video/mp4",
  });
  ok(r.status === 404 && (await r.json()).error === "unknown_slot", "presign: unknown video slot → 404 unknown_slot");

  // PRD-MEDIA-DOMAIN-SLOTS: a DOMAIN-only slot (v-dom-1, defined in d1's videos[]
  // not track.json) is now accepted — it 404'd before the plane knew domains.
  r = await s.call("POST", "/api/admin/media/presign", {
    vendor: "anthropic", track: "cca-f", slotId: "v-dom-1", kind: "video", filename: "d.mp4", contentType: "video/mp4",
  });
  ok(r.status === 200 && (await r.json()).finalUrl === `${CDN}/academy/anthropic/cca-f/v-dom-1-d.mp4`, "presign: a DOMAIN video slot is accepted");

  r = await s.call("POST", "/api/admin/media/bind", {
    vendor: "anthropic", track: "cca-f", slotId: "v-d1-1", kind: "video", url: `${CDN}/academy/anthropic/cca-f/v-d1-1-a.mp4`,
  });
  j = await r.json();
  ok(r.status === 200 && j.ok && pool.calls.some((c) => c.sql === "INSERT"), "bind: verified object → upsert");

  r = await s.call("POST", "/api/admin/media/bind", {
    vendor: "anthropic", track: "cca-f", slotId: "v-d1-1", kind: "video", url: "https://evil.example/x.mp4",
  });
  ok(r.status === 400 && (await r.json()).error === "url_off_cdn", "bind: url off our CDN → 400");

  await s.close();
}
{
  const s = await serve({ pool: fakePool(), s3: fakeS3(false) });
  const r = await s.call("POST", "/api/admin/media/bind", {
    vendor: "anthropic", track: "cca-f", slotId: "v-d1-1", kind: "video", url: `${CDN}/academy/anthropic/cca-f/v-d1-1-a.mp4`,
  });
  ok(r.status === 409 && (await r.json()).error === "object_missing", "bind: object not on S3 → 409 (upload before binding)");
  await s.close();
}
{
  const s = await serve({ pool: fakePool(), s3: null });
  const r = await s.call("POST", "/api/admin/media/presign", {
    vendor: "anthropic", track: "cca-f", slotId: "v-d1-1", kind: "video", filename: "a.mp4", contentType: "video/mp4",
  });
  ok(r.status === 503 && (await r.json()).error === "not_configured", "presign: S3 unconfigured → 503 not_configured");
  await s.close();
}

// The browser admin UI (public/js/admin/media.js) probes this to decide whether
// to render Upload affordances. 200 ⇒ show; 403 ⇒ hide. serve()'s call helper
// always sends the key, so mount directly to exercise the keyless (403) path.
console.log("session probe (browser admin identity)");
{
  const app = express();
  const requireAdmin = createRequireAdmin({ adminKey: "K", allowlist: new Set(), verifier: null });
  registerMediaRoutes(app, { pool: fakePool(), requireAdmin, s3: fakeS3(true), cdnBase: CDN, getIndex: miniIndex });
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const hit = (headers) => fetch(`http://127.0.0.1:${port}/api/admin/media/session`, { headers });

  let r = await hit({ "x-admin-key": "K" });
  const j = await r.json();
  ok(r.status === 200 && j.admin === true && j.actor === "machine", "session: valid admin → {admin:true, actor}");

  r = await hit({});
  ok(r.status === 403, "session: no credentials → 403 (affordances hidden)");

  await new Promise((r2) => server.close(r2));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
