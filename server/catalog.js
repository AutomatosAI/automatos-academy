/**
 * Content API v1 — versioned, published-only catalog (PRD-MT-01).
 *
 * Serves today's JSON content files verbatim over the endpoint shapes locked
 * in docs/prds/PRD-MOBILE-TUTOR/build/CONTENT-API-CONTRACT.md. "Published" =
 * what this deployment ships; the file→DB migration (D-R4 phase 2) must
 * reproduce these responses behind the same contract.
 *
 * Two exports:
 *   buildContentIndex(contentDir, journalPath) — read + hash the content tree
 *     at boot; fail loudly on malformed content (the validator catches the
 *     same problems pre-merge, so a boot failure here means an unvalidated
 *     deploy, not a user-facing 500).
 *   createCatalogRouter(idx) — an express.Router serving the contract.
 */
import express from "express";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const shortHash = (s) => sha(s).slice(0, 12);

function readJson(path, what) {
  let raw;
  try { raw = readFileSync(path, "utf8"); }
  catch (e) { throw new Error(`[catalog] cannot read ${what} at ${path}: ${e.message}`); }
  try { return { data: JSON.parse(raw), hash: shortHash(raw) }; }
  catch (e) { throw new Error(`[catalog] invalid JSON in ${what} at ${path}: ${e.message}`); }
}

/**
 * Build the in-memory index: manifest + every track/domain file it references
 * + paths/levels (D6 objects), each with a content hash. contentVersion is a
 * short hash over the sorted (path, hash) list — it changes exactly when any
 * served content changes, and is stable across boots of the same deploy.
 */
export function buildContentIndex(contentDir, journalPath) {
  const files = new Map(); // rel path → hash, for the version roll-up

  const manifest = readJson(join(contentDir, "manifest.json"), "manifest");
  files.set("manifest.json", manifest.hash);

  const tracks = new Map(); // "vendorId/trackId" → {track, domains: Map(domainId → {data, hash}), trackHash}
  for (const vendor of manifest.data.vendors || []) {
    for (const t of vendor.tracks || []) {
      const dir = join(contentDir, vendor.id, t.trackId);
      const trackPath = join(dir, "track.json");
      // coming-soon tracks may have no content on disk yet — that's published
      // catalog metadata with nothing underneath, same as the SPA sees today.
      if (!existsSync(trackPath)) continue;
      const track = readJson(trackPath, `${vendor.id}/${t.trackId}/track.json`);
      files.set(`${vendor.id}/${t.trackId}/track.json`, track.hash);
      const domains = new Map();
      for (const df of track.data.domainFiles || []) {
        const d = readJson(join(dir, df), `${vendor.id}/${t.trackId}/${df}`);
        if (!d.data.id) throw new Error(`[catalog] domain file ${vendor.id}/${t.trackId}/${df} has no id`);
        domains.set(d.data.id, d);
        files.set(`${vendor.id}/${t.trackId}/${df}`, d.hash);
      }
      tracks.set(`${vendor.id}/${t.trackId}`, { track, domains });
    }
  }

  const paths = readJson(join(contentDir, "paths.json"), "paths.json");
  const levels = readJson(join(contentDir, "levels.json"), "levels.json");
  files.set("paths.json", paths.hash);
  files.set("levels.json", levels.hash);

  const rollup = [...files.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([p, h]) => `${p}:${h}`).join("\n");
  const contentVersion = `v_${shortHash(rollup)}`;
  const generatedAt = new Date().toISOString();

  // Per-scope hash snapshot — what the delta journal stores per version.
  const scopes = { manifest: manifest.hash, paths: paths.hash, levels: levels.hash, tracks: {} };
  for (const [key, { track, domains }] of tracks) {
    scopes.tracks[key] = { track: track.hash, domains: Object.fromEntries([...domains].map(([id, d]) => [id, d.hash])) };
  }

  const journal = loadJournal(journalPath, { version: contentVersion, generatedAt, scopes });
  return { manifest, tracks, paths, levels, contentVersion, generatedAt, scopes, journal };
}

/**
 * Version journal: last 20 version snapshots, persisted best-effort so
 * `changes?since=` can answer across deploys that share a volume. On
 * ephemeral hosts the journal starts fresh each boot (current version only)
 * and every older `since` answers 410 → client full-refetch, per contract §5.
 */
function loadJournal(journalPath, current) {
  let entries = [];
  try {
    if (journalPath && existsSync(journalPath)) {
      const parsed = JSON.parse(readFileSync(journalPath, "utf8"));
      if (Array.isArray(parsed)) entries = parsed.filter((e) => e && e.version && e.scopes);
    }
  } catch (e) {
    console.warn(`[catalog] journal unreadable, starting fresh: ${e.message}`);
    entries = [];
  }
  // Current version always sits last (— `/changes` reads `to` from the tail),
  // including after a content revert re-surfaces an old version mid-journal.
  entries = [...entries.filter((e) => e.version !== current.version), current].slice(-20);
  try {
    if (journalPath) {
      mkdirSync(dirname(journalPath), { recursive: true });
      writeFileSync(journalPath, JSON.stringify(entries), "utf8");
    }
  } catch (e) {
    console.warn(`[catalog] journal not persisted (read-only fs?): ${e.message}`);
  }
  return entries;
}

/**
 * Pure diff between two journal snapshots → the contract §5 `changed[]` list.
 * Track granularity includes changed domain ids where known; new/removed
 * tracks appear as a track entry with no domain detail (client refetches the
 * track). A manifest-only change has no scope of its own — clients refetch
 * GET /api/catalog on any version change, which covers it.
 */
export function computeChanges(fromEntry, toEntry) {
  const changed = [];
  const fromTracks = fromEntry.scopes.tracks || {};
  const toTracks = toEntry.scopes.tracks || {};
  const keys = new Set([...Object.keys(fromTracks), ...Object.keys(toTracks)]);
  for (const key of [...keys].sort()) {
    const [vendorId, trackId] = key.split("/");
    const a = fromTracks[key], b = toTracks[key];
    if (!a || !b) { changed.push({ scope: "track", vendorId, trackId }); continue; }
    if (a.track === b.track && JSON.stringify(a.domains) === JSON.stringify(b.domains)) continue;
    const domainIds = new Set([...Object.keys(a.domains), ...Object.keys(b.domains)]);
    const domains = [...domainIds].sort().filter((id) => a.domains[id] !== b.domains[id]);
    changed.push({ scope: "track", vendorId, trackId, ...(domains.length ? { domains } : {}) });
  }
  if (fromEntry.scopes.paths !== toEntry.scopes.paths) changed.push({ scope: "paths" });
  if (fromEntry.scopes.levels !== toEntry.scopes.levels) changed.push({ scope: "levels" });
  return changed;
}

export function createCatalogRouter(idx) {
  const router = express.Router();

  // Contract §1: ETag + 304, X-Content-Version, public cache, permissive CORS
  // (published content is public — identical posture to today's static files).
  const send = (res, req, body, hash) => {
    const etag = `"${hash}"`;
    res.set("ETag", etag);
    res.set("X-Content-Version", idx.contentVersion);
    res.set("Cache-Control", "public, max-age=300");
    res.set("Access-Control-Allow-Origin", "*");
    if (req.headers["if-none-match"] === etag) return res.status(304).end();
    res.json(body);
  };
  const notFound = (res) => res.status(404).json({ error: "not_found" });

  router.get("/version", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-store");
    res.json({ contentVersion: idx.contentVersion, generatedAt: idx.generatedAt });
  });

  router.get("/changes", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-store");
    const since = typeof req.query.since === "string" ? req.query.since : "";
    const from = idx.journal.find((e) => e.version === since);
    if (!from) return res.status(410).json({ error: "version_unknown", note: "full refetch required" });
    const to = idx.journal[idx.journal.length - 1];
    res.json({ from: from.version, to: to.version, changed: computeChanges(from, to) });
  });

  // Fixed segments before parameterised routes — /paths and /levels must win
  // over /:vendorId/:trackId.
  router.get("/paths", (req, res) => send(res, req, idx.paths.data, idx.paths.hash));
  router.get("/paths/:pathId", (req, res) => {
    const p = (idx.paths.data.paths || []).find((x) => x.id === req.params.pathId);
    return p ? send(res, req, p, `${idx.paths.hash}-${p.id}`) : notFound(res);
  });
  router.get("/levels", (req, res) => send(res, req, idx.levels.data, idx.levels.hash));
  router.get("/levels/:levelId", (req, res) => {
    const l = (idx.levels.data.levels || []).find((x) => x.id === req.params.levelId);
    return l ? send(res, req, l, `${idx.levels.hash}-${l.id}`) : notFound(res);
  });

  router.get("/", (req, res) => send(res, req, idx.manifest.data, idx.manifest.hash));

  router.get("/:vendorId/:trackId", (req, res) => {
    const t = idx.tracks.get(`${req.params.vendorId}/${req.params.trackId}`);
    return t ? send(res, req, t.track.data, t.track.hash) : notFound(res);
  });

  router.get("/:vendorId/:trackId/:domainId", (req, res) => {
    const t = idx.tracks.get(`${req.params.vendorId}/${req.params.trackId}`);
    const d = t && t.domains.get(req.params.domainId);
    return d ? send(res, req, d.data, d.hash) : notFound(res);
  });

  return router;
}
