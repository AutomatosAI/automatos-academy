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
// exit 0 WITHOUT touching the pointer — so re-running CI never overrides a
// deliberate rollback (rollback = pointing content_current at an old version;
// the tree that produced the bad version still hashes to it and stays
// skipped).
//
// Usage:
//   DATABASE_URL=postgres://… npm run publish-content
//   npm run publish-content -- --dry-run   (validate + print version/counts;
//                                           no DATABASE_URL needed)
//
// Trigger (D-U6): .github/workflows/content-publish.yml on merge to main
// touching public/content/**, plus manual workflow_dispatch. Local runs are
// possible but never required.
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { buildContentIndex } from "../server/catalog.js";

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "content");

/**
 * Publish CONTENT_DIR's tree. Returns { contentVersion, published, counts };
 * `published` is false for dry runs and idempotent skips. Exported so the CI
 * equivalence test (tests/content-db.test.mjs) publishes through the same
 * code path as the workflow — no spawn, no duplicate SQL.
 */
export async function publishContent({ databaseUrl, dryRun = false, log = console.log } = {}) {
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
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // 3. Idempotency — this exact tree is already published.
    const { rows } = await client.query(
      "SELECT 1 FROM content_versions WHERE content_version = $1", [idx.contentVersion]);
    if (rows.length) {
      log(`[publish] ${idx.contentVersion} already published — nothing to do (pointer untouched, so rollbacks survive re-runs)`);
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
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dryRun = process.argv.includes("--dry-run");
  try {
    await publishContent({ databaseUrl: process.env.DATABASE_URL, dryRun });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
