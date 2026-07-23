#!/usr/bin/env node
// PRD-WAVE-CONTENT-OPS C3 PR2 — the serve-time overlay: a bound slot renders
// published, the source index is never mutated, the ETag busts on change, and
// the bindings cache is fail-soft. Pure units + a catalog-router render over a
// fake index + fake bindings getter (no Postgres).

import { createServer } from "http";
import express from "express";

import { overlayTrackVideos } from "../server/media/overlay.js";
import { createBindingsCache } from "../server/media/bindings-cache.js";
import { createCatalogRouter } from "../server/catalog.js";

let pass = 0,
  fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const CDN = "https://widgets.automatos.app";

// ═══════════════════════════════════════════════════ overlay (pure) ══
console.log("overlayTrackVideos");
const track = {
  name: "CCA-F",
  videos: [
    { id: "v-d1-1", title: "One", status: "placeholder", url: "" },
    { id: "v-ov-1", title: "Two", status: "published", url: `${CDN}/academy/x/videos/v-ov-1.mp4` },
  ],
};
const bySlot = new Map([["v-d1-1:video", { url: `${CDN}/academy/anthropic/cca-f/v-d1-1-a.mp4` }]]);
const overlaid = overlayTrackVideos(track, bySlot);
ok(overlaid.videos[0].status === "published" && overlaid.videos[0].url.endsWith("v-d1-1-a.mp4"), "bound placeholder becomes published with the CDN url");
ok(overlaid.videos[1].url === track.videos[1].url, "an already-published slot is left alone");
ok(track.videos[0].status === "placeholder" && overlaid !== track, "the SOURCE track is never mutated (immutable)");
ok(overlayTrackVideos(track, null) === track, "no bindings → same object (no work)");
ok(overlayTrackVideos({ name: "x" }, bySlot).name === "x", "a track with no videos is returned untouched");

// ═══════════════════════════════════════════════════ bindings cache ══
console.log("createBindingsCache (poll map + version + fail-soft)");
function fakePool(rowsOrThrow) {
  return {
    query: async () => {
      if (rowsOrThrow instanceof Error) throw rowsOrThrow;
      return { rows: rowsOrThrow };
    },
  };
}
{
  const cache = createBindingsCache({
    pool: fakePool([
      { vendor_id: "anthropic", track_id: "cca-f", slot_id: "v-d1-1", kind: "video", url: `${CDN}/academy/anthropic/cca-f/v-d1-1-a.mp4`, content_type: "video/mp4", size_bytes: 10 },
    ]),
  });
  await cache._loadOnce();
  const e = cache.get("anthropic", "cca-f");
  ok(e && e.bySlot.get("v-d1-1:video").url.endsWith("v-d1-1-a.mp4"), "loads a binding into the track map");
  ok(typeof e.version === "string" && e.version.length === 12, "each track carries a 12-char bindings version");
  ok(cache.get("nope", "x") === null, "unknown track → null");
}
{
  // version changes when the url changes (ETag correctness)
  const v1 = createBindingsCache({ pool: fakePool([{ vendor_id: "a", track_id: "t", slot_id: "s", kind: "video", url: "u1", content_type: null, size_bytes: null }]) });
  await v1._loadOnce();
  const v2 = createBindingsCache({ pool: fakePool([{ vendor_id: "a", track_id: "t", slot_id: "s", kind: "video", url: "u2", content_type: null, size_bytes: null }]) });
  await v2._loadOnce();
  ok(v1.get("a", "t").version !== v2.get("a", "t").version, "a changed url yields a new version (ETag busts)");
}
{
  // fail-soft: a query error keeps the last-good map, never throws
  const cache = createBindingsCache({ pool: fakePool([{ vendor_id: "a", track_id: "t", slot_id: "s", kind: "video", url: "u", content_type: null, size_bytes: null }]), logger: { warn() {} } });
  await cache._loadOnce();
  cache.pool = fakePool(new Error("db down"));
  let threw = false;
  const broken = createBindingsCache({ pool: fakePool(new Error("db down")), logger: { warn() {} } });
  try {
    await broken.refresh();
  } catch {
    threw = true;
  }
  ok(!threw && broken.get("a", "t") === null, "refresh() swallows a db error (fail-soft, empty stays empty)");
}

// ═══════════════════════════════════════════════════ router overlay ══
console.log("catalog router serves the overlay + a binding-busted ETag");
const idx = {
  contentVersion: "v1",
  generatedAt: "t",
  tracks: new Map([["anthropic/cca-f", { track: { data: JSON.parse(JSON.stringify(track)), hash: "htrack" } }]]),
};
async function serveWith(getBindings) {
  const app = express();
  app.use("/api/catalog", createCatalogRouter(idx, { getBindings }));
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  return {
    get: (p) => fetch(`http://127.0.0.1:${port}${p}`),
    close: () => new Promise((r) => server.close(r)),
  };
}
{
  const none = await serveWith(() => null);
  let r = await none.get("/api/catalog/anthropic/cca-f");
  let body = await r.json();
  const etagNoBind = r.headers.get("etag");
  ok(body.videos[0].status === "placeholder", "no binding → placeholder still placeholder");
  await none.close();

  const bound = await serveWith((v, t) =>
    v === "anthropic" && t === "cca-f" ? { bySlot, version: "abc123def456" } : null,
  );
  r = await bound.get("/api/catalog/anthropic/cca-f");
  body = await r.json();
  ok(body.videos[0].status === "published" && body.videos[0].url.endsWith("v-d1-1-a.mp4"), "with a binding → the served track shows it published");
  ok(r.headers.get("etag") !== etagNoBind, "the ETag differs once bound (cache busts)");
  await bound.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
