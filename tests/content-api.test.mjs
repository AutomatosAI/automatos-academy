#!/usr/bin/env node
// Contract tests for the Content API v1 (PRD-MT-01), run against the real
// content files — the proof that the served shapes ARE the file shapes
// (CONTENT-API-CONTRACT.md §6: the future DB-backed v2 must keep these green).
import { readFileSync, rmSync, mkdtempSync, existsSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { isDeepStrictEqual } from "util";
import express from "express";
import { buildContentIndex, createCatalogRouter, computeChanges } from "../server/catalog.js";
import { collectEpisodeErrors } from "../server/podcasts.js";

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

// ── stats (landing-hero real numbers) ──────────────────────────────────
// The route must agree with an INDEPENDENT walk of the content files (not
// computeContentStats — that would test the function against itself), and
// learner fields must be null when no DB pool was handed to the router.
console.log("stats");
const stats = await get("/stats");
ok(stats.status === 200, "GET /stats → 200");
ok((stats.headers.get("cache-control") || "").includes("max-age=300"), "stats: cache-control public max-age=300");
ok(stats.headers.get("access-control-allow-origin") === "*", "stats: CORS is public");
ok(stats.headers.get("x-content-version") === idx.contentVersion, "stats: X-Content-Version header present");
const expected = { liveTracks: 0, lessons: 0, learningMinutes: 0, questions: 0, scenarios: 0, labs: 0, videos: 0 };
for (const vendor of manifest.vendors) {
  for (const t of vendor.tracks || []) {
    if (t.status !== "live") continue;
    const trackPath = join(CONTENT, vendor.id, t.trackId, "track.json");
    if (!existsSync(trackPath)) continue; // live-but-contentless would be skipped by the index too
    expected.liveTracks++;
    for (const df of readJson(trackPath).domainFiles || []) {
      const d = readJson(join(CONTENT, vendor.id, t.trackId, df));
      for (const l of d.lessons || []) {
        expected.lessons++;
        expected.learningMinutes += l.estMinutes || 0;
        expected.questions += (l.knowledgeCheck || []).length;
      }
      expected.questions += (d.questions || []).length;
      expected.scenarios += (d.scenarios || []).length;
      expected.labs += (d.labs || []).length;
      expected.videos += (d.videos || []).filter((v) => typeof v.url === "string" && v.url.trim() !== "").length;
    }
  }
}
for (const k of Object.keys(expected)) ok(stats.body[k] === expected[k], `stats.${k} = ${expected[k]} (independent file count)`);
ok(expected.liveTracks >= 10 && expected.questions > 1000, "stats describe the real catalog (≥10 live tracks, >1000 questions)");
ok(stats.body.learners === null && stats.body.activeThisWeek === null, "no DB pool → learners + activeThisWeek are null");

// ── podcasts (PRD-MT-10) ────────────────────────────────────────────────
// Served verbatim from podcasts.json in exactly the app's manifest shape
// (automatos-academy-app/src/podcast/schema.ts), so the app parses it adapter-
// free. Real episodes are seeded (count asserted against the file, not hard-
// coded — new ones arrive via register-podcasts.mjs); shape verified verbatim.
console.log("podcasts");
const podManifest = readJson(join(CONTENT, "podcasts.json"));
const pod = await get("/podcasts");
ok(pod.status === 200 && typeof pod.body.version === "number" && Array.isArray(pod.body.episodes), "GET /podcasts → manifest shape { version, episodes }");
ok(pod.body.episodes.length === podManifest.episodes.length && pod.body.episodes.length >= 2, `GET /podcasts → all ${podManifest.episodes.length} seeded episodes (got ${pod.body.episodes.length})`);
ok(isDeepStrictEqual(pod.body, podManifest), "GET /podcasts ≡ podcasts.json (verbatim)");
ok(pod.headers.get("x-content-version") === idx.contentVersion, "podcasts: X-Content-Version header present");
ok((pod.headers.get("cache-control") || "").includes("max-age=300"), "podcasts: cache-control public max-age=300");
ok(pod.headers.get("access-control-allow-origin") === "*", "podcasts: CORS is public");

// every episode matches the app schema field-for-field, and its (vendorId,
// trackId) resolves to a real manifest track — no dangling audio.
const contractKeys = ["id", "title", "vendorId", "trackId", "durationSec", "chapters", "audioUrl", "groundingLabel"];
for (const ep of pod.body.episodes) {
  ok(collectEpisodeErrors(ep, ep.id).length === 0, `episode ${ep.id} passes the app schema contract`);
  ok(contractKeys.every((k) => k in ep), `episode ${ep.id} carries every required contract field`);
  ok(typeof ep.durationSec === "number" && ep.durationSec > 0 && Array.isArray(ep.chapters), `episode ${ep.id} durationSec > 0 + chapters[]`);
  ok(manifestKeys.has(`${ep.vendorId}/${ep.trackId}`), `episode ${ep.id} ref ${ep.vendorId}/${ep.trackId} resolves against the manifest`);
}

// one episode, verbatim + 404 on a miss
const oneEp = await get("/podcasts/cca-f-exam-guide");
ok(oneEp.status === 200 && isDeepStrictEqual(oneEp.body, podManifest.episodes.find((e) => e.id === "cca-f-exam-guide")), "GET /podcasts/:id ≡ the bare episode object");
const missEp = await get("/podcasts/nope");
ok(missEp.status === 404 && missEp.body.error === "not_found", "GET /podcasts/:id unknown → 404 not_found");

// ETag / 304 on the list
const podEtag = pod.headers.get("etag");
ok(!!podEtag, "podcasts: ETag set");
const podCached = await get("/podcasts", { "If-None-Match": podEtag });
ok(podCached.status === 304 && podCached.body === null, "podcasts: If-None-Match → 304, empty body");

// filters narrow by vendor/track; an unknown filter → empty list is still valid
const byVendor = await get("/podcasts?vendor=anthropic");
ok(byVendor.status === 200 && byVendor.body.episodes.length === 1 && byVendor.body.episodes[0].id === "cca-f-exam-guide", "?vendor=anthropic → 1 episode");
const byTrack = await get("/podcasts?track=platform-architect");
ok(byTrack.status === 200 && byTrack.body.episodes.length === 1 && byTrack.body.episodes[0].id === "apa-autonomous-workforce", "?track=platform-architect → 1 episode");
const byNone = await get("/podcasts?vendor=nobody");
ok(byNone.status === 200 && Array.isArray(byNone.body.episodes) && byNone.body.episodes.length === 0, "unknown filter → empty episodes[] is valid (honest empty state)");

// the shipped example fixture is contract-valid (it documents the optional
// chapters[] + transcriptUrl the two seeded episodes omit).
const example = readJson(join(CONTENT, "podcasts.example.json"));
ok(Array.isArray(example.episodes) && example.episodes.length >= 1, "podcasts.example.json has ≥1 example episode");
for (const ep of example.episodes) {
  ok(collectEpisodeErrors(ep, `example:${ep.id}`).length === 0, `example ${ep.id} validates against the app schema shape`);
  ok(Array.isArray(ep.chapters) && ep.chapters.length >= 1 && typeof ep.transcriptUrl === "string", `example ${ep.id} demonstrates chapters[] + transcriptUrl`);
  ok(ep.chapters.every((c, i) => i === 0 || c.startSec > ep.chapters[i - 1].startSec), `example ${ep.id} chapters strictly ascending`);
}

// deltas: a new episode surfaces as a podcasts scope change, episode-granular.
const pFrom = { version: "v_p0", scopes: { manifest: "m", paths: "p", levels: "l", podcasts: {}, tracks: {} } };
const pTo = { version: "v_p1", scopes: { manifest: "m", paths: "p", levels: "l", podcasts: { "ep-1": "h1" }, tracks: {} } };
ok(isDeepStrictEqual(computeChanges(pFrom, pTo).find((c) => c.scope === "podcasts"), { scope: "podcasts", episodes: ["ep-1"] }), "new episode → { scope:'podcasts', episodes:[id] }");
ok(computeChanges(pTo, pTo).every((c) => c.scope !== "podcasts"), "unchanged podcasts → no delta");
const pLegacy = { version: "v_leg", scopes: { manifest: "m", paths: "p", levels: "l", tracks: {} } };
ok(computeChanges(pLegacy, pFrom).every((c) => c.scope !== "podcasts"), "pre-podcasts snapshot + zero episodes → no false delta");

server.close();
rmSync(scratch, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
