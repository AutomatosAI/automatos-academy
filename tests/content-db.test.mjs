#!/usr/bin/env node
// PRD-U3 S5 — the dual-run equivalence gate (D-U9), same zero-framework style
// as the other suites.
//
// Byte-fidelity is the whole game (PRD-U3 §8): this suite publishes the
// repo's REAL content tree into Postgres via the S2 script, builds the index
// from BOTH sources, and asserts every scope's canonical bytes, every hash,
// and the contentVersion string are identical — then proves it again at the
// route level (ETag + body bytes through the router in both modes). Any
// divergence between files mode and db mode goes red here before it can bust
// a client cache in the flip.
//
// Needs a real Postgres: runs only when DATABASE_URL is set (the CI `spine`
// job provides a service container and applies migrations first); without it
// this suite skips loudly so `npm test` stays green with zero env.
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { createHash } from "crypto";
import { isDeepStrictEqual } from "util";
import express from "express";
import { buildContentIndex, createCatalogRouter, versionRollup } from "../server/catalog.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "public", "content");
const sha = (s) => createHash("sha256").update(s).digest("hex");

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

if (!process.env.DATABASE_URL) {
  console.log("content-db: SKIPPED — DATABASE_URL not set (the CI spine job runs these against a service container)");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

console.log("content-db (Postgres via DATABASE_URL)");
const { default: pg } = await import("pg");
const { buildContentIndexFromDb, refreshContentIndex, readCurrentVersion } = await import("../server/catalog-db.js");
const { publishContent } = await import("../scripts/publish-content.mjs");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

// Clean slate so reruns are deterministic (single statement satisfies the FKs).
await pool.query("TRUNCATE content_current, content_documents, content_versions");

// ── S2: publish the real tree (validator gate runs inside) ─────────────
console.log("publish");
const first = await publishContent({ databaseUrl: process.env.DATABASE_URL });
ok(first.published === true, `real content tree published (${first.contentVersion})`);
ok(/^v_[0-9a-f]{12}$/.test(first.contentVersion), "published contentVersion has the v_<12hex> shape");
const again = await publishContent({ databaseUrl: process.env.DATABASE_URL });
ok(again.published === false && again.contentVersion === first.contentVersion, "idempotent re-run skips without writing");
ok(await readCurrentVersion(pool) === first.contentVersion, "current pointer names the published version");

// ── S3/S5: index equivalence — files ≡ db, byte for byte ───────────────
console.log("index equivalence (files ≡ db)");
const fileIdx = buildContentIndex(CONTENT); // no journalPath → side-effect-free
const dbIdx = await buildContentIndexFromDb(pool);
const { rows: docCount } = await pool.query("SELECT count(*)::int AS n FROM content_documents");
ok(docCount[0].n === fileIdx.documents.length, `content_documents holds exactly the tree's documents (${docCount[0].n} rows)`);

ok(dbIdx.contentVersion === fileIdx.contentVersion, `contentVersion identical (${fileIdx.contentVersion})`);
const keyOf = (d) => `${d.scopeKind}|${d.vendorId ?? ""}|${d.trackId ?? ""}|${d.domainId ?? ""}`;
const fileDocs = new Map(fileIdx.documents.map((d) => [keyOf(d), d]));
const dbDocs = new Map(dbIdx.documents.map((d) => [keyOf(d), d]));
ok(fileDocs.size === dbDocs.size && [...fileDocs.keys()].every((k) => dbDocs.has(k)),
  `same document set in both sources (${fileDocs.size} scopes)`);
const mismatch = { bytes: [], hash: [], relPath: [] };
for (const [k, fd] of fileDocs) {
  const dd = dbDocs.get(k);
  if (!dd) continue;
  if (dd.canonical !== fd.canonical) mismatch.bytes.push(k);
  if (dd.sha256 !== fd.sha256 || dd.hash !== fd.hash) mismatch.hash.push(k);
  if (dd.relPath !== fd.relPath) mismatch.relPath.push(k);
}
ok(mismatch.bytes.length === 0, `every scope's canonical bytes identical${mismatch.bytes.length ? ` (differs: ${mismatch.bytes.slice(0, 3).join(", ")}…)` : ""}`);
ok(mismatch.hash.length === 0, "every scope's sha256 + ETag hash identical");
ok(mismatch.relPath.length === 0, "every scope's rollup path identical");
ok(isDeepStrictEqual(dbIdx.scopes, fileIdx.scopes), "scopes snapshot identical (journal entries agree across sources)");
ok(dbIdx.tracks.size === fileIdx.tracks.size, `same track count (${dbIdx.tracks.size})`);
ok([...dbIdx.tracks.keys()].join() === [...fileIdx.tracks.keys()].join(), "track iteration order identical (shells parity)");
const fileCca = fileIdx.tracks.get("anthropic/cca-f"), dbCca = dbIdx.tracks.get("anthropic/cca-f");
ok([...dbCca.domains.keys()].join() === [...fileCca.domains.keys()].join(), "domain iteration order identical (domainFiles order survives the round-trip)");
ok(dbIdx.journal[dbIdx.journal.length - 1].version === fileIdx.contentVersion, "db journal tail = current version");

// ── route-level equivalence: both modes through the real router ────────
console.log("route equivalence");
const mkServer = async (router) => {
  const app = express();
  app.use("/api/catalog", router);
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://127.0.0.1:${server.address().port}/api/catalog` };
};
const fileSrv = await mkServer(createCatalogRouter(fileIdx));
let currentDb = dbIdx;
const dbSrv = await mkServer(createCatalogRouter(() => currentDb)); // getter, as server.js wires db mode
const raw = async (base, path, headers = {}) => {
  const res = await fetch(base + path, { headers });
  return { status: res.status, etag: res.headers.get("etag"), version: res.headers.get("x-content-version"), text: await res.text() };
};

const firstDomainId = [...fileCca.domains.keys()][0];
const spots = ["", "/anthropic/cca-f", `/anthropic/cca-f/${firstDomainId}`, "/paths", "/paths/claude-architect", "/levels", "/podcasts", "/podcasts/cca-f-exam-guide"];
for (const p of spots) {
  const a = await raw(fileSrv.base, p);
  const b = await raw(dbSrv.base, p);
  ok(a.status === 200 && b.status === 200 && a.etag === b.etag && a.version === b.version && a.text === b.text,
    `GET ${p || "/"} — status/ETag/X-Content-Version/body bytes identical`);
}
const fileEtag = (await raw(fileSrv.base, "")).etag;
const cond = await raw(dbSrv.base, "", { "If-None-Match": fileEtag });
ok(cond.status === 304 && cond.text === "", "a files-mode ETag revalidates against db mode → 304 (client caches survive the flip)");
const miss = await raw(dbSrv.base, "/nope/track");
ok(miss.status === 404 && JSON.parse(miss.text).error === "not_found", "db mode: unknown track → 404 not_found");

// ── durable /changes: history read from content_versions ───────────────
console.log("durable changes journal");
// A synthetic OLDER version models a client that last synced before this
// publish — exactly the cursor that used to 410 after every restart.
const v0 = "v_aaaaaaaaaaaa";
const v0scopes = structuredClone(fileIdx.scopes);
v0scopes.tracks["anthropic/cca-f"].domains[firstDomainId] = "000000000000"; // this domain has since changed
v0scopes.podcasts["ghost-episode"] = "111111111111"; // an episode that has since been removed
await pool.query(
  "INSERT INTO content_versions (content_version, scopes, published_at) VALUES ($1, $2, now() - interval '1 hour')",
  [v0, JSON.stringify(v0scopes)]);
currentDb = await buildContentIndexFromDb(pool); // journal now [v0, v1]
ok(currentDb.journal.length === 2 && currentDb.journal[0].version === v0, "older journal entry surfaces from content_versions");
const delta = await raw(dbSrv.base, `/changes?since=${v0}`);
const changed = JSON.parse(delta.text);
ok(delta.status === 200 && changed.from === v0 && changed.to === fileIdx.contentVersion, "changes?since=old-version answers from the durable journal");
ok(isDeepStrictEqual(changed.changed.find((c) => c.scope === "track"),
  { scope: "track", vendorId: "anthropic", trackId: "cca-f", domains: [firstDomainId] }), "domain-granular delta computed across versions");
ok(isDeepStrictEqual(changed.changed.find((c) => c.scope === "podcasts"), { scope: "podcasts", episodes: ["ghost-episode"] }), "episode-granular podcast delta");
const gone = await raw(dbSrv.base, "/changes?since=v_000000000000");
ok(gone.status === 410 && JSON.parse(gone.text).error === "version_unknown", "pre-history cursor → 410 version_unknown (full refetch)");

// ── refresh (D-U7): pointer flip → rebuild → atomic swap ────────────────
console.log("refresh poll");
// A real second version: the levels document with one byte of trailing
// whitespace — same parsed JSON (so the served body must not change), new
// canonical bytes (so the ETag and contentVersion must).
const v1 = fileIdx.contentVersion;
const docs3 = fileIdx.documents.map((d) => {
  if (d.scopeKind !== "levels") return d;
  const canonical = d.canonical + "\n";
  return { ...d, canonical, sha256: sha(canonical), hash: sha(canonical).slice(0, 12), bytes: Buffer.byteLength(canonical, "utf8") };
});
const files3 = new Map(docs3.map((d) => [d.relPath, d.hash]));
const v3 = versionRollup(files3);
const scopes3 = { ...fileIdx.scopes, levels: docs3.find((d) => d.scopeKind === "levels").hash };
ok(v3 !== v1, "whitespace-only levels change rolls a new contentVersion");
await pool.query("INSERT INTO content_versions (content_version, scopes) VALUES ($1, $2)", [v3, JSON.stringify(scopes3)]);
for (const d of docs3) {
  await pool.query(
    `INSERT INTO content_documents (content_version, scope_kind, vendor_id, track_id, domain_id, rel_path, payload, canonical, sha256, bytes)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
    [v3, d.scopeKind, d.vendorId, d.trackId, d.domainId, d.relPath, d.canonical, d.canonical, d.sha256, d.bytes]);
}
await pool.query("UPDATE content_current SET content_version = $1, updated_at = now() WHERE id = true", [v3]);

const beforeLevels = await raw(dbSrv.base, "/levels");
const swapped = await refreshContentIndex(pool, { getCurrent: () => currentDb, swap: (next) => { currentDb = next; } });
ok(swapped === v3 && currentDb.contentVersion === v3, "poll step: pointer change → rebuild → swap to the new version");
ok(await refreshContentIndex(pool, { getCurrent: () => currentDb, swap: () => { throw new Error("must not swap"); } }) === null,
  "poll step: unchanged pointer → no rebuild, no swap");
const afterLevels = await raw(dbSrv.base, "/levels");
ok(afterLevels.version === v3 && afterLevels.etag !== beforeLevels.etag, "swapped index serves the new version + new ETag");
ok(afterLevels.text === beforeLevels.text, "ETag derives from canonical bytes, body from parsed JSON — whitespace-only change flips only the ETag");
const levelsDelta = JSON.parse((await raw(dbSrv.base, `/changes?since=${v1}`)).text);
ok(levelsDelta.from === v1 && levelsDelta.to === v3 && isDeepStrictEqual(levelsDelta.changed, [{ scope: "levels" }]),
  "changes between the two published versions → [{scope:'levels'}]");

// failure after a good boot: the poll surfaces the error (startContentRefresh
// catches it and keeps serving); the held index is untouched.
const poisoned = { query: async () => { throw new Error("connection refused"); } };
let pollError = null;
try { await refreshContentIndex(poisoned, { getCurrent: () => currentDb, swap: () => {} }); }
catch (e) { pollError = e; }
ok(pollError !== null && currentDb.contentVersion === v3, "db failure mid-poll throws to the keep-serving handler; last good index intact");

// ── integrity tripwires: corrupted rows never serve ─────────────────────
console.log("integrity tripwires");
// jsonb-style normalisation of the canonical column is exactly the corruption
// the schema exists to prevent — the loader must refuse it.
const { rows: [lvlRow] } = await pool.query(
  "SELECT canonical FROM content_documents WHERE content_version = $1 AND scope_kind = 'levels'", [v3]);
const normalised = JSON.stringify(JSON.parse(lvlRow.canonical)); // key order kept, whitespace lost
await pool.query(
  "UPDATE content_documents SET canonical = $1 WHERE content_version = $2 AND scope_kind = 'levels'", [normalised, v3]);
let corrupt = null;
try { await buildContentIndexFromDb(pool); } catch (e) { corrupt = e; }
ok(corrupt !== null && /integrity/.test(corrupt.message), "re-serialised canonical bytes (sha mismatch) refuse to load");
// restore the row but break the version linkage instead: rollup ≠ pointer
await pool.query(
  "UPDATE content_documents SET canonical = $1, sha256 = $2 WHERE content_version = $3 AND scope_kind = 'levels'",
  [normalised, sha(normalised), v3]);
let rollupTrip = null;
try { await buildContentIndexFromDb(pool); } catch (e) { rollupTrip = e; }
ok(rollupTrip !== null && /integrity/.test(rollupTrip.message), "rows that no longer roll up to the pointer's version refuse to load");

// point back to the intact first publish — the documented rollback move.
await pool.query("UPDATE content_current SET content_version = $1, updated_at = now() WHERE id = true", [v1]);
const rolledBack = await buildContentIndexFromDb(pool);
ok(rolledBack.contentVersion === v1 && rolledBack.journal[rolledBack.journal.length - 1].version === v1,
  "rollback = one pointer UPDATE; old version loads clean with itself at the journal tail");

fileSrv.server.close();
dbSrv.server.close();
await pool.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
