#!/usr/bin/env node
// PRD-U3 S2 — publish the validated content tree into Postgres.
//
// Git stays the authoring source; this script is the ONLY writer of the
// content tables. Pipeline (§4.2): validate (the exact `npm run validate`
// gate) → build the index from disk with the SAME buildContentIndex machinery
// files-mode serving uses → insert every document's canonical bytes + the
// version's scopes snapshot in ONE transaction, flipping the content_current
// pointer as its last statement — a publish is all-or-nothing, and there is
// no window where the version exists but the pointer flip can be lost.
//
// Idempotent: if contentVersion already exists in content_versions, log and
// exit 0 WITHOUT touching the pointer — so a redeploy never overrides a
// deliberate rollback (rollback = pointing content_current at an old version;
// the tree that produced the bad version still hashes to it and stays
// skipped). Concurrent publishers of the same tree (two replicas booting at
// once) race on the content_versions primary key: the loser's transaction
// rolls back whole and it logs and exits 0, exactly like the skip above.
//
// The flip side of that skip: contentVersion is a pure hash of the tree, so a
// git revert (or a Railway rollback to an earlier image) rebuilds a version
// that already exists and the pointer stays on the newer one. The skip then
// logs a WARNING naming both versions; `--repoint` moves the pointer to the
// deployed tree's version. An EMPTY pointer is always filled in (there is no
// rollback to preserve), or the server would refuse to boot on every restart.
//
// Usage:
//   DATABASE_URL=postgres://… npm run publish-content
//   npm run publish-content -- --repoint   (also point content_current at
//                                           this tree when it is already
//                                           published — the fix for a revert)
//   npm run publish-content -- --dry-run   (validate + print version/counts;
//                                           no DATABASE_URL needed)
//
// Trigger (2026-10-19): docker-entrypoint.sh runs it on every boot of a
// CONTENT_SOURCE=db deploy, after migrations, inside Railway — production
// Postgres is only reachable on Railway's private network. Manual lane (it
// re-runs the publish of the running image's tree, so it helps after a
// transient database error at boot; a content fix needs a new deploy):
//   railway ssh --service automatos-academy -- "npm run publish-content"
// .github/workflows/content-publish.yml runs only the --dry-run, as a gate.
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { buildContentIndex } from "../server/catalog.js";

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "content");

// Postgres unique_violation on the version journal's primary key: another
// publisher committed this exact contentVersion between our idempotency check
// and our insert. Any other unique violation (e.g. a duplicate scope inside
// one tree) is a real defect and still throws.
const UNIQUE_VIOLATION = "23505";
const VERSION_PK = "content_versions_pkey";
const isLostPublishRace = (e) => e?.code === UNIQUE_VIOLATION && e?.constraint === VERSION_PK;

// Bounds for the boot-time publish. A publish that cannot connect, waits on a
// lock someone else holds (an operator's open psql transaction, a stuck
// replica), or loses its connection mid-query must FAIL rather than hang: a
// failure prints the entrypoint's banner and the server boots on the last
// published version, while a hang blocks `exec node server.js` until
// Railway's healthcheck gives up.
// LOCK_TIMEOUT_MS stays well above a normal publish transaction, so a replica
// that loses the insert race still waits for the winner's COMMIT and gets
// 23505 (handled above), not 55P03.
// lock_timeout and statement_timeout are enforced by the Postgres server.
// query_timeout is the client-side backstop for a dead socket, which the
// server-side statement_timeout cannot see; it sits above statement_timeout so
// a slow statement still fails with the server's own error.
// PUBLISH_DEADLINE_MS caps the whole CLI run (validate, connect, every
// statement), because the per-statement bounds add up across a publish's
// statements (one INSERT per document, ~85 in all today). It sits above
// CONNECT + QUERY, so a single dead query still reports its own error first.
const CONNECT_TIMEOUT_MS = 15_000;
const LOCK_TIMEOUT_MS = 60_000;
const STATEMENT_TIMEOUT_MS = 120_000;
const QUERY_TIMEOUT_MS = STATEMENT_TIMEOUT_MS + 15_000;
const PUBLISH_DEADLINE_MS = 180_000;

// pg's error when query_timeout fires. The socket is then presumed dead: a
// ROLLBACK would queue behind the hung query and wait out a second
// query_timeout, and closing the connection (finally → client.end(), which
// destroys the socket under an active query) rolls the transaction back on
// the server anyway.
const isClientQueryTimeout = (e) => e?.message === "Query read timeout";

/**
 * The deployed tree's version already exists in content_versions. Leave the
 * pointer alone (that is what keeps a deliberate rollback across redeploys),
 * except: an empty pointer is filled in, and `repoint` moves it here. When it
 * points elsewhere and `repoint` is off, warn — a git revert lands here.
 */
async function reconcileExistingVersion(client, version, { repoint, log }) {
  const { rows } = await client.query("SELECT content_version FROM content_current WHERE id = true");
  const current = rows[0]?.content_version ?? null;
  if (current === null) {
    const { rowCount } = await client.query(
      "INSERT INTO content_current (id, content_version) VALUES (true, $1) ON CONFLICT (id) DO NOTHING", [version]);
    log(rowCount
      ? `[publish] content_current was empty — pointed it at ${version}`
      : `[publish] content_current was empty and a concurrent run filled it — left alone`);
    return;
  }
  if (current === version) {
    log(`[publish] ${version} already published — nothing to do (pointer untouched, so rollbacks survive re-runs)`);
    return;
  }
  if (repoint) {
    await client.query(
      "UPDATE content_current SET content_version = $1, updated_at = now() WHERE id = true", [version]);
    log(`[publish] --repoint: content_current moved from ${current} to ${version}`);
    return;
  }
  // The entrypoint prints its normal "publish finished" line after this (the
  // publish exits 0), so the banner is what makes it as visible in the
  // Railway log as a failed publish.
  log("[publish] ===================================================================");
  log("[publish] THIS DEPLOY'S COURSE CONTENT IS NOT LIVE — content_current points at another version");
  log(`[publish] WARNING ${version} is already published but content_current is ${current} — pointer left alone ` +
    "(deliberate rollback, or a git revert to an earlier tree?). To serve this deploy's tree: " +
    'railway ssh --service automatos-academy -- "npm run publish-content -- --repoint", or ' +
    `UPDATE content_current SET content_version = '${version}', updated_at = now() WHERE id = true;`);
  log("[publish] ===================================================================");
}

/**
 * Publish CONTENT_DIR's tree. Returns { contentVersion, published, counts };
 * `published` is false for dry runs and idempotent skips (including a
 * --repoint or an empty-pointer fill, which write no version). Exported so the CI
 * equivalence test (tests/content-db.test.mjs) publishes through the same
 * code path as the boot-time publish — no spawn, no duplicate SQL.
 * `queryTimeoutMs` exists only so tests/deploy-lane.test.mjs can prove a dead
 * connection fails fast; the boot publish always uses QUERY_TIMEOUT_MS.
 */
export async function publishContent({
  databaseUrl, dryRun = false, repoint = false, log = console.log, queryTimeoutMs = QUERY_TIMEOUT_MS,
} = {}) {
  // 1. Hard validation gate — the same judge as `npm run validate`. The
  //    validator is a top-level script: importing it runs it, it prints its
  //    report, and it process.exit(1)s on any error, so nothing below ever
  //    runs on bad content. (Module cache makes repeat calls in one process
  //    free — the gate has already passed.)
  await import("./validate-content.mjs");

  // 2. Index from disk — identical hashing/rollup to files-mode serving.
  //    No journalPath → no side effects on the local journal file.
  const idx = buildContentIndex(CONTENT_DIR);
  const counts = idx.documents.reduce(
    (acc, d) => ({ ...acc, [d.scopeKind]: (acc[d.scopeKind] || 0) + 1 }), {});
  const summary = Object.entries(counts).map(([k, n]) => `${k}:${n}`).join(" ");

  if (dryRun) {
    log(`[publish] DRY RUN — contentVersion ${idx.contentVersion}, ${idx.documents.length} documents (${summary}); nothing written`);
    return { contentVersion: idx.contentVersion, published: false, counts };
  }
  if (!databaseUrl) {
    throw new Error("[publish] DATABASE_URL is required (or pass --dry-run)");
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    lock_timeout: LOCK_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: queryTimeoutMs,
  });
  await client.connect();
  try {
    // 3. Idempotency — this exact tree is already published.
    const { rows } = await client.query(
      "SELECT 1 FROM content_versions WHERE content_version = $1", [idx.contentVersion]);
    if (rows.length) {
      await reconcileExistingVersion(client, idx.contentVersion, { repoint, log });
      return { contentVersion: idx.contentVersion, published: false, counts };
    }

    // 4. One transaction: version snapshot → every document → pointer flip.
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO content_versions (content_version, scopes) VALUES ($1, $2)",
      [idx.contentVersion, JSON.stringify(idx.scopes)]);
    for (const d of idx.documents) {
      // canonical = the exact file text, hashed for ETags and parsed for
      // serving; payload = the same text cast to jsonb, for queryability only.
      await client.query(
        `INSERT INTO content_documents
           (content_version, scope_kind, vendor_id, track_id, domain_id, rel_path, payload, canonical, sha256, bytes)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
        [idx.contentVersion, d.scopeKind, d.vendorId, d.trackId, d.domainId, d.relPath,
         d.canonical, d.canonical, d.sha256, d.bytes]);
    }
    await client.query(
      `INSERT INTO content_current (id, content_version) VALUES (true, $1)
       ON CONFLICT (id) DO UPDATE SET content_version = EXCLUDED.content_version, updated_at = now()`,
      [idx.contentVersion]);
    await client.query("COMMIT");

    log(`[publish] ${idx.contentVersion} published — ${idx.documents.length} documents (${summary}); current pointer flipped`);
    return { contentVersion: idx.contentVersion, published: true, counts };
  } catch (e) {
    if (!isClientQueryTimeout(e)) await client.query("ROLLBACK").catch(() => {});
    if (isLostPublishRace(e)) {
      log(`[publish] ${idx.contentVersion} was published by a concurrent run (another replica booting?) — nothing to do`);
      return { contentVersion: idx.contentVersion, published: false, counts };
    }
    throw e;
  } finally {
    await client.end();
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dryRun = process.argv.includes("--dry-run");
  const repoint = process.argv.includes("--repoint");
  // unref(): the cap never keeps a finished publish alive.
  const deadline = setTimeout(() => {
    console.error(`[publish] gave up after ${PUBLISH_DEADLINE_MS / 1000} s — the database stopped answering ` +
      "or the publish is stuck; an open publish transaction rolls back when this process exits");
    process.exit(1);
  }, PUBLISH_DEADLINE_MS);
  deadline.unref();
  try {
    await publishContent({ databaseUrl: process.env.DATABASE_URL, dryRun, repoint });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
