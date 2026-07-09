#!/usr/bin/env node
// Contract tests for the Content API v1 (PRD-MT-01), run against the real
// content files — the proof that the served shapes ARE the file shapes
// (CONTENT-API-CONTRACT.md §6: the future DB-backed v2 must keep these green).
import { readFileSync, rmSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { isDeepStrictEqual } from "util";
import express from "express";
import { buildContentIndex, createCatalogRouter, computeChanges } from "../server/catalog.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "public", "content");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const scratch = mkdtempSync(join(tmpdir(), "catalog-test-"));
const journalPath = join(scratch, "journal.json");

const idx = buildContentIndex(CONTENT, journalPath);
const app = express();
app.use("/api/catalog", createCatalogRouter(idx));
const server = createServer(app);
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/api/catalog`;
const get = async (path, headers = {}) => {
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
};

// ── index + version ────────────────────────────────────────────────────
console.log("content index");
ok(/^v_[0-9a-f]{12}$/.test(idx.contentVersion), `contentVersion shape (${idx.contentVersion})`);
ok(idx.tracks.size >= 10, `indexed ${idx.tracks.size} tracks (≥10 live)`);
const rebuilt = buildContentIndex(CONTENT, journalPath);
ok(rebuilt.contentVersion === idx.contentVersion, "contentVersion deterministic across rebuilds");
ok(rebuilt.journal.length === idx.journal.length, "journal dedupes an unchanged version");

// ── catalog root = manifest, verbatim ─────────────────────────────────
console.log("catalog endpoints");
const manifest = readJson(join(CONTENT, "manifest.json"));
const root = await get("");
ok(root.status === 200 && isDeepStrictEqual(root.body, manifest), "GET /api/catalog ≡ manifest.json");
ok(root.headers.get("x-content-version") === idx.contentVersion, "X-Content-Version header present");
ok((root.headers.get("cache-control") || "").includes("max-age=300"), "cache-control public max-age=300");
ok(root.headers.get("access-control-allow-origin") === "*", "CORS: catalog is public");

const version = await get("/version");
ok(version.status === 200 && version.body.contentVersion === idx.contentVersion, "GET /version matches index");

// ── track + domain, verbatim ───────────────────────────────────────────
const trackFile = readJson(join(CONTENT, "anthropic", "cca-f", "track.json"));
const track = await get("/anthropic/cca-f");
ok(track.status === 200 && isDeepStrictEqual(track.body, trackFile), "GET /:vendor/:track ≡ track.json (cca-f)");
ok(Array.isArray(track.body.domainFiles) && !track.body.domains, "track keeps domainFiles refs — no inline domains (F3)");

const domainFile = readJson(join(CONTENT, "anthropic", "cca-f", trackFile.domainFiles[0]));
const domain = await get(`/anthropic/cca-f/${domainFile.id}`);
ok(domain.status === 200 && isDeepStrictEqual(domain.body, domainFile), `GET domain ≡ ${trackFile.domainFiles[0]}`);

// ── ETag / 304 ─────────────────────────────────────────────────────────
const etag = root.headers.get("etag");
ok(!!etag, "ETag set");
const cached = await get("", { "If-None-Match": etag });
ok(cached.status === 304 && cached.body === null, "If-None-Match → 304, empty body");

// ── paths + levels (D6) ────────────────────────────────────────────────
console.log("paths & levels");
const manifestKeys = new Set(manifest.vendors.flatMap((v) => v.tracks.map((t) => `${v.id}/${t.trackId}`)));
const paths = await get("/paths");
ok(paths.status === 200 && (paths.body.paths || []).length === 6, `GET /paths → ${(paths.body.paths || []).length} paths (6 pathfinder sequences)`);
ok(paths.body.paths.every((p) => p.tracks.every((r) => manifestKeys.has(`${r.vendorId}/${r.trackId}`))), "every path track ref resolves against the manifest");
const onePath = await get("/paths/claude-architect");
ok(onePath.status === 200 && onePath.body.tracks[0].trackId === "cca-f", "GET /paths/claude-architect → cca-f first");

const levels = await get("/levels");
const levelList = levels.body.levels || [];
ok(levels.status === 200 && levelList.length === 3, "GET /levels → 3 levels (lanes promoted)");
ok(isDeepStrictEqual(levelList.map((l) => l.order), [1, 2, 3]), "levels ordered 1..3");
ok(levelList.every((l) => l.tracks.every((r) => manifestKeys.has(`${r.vendorId}/${r.trackId}`))), "every level track ref resolves against the manifest");
const liveKeys = new Set(manifest.vendors.flatMap((v) => v.tracks.filter((t) => t.status === "live").map((t) => `${v.id}/${t.trackId}`)));
const assigned = new Set(levelList.flatMap((l) => l.tracks.map((r) => `${r.vendorId}/${r.trackId}`)));
ok([...liveKeys].every((k) => assigned.has(k)), "every live track sits in a level");
const oneLevel = await get("/levels/foundations");
ok(oneLevel.status === 200 && oneLevel.body.order === 1, "GET /levels/foundations resolves");

// ── 404s ───────────────────────────────────────────────────────────────
console.log("misses");
for (const [p, label] of [["/nope/track", "unknown track"], ["/anthropic/cca-f/nope", "unknown domain"], ["/paths/nope", "unknown path"], ["/levels/nope", "unknown level"]]) {
  const r = await get(p);
  ok(r.status === 404 && r.body.error === "not_found", `${label} → 404`);
}

// ── deltas ─────────────────────────────────────────────────────────────
console.log("deltas");
const fresh = await get(`/changes?since=${idx.contentVersion}`);
ok(fresh.status === 200 && fresh.body.changed.length === 0, "since=current → empty changed[]");
const stale = await get("/changes?since=v_000000000000");
ok(stale.status === 410, "unknown since → 410 Gone (full refetch)");

const from = { version: "v_a", scopes: { manifest: "m1", paths: "p1", levels: "l1", tracks: { "a/t1": { track: "h1", domains: { d1: "x", d2: "y" } } } } };
const to = { version: "v_b", scopes: { manifest: "m1", paths: "p2", levels: "l1", tracks: { "a/t1": { track: "h1", domains: { d1: "x", d2: "z" } }, "b/t2": { track: "n", domains: {} } } } };
const diff = computeChanges(from, to);
ok(isDeepStrictEqual(diff.find((c) => c.trackId === "t1"), { scope: "track", vendorId: "a", trackId: "t1", domains: ["d2"] }), "changed domain detected at domain granularity");
ok(isDeepStrictEqual(diff.find((c) => c.trackId === "t2"), { scope: "track", vendorId: "b", trackId: "t2" }), "new track listed without domain detail");
ok(diff.some((c) => c.scope === "paths") && !diff.some((c) => c.scope === "levels"), "paths change flagged, levels untouched");

server.close();
rmSync(scratch, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
