/**
 * Content API v1 — versioned, published-only catalog (PRD-MT-01).
 *
 * Serves today's JSON content files verbatim over the endpoint shapes locked
 * in docs/prds/PRD-MOBILE-TUTOR/build/CONTENT-API-CONTRACT.md. "Published" =
 * what this deployment ships. PRD-U3 delivers the file→DB migration this
 * module always described: server/catalog-db.js builds the SAME index shape
 * from Postgres, and both sources flow through the one router below.
 *
 * Main exports:
 *   buildContentIndex(contentDir, journalPath) — read + hash the content tree
 *     at boot; fail loudly on malformed content (the validator catches the
 *     same problems pre-merge, so a boot failure here means an unvalidated
 *     deploy, not a user-facing 500). journalPath is optional — omit it (the
 *     publish script and standalone shells do) for a side-effect-free build.
 *   createCatalogRouter(idxOrGetter, opts) — an express.Router serving the
 *     contract. Accepts the index object, or a zero-arg getter so the db
 *     mode's 60 s refresh (D-U7) can swap the index atomically between
 *     requests without remounting. opts.getPool (optional, zero-arg → pg
 *     Pool | null) lets GET /stats add learner counts on Spine deploys.
 *   computeContentStats(idx) — the aggregate numbers behind GET /stats,
 *     exported pure so both loaders and the tests share one definition.
 *
 * Byte-fidelity invariant (PRD-U3 §8): every per-file `hash` is sha256 over
 *   the file's canonical utf8 text, and every response body is
 *   `res.json(JSON.parse(canonical))`. Any storage backend must preserve the
 *   canonical text verbatim — never a re-serialisation — or ETags and bodies
 *   drift. The index therefore carries `documents[]` (canonical text + hashes
 *   per scope): it is what publish-content.mjs ingests and what the CI
 *   equivalence test compares across sources.
 */
import express from "express";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";
import { buildPodcastIndex } from "./podcasts.js";
import { buildInventory } from "./media/inventory.js";
import { overlayVideos } from "./media/overlay.js";
import { applyContentOverride } from "./content/overlay.js";
import { collectCards, parseTypeFilter } from "./cards/index.js";

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const shortHash = (s) => sha(s).slice(0, 12);

function readJson(path, what) {
  let raw;
  try { raw = readFileSync(path, "utf8"); }
  catch (e) { throw new Error(`[catalog] cannot read ${what} at ${path}: ${e.message}`); }
  try { return { data: JSON.parse(raw), hash: shortHash(raw), raw }; }
  catch (e) { throw new Error(`[catalog] invalid JSON in ${what} at ${path}: ${e.message}`); }
}

/** One index document: ids + canonical bytes + hashes (see header invariant). */
const toDocument = ({ scopeKind, vendorId = null, trackId = null, domainId = null, relPath, raw }) => ({
  scopeKind, vendorId, trackId, domainId, relPath,
  canonical: raw,
  sha256: sha(raw),
  hash: shortHash(raw),
  bytes: Buffer.byteLength(raw, "utf8"),
});

/**
 * contentVersion = short hash over the sorted (relative path, file hash)
 * list — changes exactly when any served content changes, stable across boots
 * of the same tree. Exported so the db loader can recompute it from stored
 * rows and refuse to serve on a mismatch (integrity tripwire).
 */
export function versionRollup(files) {
  const rollup = [...files.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([p, h]) => `${p}:${h}`).join("\n");
  return `v_${shortHash(rollup)}`;
}

/**
 * Per-scope hash snapshot — what the delta journal stores per version and
 * computeChanges() diffs. Shared by both loaders so file mode and db mode
 * produce identical journal entries for the same tree.
 */
export function buildScopesSnapshot({ manifest, paths, levels, podcasts, tracks }) {
  const scopes = { manifest: manifest.hash, paths: paths.hash, levels: levels.hash, podcasts: podcasts.scope, tracks: {} };
  for (const [key, { track, domains }] of tracks) {
    scopes.tracks[key] = { track: track.hash, domains: Object.fromEntries([...domains].map(([id, d]) => [id, d.hash])) };
  }
  return scopes;
}

/**
 * Build the in-memory index: manifest + every track/domain file it references
 * + paths/levels (D6 objects), each with a content hash. contentVersion is a
 * short hash over the sorted (path, hash) list — it changes exactly when any
 * served content changes, and is stable across boots of the same deploy.
 */
export function buildContentIndex(contentDir, journalPath) {
  const files = new Map(); // rel path → hash, for the version roll-up
  const documents = [];    // canonical bytes per scope (publish + equivalence)

  const manifest = readJson(join(contentDir, "manifest.json"), "manifest");
  files.set("manifest.json", manifest.hash);
  documents.push(toDocument({ scopeKind: "manifest", relPath: "manifest.json", raw: manifest.raw }));

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
      documents.push(toDocument({
        scopeKind: "track", vendorId: vendor.id, trackId: t.trackId,
        relPath: `${vendor.id}/${t.trackId}/track.json`, raw: track.raw,
      }));
      const domains = new Map();
      for (const df of track.data.domainFiles || []) {
        const d = readJson(join(dir, df), `${vendor.id}/${t.trackId}/${df}`);
        if (!d.data.id) throw new Error(`[catalog] domain file ${vendor.id}/${t.trackId}/${df} has no id`);
        domains.set(d.data.id, d);
        files.set(`${vendor.id}/${t.trackId}/${df}`, d.hash);
        documents.push(toDocument({
          scopeKind: "domain", vendorId: vendor.id, trackId: t.trackId, domainId: d.data.id,
          relPath: `${vendor.id}/${t.trackId}/${df}`, raw: d.raw,
        }));
      }
      tracks.set(`${vendor.id}/${t.trackId}`, { track, domains });
    }
  }

  const paths = readJson(join(contentDir, "paths.json"), "paths.json");
  const levels = readJson(join(contentDir, "levels.json"), "levels.json");
  files.set("paths.json", paths.hash);
  files.set("levels.json", levels.hash);
  documents.push(toDocument({ scopeKind: "paths", relPath: "paths.json", raw: paths.raw }));
  documents.push(toDocument({ scopeKind: "levels", relPath: "levels.json", raw: levels.raw }));

  // Podcasts (PRD-MT-10) — folded into the version roll-up so a new episode
  // rolls contentVersion and surfaces as a delta, exactly like a track change.
  const podcasts = buildPodcastIndex(contentDir);
  files.set("podcasts.json", podcasts.hash);
  documents.push(toDocument({ scopeKind: "podcasts", relPath: "podcasts.json", raw: podcasts.raw }));

  const contentVersion = versionRollup(files);
  const generatedAt = new Date().toISOString();
  const scopes = buildScopesSnapshot({ manifest, paths, levels, podcasts, tracks });

  const journal = loadJournal(journalPath, { version: contentVersion, generatedAt, scopes });
  return { manifest, tracks, paths, levels, podcasts, contentVersion, generatedAt, scopes, journal, documents };
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
  // Podcasts: episode-granular, mirroring track/domain deltas. A new or changed
  // episode surfaces as { scope:"podcasts", episodes:[ids] }. Snapshots taken
  // before podcasts existed have no `podcasts` scope → treated as {} (no false
  // delta when there are still zero episodes).
  const fromEps = fromEntry.scopes.podcasts || {};
  const toEps = toEntry.scopes.podcasts || {};
  const epIds = new Set([...Object.keys(fromEps), ...Object.keys(toEps)]);
  const episodes = [...epIds].sort().filter((id) => fromEps[id] !== toEps[id]);
  if (episodes.length) changed.push({ scope: "podcasts", episodes });
  return changed;
}

/**
 * Aggregate catalog stats — the numbers behind GET /stats (the landing hero's
 * "real numbers" widgets). Counts LIVE tracks only (manifest status): the hero
 * advertises what a learner can start today, so coming-soon shells and
 * on-disk-but-unlisted content must not inflate the promise. Pure over the
 * index shape both loaders build, so files mode and db mode agree by
 * construction.
 */
export function computeContentStats(idx) {
  const live = new Set();
  for (const vendor of idx.manifest.data.vendors || []) {
    for (const t of vendor.tracks || []) {
      if (t.status === "live") live.add(`${vendor.id}/${t.trackId}`);
    }
  }
  let liveTracks = 0, lessons = 0, learningMinutes = 0, questions = 0, scenarios = 0, labs = 0, videos = 0;
  for (const [key, { domains }] of idx.tracks) {
    if (!live.has(key)) continue;
    liveTracks += 1;
    for (const { data: d } of domains.values()) {
      for (const l of d.lessons || []) {
        lessons += 1;
        learningMinutes += l.estMinutes || 0;
        // in-lesson knowledge checks count as questions: the engine records
        // them into the same spaced-repetition bank as standalone items
        questions += (l.knowledgeCheck || []).length;
      }
      questions += (d.questions || []).length;
      scenarios += (d.scenarios || []).length;
      labs += (d.labs || []).length;
      // only videos a learner can actually press play on
      videos += (d.videos || []).filter((v) => typeof v.url === "string" && v.url.trim() !== "").length;
    }
  }
  return { liveTracks, lessons, learningMinutes, questions, scenarios, labs, videos };
}

// Learner numbers for GET /stats — only on deploys where the Spine's pg pool
// exists (opts.getPool). Cached in-process for 5 minutes: the hero is a
// marketing surface, not a dashboard, and two COUNTs per pageview would be a
// self-inflicted load test. A DB error must never 500 a public content route:
// it degrades to nulls (clients keep their fallback copy) with one warn per
// cache window — failures are cached too, so a down DB isn't hammered.
const LEARNER_CACHE_MS = 5 * 60 * 1000;
const NO_LEARNER_DATA = Object.freeze({ learners: null, activeThisWeek: null });
function createLearnerStats(getPool) {
  let cache = { at: 0, data: NO_LEARNER_DATA }; // replaced whole, never mutated
  let inflight = null; // stampede guard: concurrent requests share one refresh
  return async function learnerStats() {
    const pool = typeof getPool === "function" ? getPool() : null;
    if (!pool) return NO_LEARNER_DATA;
    if (Date.now() - cache.at < LEARNER_CACHE_MS) return cache.data;
    if (!inflight) {
      inflight = (async () => {
        try {
          const [u, a] = await Promise.all([
            pool.query("SELECT COUNT(*)::int AS n FROM users"),
            pool.query("SELECT COUNT(DISTINCT user_id)::int AS n FROM progress WHERE answered_at > now() - interval '7 days'"),
          ]);
          cache = { at: Date.now(), data: { learners: u.rows[0].n, activeThisWeek: a.rows[0].n } };
        } catch (e) {
          console.warn("[catalog] learner stats unavailable (serving nulls):", e.message);
          cache = { at: Date.now(), data: NO_LEARNER_DATA };
        } finally {
          inflight = null;
        }
      })();
    }
    await inflight;
    return cache.data;
  };
}

export function createCatalogRouter(idxOrGetter, opts = {}) {
  // Accept the index itself (files mode, tests) or a zero-arg getter (db mode
  // — the 60 s refresh swaps the whole index object; one getter call per
  // request keeps each response internally consistent during a swap).
  const getIdx = typeof idxOrGetter === "function" ? idxOrGetter : () => idxOrGetter;
  const router = express.Router();
  const learnerStats = createLearnerStats(opts.getPool);
  // C3 PR2 — media bindings overlay accessor: (vendor, track) → {bySlot, version}
  // or null. Absent ⇒ no overlay (files/tests behave exactly as before).
  const getBindings = typeof opts.getBindings === "function" ? opts.getBindings : () => null;
  // PRD-CONTENT-LIFECYCLE S4 — approved-draft text overlay accessor:
  // (scopeKind, vendor, track, domain) → {canonical, sha256} or null. Absent ⇒
  // no overlay (files/tests/spine-less deploys behave exactly as before). A
  // whole-document swap served over the git/DB base, immutable + fail-soft.
  const getOverride = typeof opts.getOverride === "function" ? opts.getOverride : () => null;
  // content stats keyed by index identity: files mode computes once per boot,
  // db mode once per index swap — never per request
  const contentStatsCache = new WeakMap();

  // Contract §1: ETag + 304, X-Content-Version, public cache, permissive CORS
  // (published content is public — identical posture to today's static files).
  const send = (res, req, idx, body, hash) => {
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
    const idx = getIdx();
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-store");
    res.json({ contentVersion: idx.contentVersion, generatedAt: idx.generatedAt });
  });

  router.get("/changes", (req, res) => {
    const idx = getIdx();
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-store");
    const since = typeof req.query.since === "string" ? req.query.since : "";
    const from = idx.journal.find((e) => e.version === since);
    if (!from) return res.status(410).json({ error: "version_unknown", note: "full refetch required" });
    const to = idx.journal[idx.journal.length - 1];
    res.json({ from: from.version, to: to.version, changed: computeChanges(from, to) });
  });

  // Aggregate stats (landing hero + anyone else who wants honest numbers).
  // Same public envelope-free posture as the rest of the catalog. No ETag on
  // purpose: the learner half rolls on its own 5-minute clock, so a content
  // hash would lie — Cache-Control max-age=300 is the whole freshness story.
  router.get("/stats", async (req, res) => {
    const idx = getIdx();
    let content = contentStatsCache.get(idx);
    if (!content) {
      content = computeContentStats(idx);
      contentStatsCache.set(idx, content);
    }
    const learners = await learnerStats(); // never throws — nulls on any failure
    res.set("X-Content-Version", idx.contentVersion);
    res.set("Cache-Control", "public, max-age=300");
    res.set("Access-Control-Allow-Origin", "*");
    res.json({ ...content, ...learners });
  });

  // Fixed segments before parameterised routes — /paths and /levels must win
  // over /:vendorId/:trackId.
  router.get("/paths", (req, res) => {
    const idx = getIdx();
    const o = applyContentOverride(idx.paths.data, idx.paths.hash, getOverride("paths", null, null, null));
    send(res, req, idx, o.body, o.hash);
  });
  router.get("/paths/:pathId", (req, res) => {
    const idx = getIdx();
    const p = (idx.paths.data.paths || []).find((x) => x.id === req.params.pathId);
    return p ? send(res, req, idx, p, `${idx.paths.hash}-${p.id}`) : notFound(res);
  });
  router.get("/levels", (req, res) => {
    const idx = getIdx();
    const o = applyContentOverride(idx.levels.data, idx.levels.hash, getOverride("levels", null, null, null));
    send(res, req, idx, o.body, o.hash);
  });

  // C6 (PRD-WAVE-CONTENT-OPS) — flat inventory of everything that exists, for
  // Automatos to diff before generating (no duplicate content). Public: the
  // content is already public; this is its map. ETag'd on the content version.
  router.get("/inventory", (req, res) => {
    const idx = getIdx();
    send(res, req, idx, buildInventory(idx), `${idx.contentVersion}-inventory`);
  });
  router.get("/levels/:levelId", (req, res) => {
    const idx = getIdx();
    const l = (idx.levels.data.levels || []).find((x) => x.id === req.params.levelId);
    return l ? send(res, req, idx, l, `${idx.levels.hash}-${l.id}`) : notFound(res);
  });

  // Podcasts (PRD-MT-10) — episode list + one episode. The fixed `/podcasts`
  // segment is registered BEFORE /:vendorId/:trackId so it wins the match. The
  // list returns the app's manifest shape ({version, episodes}); an episode
  // returns the bare PodcastEpisode. Both match automatos-academy-app/src/
  // podcast/schema.ts field-for-field, so the app consumes them with no adapter.
  router.get("/podcasts", (req, res) => {
    const idx = getIdx();
    const { vendor, track } = req.query;
    let episodes = idx.podcasts.data.episodes || [];
    if (typeof vendor === "string") episodes = episodes.filter((e) => e.vendorId === vendor);
    if (typeof track === "string") episodes = episodes.filter((e) => e.trackId === track);
    // ETag varies with content (podcasts.hash) AND the filter — a hex-only
    // suffix keeps the quoted ETag well-formed for any query value.
    const suffix = shortHash(`v=${typeof vendor === "string" ? vendor : ""}&t=${typeof track === "string" ? track : ""}`);
    send(res, req, idx, { version: idx.podcasts.data.version, episodes }, `${idx.podcasts.hash}-${suffix}`);
  });
  router.get("/podcasts/:episodeId", (req, res) => {
    const idx = getIdx();
    const ep = idx.podcasts.episodes.get(req.params.episodeId);
    return ep ? send(res, req, idx, ep, `${idx.podcasts.hash}-${req.params.episodeId}`) : notFound(res);
  });

  // Typed card feed (PRD-WAVE-LIVING-ACADEMY LA-1). A fixed segment registered
  // ahead of /:vendorId/:trackId — same shape as /podcasts, and it keeps a
  // track called "cards" from ever shadowing the endpoint. Cards are a VIEW
  // over the same (overlaid) documents this router already serves, so an
  // approved draft changes the feed with no republish and no card store.
  //
  //   GET /api/catalog/cards?vendor=&track=&domain=&locale=&type=quiz,flashcard
  //
  // Unfiltered it walks the whole catalog; that response is large but ETag'd
  // and cached like the rest — clients narrow by track in practice. Narrowing
  // by `domain` requires `vendor`+`track` (a domain id is only unique inside
  // its track), and drops track-scope cards, which belong to no domain.
  router.get("/cards", (req, res) => {
    const idx = getIdx();
    const vendor = typeof req.query.vendor === "string" ? req.query.vendor : null;
    const track = typeof req.query.track === "string" ? req.query.track : null;
    const domain = typeof req.query.domain === "string" ? req.query.domain : null;
    if (domain && !(vendor && track)) {
      return res.status(400).json({ error: "domain_needs_vendor_and_track" });
    }
    const result = collectCards(idx, {
      vendorId: vendor, trackId: track, domainId: domain,
      locale: req.query.locale,
      types: parseTypeFilter(req.query.type),
      getOverride, getBindings,
    });
    send(res, req, idx, {
      version: 1,
      locale: result.locale,
      count: result.count,
      invalidCards: result.invalidCards,
      cards: result.cards,
    }, `${result.hash}-cards`);
  });

  router.get("/", (req, res) => {
    const idx = getIdx();
    const o = applyContentOverride(idx.manifest.data, idx.manifest.hash, getOverride("manifest", null, null, null));
    send(res, req, idx, o.body, o.hash);
  });

  router.get("/:vendorId/:trackId", (req, res) => {
    const idx = getIdx();
    const t = idx.tracks.get(`${req.params.vendorId}/${req.params.trackId}`);
    if (!t) return notFound(res);
    // Content override first (an approved draft swaps the whole track doc),
    // THEN media bindings on top — so a bound video url always wins over the
    // draft's placeholder. Both fold into the ETag so either busts the cache.
    const co = applyContentOverride(t.track.data, t.track.hash, getOverride("track", req.params.vendorId, req.params.trackId, null));
    const b = getBindings(req.params.vendorId, req.params.trackId);
    const body = b ? overlayVideos(co.body, b.bySlot) : co.body;
    const hash = b ? `${co.hash}-${b.version}` : co.hash;
    return send(res, req, idx, body, hash);
  });

  router.get("/:vendorId/:trackId/:domainId", (req, res) => {
    const idx = getIdx();
    const t = idx.tracks.get(`${req.params.vendorId}/${req.params.trackId}`);
    const d = t && t.domains.get(req.params.domainId);
    if (!d) return notFound(res);
    // Content override first (an approved draft swaps the whole domain doc —
    // the CONTENT-LIFECYCLE lesson/question path), THEN media bindings so an
    // uploaded lesson video still serves published over the draft. Same
    // per-track bySlot map (it holds every slot for the track).
    const co = applyContentOverride(d.data, d.hash, getOverride("domain", req.params.vendorId, req.params.trackId, req.params.domainId));
    const b = getBindings(req.params.vendorId, req.params.trackId);
    const body = b ? overlayVideos(co.body, b.bySlot) : co.body;
    const hash = b ? `${co.hash}-${b.version}` : co.hash;
    return send(res, req, idx, body, hash);
  });

  return router;
}
