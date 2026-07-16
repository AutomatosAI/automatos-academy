/**
 * Content index from Postgres (PRD-U3 S3) — the file loader's twin.
 *
 * Builds the SAME in-memory index shape as buildContentIndex (server/
 * catalog.js) from the rows publish-content.mjs ingested, so
 * createCatalogRouter serves byte-identical responses from either source and
 * per-request I/O stays zero. Only server.js's CONTENT_SOURCE=db branch
 * imports this module — the default files-mode boot never touches pg (same
 * posture as server/spine/db.js).
 *
 * Byte-fidelity (PRD-U3 §8): rows are parsed from their `canonical` text —
 * the exact file bytes — never from the jsonb payload, so JSON.parse yields
 * the same key order and res.json() the same body bytes as files mode.
 * Three integrity tripwires guard every load, not just CI:
 *   1. each row's canonical text must re-hash to its stored sha256;
 *   2. the (rel_path, hash) rollup recomputed from rows must equal the
 *      version string the current pointer names;
 *   3. the scopes snapshot rebuilt from rows must deep-equal the stored
 *      journal entry.
 * A tripwire firing at boot fails the boot loudly (same as malformed files
 * today); during the 60 s refresh (D-U7) the poller catches it and keeps
 * serving the last good index.
 */
import pg from "pg";
import { createHash } from "crypto";
import { isDeepStrictEqual } from "util";
import { versionRollup, buildScopesSnapshot } from "./catalog.js";
import { parsePodcastManifest } from "./podcasts.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");

/** Small dedicated pool — a handful of queries per minute, never per-request. */
export function createContentPool(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("[catalog] DATABASE_URL is required when CONTENT_SOURCE=db");
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  pool.on("error", (e) => console.error("[catalog] idle pg client error:", e.message));
  return pool;
}

/** The current pointer's version, or null when nothing has been published. */
export async function readCurrentVersion(pool) {
  const { rows } = await pool.query("SELECT content_version FROM content_current WHERE id = true");
  return rows.length ? rows[0].content_version : null;
}

/**
 * Load the current version's rows and assemble the index. Throws (fail-loud)
 * on: no published content, an incomplete document set, or any integrity
 * tripwire — never serves a half-right catalog.
 */
export async function buildContentIndexFromDb(pool) {
  const contentVersion = await readCurrentVersion(pool);
  if (!contentVersion) {
    throw new Error("[catalog] CONTENT_SOURCE=db but no content published — run `npm run publish-content` against this database first");
  }

  // Row order = publish insertion order = the file loader's traversal order
  // (bigserial in one transaction), so Map insertion order — and with it the
  // domainFiles ordering the shells render — matches files mode exactly.
  const { rows } = await pool.query(
    `SELECT scope_kind, vendor_id, track_id, domain_id, rel_path, canonical, sha256
       FROM content_documents WHERE content_version = $1 ORDER BY id`,
    [contentVersion],
  );

  const files = new Map();     // rel path → hash (rollup recomputation)
  const documents = [];        // same shape as the file loader's documents[]
  const parseRow = (row) => {
    if (sha(row.canonical) !== row.sha256) {
      throw new Error(`[catalog] integrity: ${row.rel_path} canonical bytes do not match stored sha256 (version ${contentVersion})`);
    }
    const hash = row.sha256.slice(0, 12);
    files.set(row.rel_path, hash);
    documents.push({
      scopeKind: row.scope_kind, vendorId: row.vendor_id, trackId: row.track_id, domainId: row.domain_id,
      relPath: row.rel_path, canonical: row.canonical, sha256: row.sha256, hash,
      bytes: Buffer.byteLength(row.canonical, "utf8"),
    });
    return { data: JSON.parse(row.canonical), hash, raw: row.canonical };
  };

  let manifest, paths, levels, podcasts;
  const tracks = new Map();
  const domainRows = [];
  for (const row of rows) {
    switch (row.scope_kind) {
      case "manifest": manifest = parseRow(row); break;
      case "paths": paths = parseRow(row); break;
      case "levels": levels = parseRow(row); break;
      case "podcasts": {
        const p = parseRow(row);
        // One judge for episodes across sources (schema.ts parity) — throws
        // on malformed episodes exactly like the file loader's boot.
        podcasts = { ...parsePodcastManifest(p.raw, `db:${row.rel_path}`), raw: p.raw };
        break;
      }
      case "track":
        tracks.set(`${row.vendor_id}/${row.track_id}`, { track: parseRow(row), domains: new Map() });
        break;
      case "domain": domainRows.push(row); break; // second pass — track rows first
      default: throw new Error(`[catalog] unknown scope_kind '${row.scope_kind}' in content_documents`);
    }
  }
  for (const row of domainRows) {
    const t = tracks.get(`${row.vendor_id}/${row.track_id}`);
    if (!t) throw new Error(`[catalog] domain row ${row.rel_path} has no track row (version ${contentVersion})`);
    t.domains.set(row.domain_id, parseRow(row));
  }
  for (const [what, doc] of [["manifest", manifest], ["paths", paths], ["levels", levels], ["podcasts", podcasts]]) {
    if (!doc) throw new Error(`[catalog] published version ${contentVersion} is missing its ${what} document`);
  }

  // Tripwire 2: the version string must be re-derivable from the rows.
  const recomputed = versionRollup(files);
  if (recomputed !== contentVersion) {
    throw new Error(`[catalog] integrity: rows roll up to ${recomputed}, current pointer says ${contentVersion}`);
  }

  // Durable journal (PRD-U3 goal 4): every published version, oldest first,
  // with the served version moved to the tail — computeChanges reads `to`
  // from the tail, and a rollback re-surfaces an old version exactly like the
  // file journal does.
  const { rows: versionRows } = await pool.query(
    "SELECT content_version, scopes, published_at FROM content_versions ORDER BY published_at ASC, content_version ASC",
  );
  const entries = versionRows.map((r) => ({
    version: r.content_version,
    generatedAt: r.published_at.toISOString(),
    scopes: r.scopes,
  }));
  const current = entries.find((e) => e.version === contentVersion);
  if (!current) throw new Error(`[catalog] current pointer names ${contentVersion} but content_versions has no such row`);
  const journal = [...entries.filter((e) => e.version !== contentVersion), current];

  // Tripwire 3: the snapshot rebuilt from rows must equal the published one.
  const scopes = buildScopesSnapshot({ manifest, paths, levels, podcasts, tracks });
  if (!isDeepStrictEqual(scopes, current.scopes)) {
    throw new Error(`[catalog] integrity: scopes rebuilt from rows differ from the content_versions snapshot for ${contentVersion}`);
  }

  return {
    manifest, tracks, paths, levels, podcasts,
    contentVersion,
    generatedAt: current.generatedAt, // publish time — files mode uses boot time
    scopes, journal, documents,
  };
}

/**
 * One poll step (extracted so tests can drive it without timers): check the
 * current pointer; on change, rebuild and hand the new index to `swap`.
 * Returns the new version string when a swap happened, null otherwise.
 * Errors propagate — startContentRefresh turns them into keep-serving warns.
 */
export async function refreshContentIndex(pool, { getCurrent, swap }) {
  const version = await readCurrentVersion(pool);
  if (!version || version === getCurrent().contentVersion) return null;
  // buildContentIndexFromDb re-reads the pointer itself, so a publish landing
  // mid-rebuild just means we swap to the even-newer version.
  const next = await buildContentIndexFromDb(pool);
  swap(next);
  return next.contentVersion;
}

/**
 * D-U7: poll the current pointer every 60 s; on change rebuild the index and
 * swap atomically (one reference assignment via `swap`). Any failure after a
 * good boot keeps serving the last good index with one warning per distinct
 * error (no 60 s log spam). The timer is unref'd so tests and one-shot
 * scripts exit cleanly.
 */
export function startContentRefresh(pool, { getCurrent, swap }, intervalMs = 60_000) {
  let inFlight = false;
  let lastWarned = "";
  const timer = setInterval(async () => {
    if (inFlight) return; // a slow rebuild must not stack behind itself
    inFlight = true;
    try {
      await refreshContentIndex(pool, { getCurrent, swap });
      lastWarned = "";
    } catch (e) {
      if (e.message !== lastWarned) {
        console.warn(`[catalog] content refresh failed — keeping the last good index: ${e.message}`);
        lastWarned = e.message;
      }
    } finally {
      inFlight = false;
    }
  }, intervalMs);
  timer.unref();
  return timer;
}
