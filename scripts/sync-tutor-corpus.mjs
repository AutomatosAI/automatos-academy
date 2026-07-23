#!/usr/bin/env node
// Sync the tutor corpus → the Academy workspace KB (PRD-WAVE-CONTENT-OPS C5).
//
// The tutor is an Automatos workspace agent; the platform builds a knowledge
// graph from the workspace's documents. This reads tutor-corpus/corpus-manifest.json
// (written by export-tutor-corpus.mjs) and pushes each markdown doc to
// POST /api/documents/upload with per-course `tags` (academy,<vendor>,<track>,<domain>)
// so every chunk in the graph maps back to the course it came from — that's what
// lets the tutor answer "explain domain 3 of GH-300" with the right context.
//
// Idempotent: the plane dedupes by content hash, so an UNCHANGED doc returns
// status "duplicate" (no-op). --replace deletes a same-named doc first, so an
// EDITED doc (new hash) doesn't leave a stale twin behind.
//
//   ORCHESTRATOR_API_KEY=… ACADEMY_WORKSPACE_ID=… \
//     node scripts/sync-tutor-corpus.mjs [--server https://api.automatos.app] [--replace] [--dry-run]
//
// Auth note: the documents plane requires the workspace ORCHESTRATOR_API_KEY —
// scoped ak_srv_* keys are not accepted there yet (companion-platform gap, see
// docs/prds/PRD-TUTOR-CORPUS-SYNC.md). Treat the key as broad; it is set only in
// CI/Railway env, never in the repo.

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = join(ROOT, "tutor-corpus");
const MANIFEST = join(CORPUS, "corpus-manifest.json");
const DEFAULT_SERVER = "https://api.automatos.app";

/** Flatten a corpus-relative path to a globally-unique, STABLE KB filename
 *  (anthropic--cca-f/00-track-overview.md → anthropic--cca-f__00-track-overview.md)
 *  — stable so --replace can find the prior copy by exact name. */
export const uploadFilename = (relPath) => relPath.replace(/\//g, "__");

export const documentDescription = (e) =>
  `Automatos Academy tutor corpus — ${e.title} (${e.kind})`;

/** PURE: manifest → upload plan. */
export function planUploads(manifest) {
  return (manifest.files || []).map((e) => ({
    relPath: e.file,
    name: uploadFilename(e.file),
    tags: e.tags,
    description: documentDescription(e),
    vendor: e.vendor,
    track: e.track,
    domain: e.domain,
  }));
}

const defaultRead = (relPath) => readFileSync(join(CORPUS, relPath), "utf8");

/** GET the workspace docs matching a name, return exact-filename matches. */
async function findByName(server, headers, name, fetchImpl) {
  const r = await fetchImpl(`${server}/api/documents/?search=${encodeURIComponent(name)}&limit=1000`, { headers });
  if (!r.ok) return [];
  const list = await r.json().catch(() => []);
  return (Array.isArray(list) ? list : []).filter((d) => d.filename === name);
}

/**
 * Push every planned doc. Injectable fetchImpl + readFile keep this unit-testable
 * with no network and no filesystem. Returns per-status counts.
 */
export async function syncAll(items, { server, apiKey, workspaceId, replace = false, fetchImpl = fetch, readFile = defaultRead, log = console } = {}) {
  const headers = { "x-api-key": apiKey, "X-Workspace-ID": workspaceId };
  const info = log.log ? log.log.bind(log) : () => {};
  const err = log.error ? log.error.bind(log) : () => {};
  const counts = { uploaded: 0, duplicate: 0, replaced: 0, failed: 0 };

  for (const item of items) {
    try {
      if (replace) {
        for (const doc of await findByName(server, headers, item.name, fetchImpl)) {
          const d = await fetchImpl(`${server}/api/documents/${doc.id}`, { method: "DELETE", headers });
          if (d.ok) counts.replaced++;
        }
      }
      const form = new FormData();
      form.append("file", new Blob([readFile(item.relPath)], { type: "text/markdown" }), item.name);
      form.append("tags", item.tags);
      form.append("description", item.description);
      const r = await fetchImpl(`${server}/api/documents/upload`, { method: "POST", headers, body: form });
      if (!r.ok) {
        counts.failed++;
        let detail = "";
        try { detail = (await r.text()).slice(0, 140); } catch { /* ignore */ }
        err(`  ✗ ${item.name} — ${r.status} ${detail}`);
        continue;
      }
      const body = await r.json().catch(() => ({}));
      if (body.status === "duplicate") { counts.duplicate++; info(`  = ${item.name} (unchanged)`); }
      else { counts.uploaded++; info(`  ✓ ${item.name}  [${item.tags}]`); }
    } catch (e) {
      counts.failed++;
      err(`  ✗ ${item.name} — ${e.message}`);
    }
  }
  return counts;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (flag, def) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
  const dryRun = args.includes("--dry-run");
  const replace = args.includes("--replace");
  const server = opt("--server", process.env.AUTOMATOS_API_URL || DEFAULT_SERVER).replace(/\/+$/, "");
  const apiKey = process.env.ORCHESTRATOR_API_KEY || process.env.AUTOMATOS_API_KEY;
  const workspaceId = process.env.ACADEMY_WORKSPACE_ID;

  if (!existsSync(MANIFEST)) {
    console.error(`No corpus manifest at ${MANIFEST}. Run: npm run tutor-corpus`);
    process.exit(1);
  }
  const items = planUploads(JSON.parse(readFileSync(MANIFEST, "utf8")));
  if (!items.length) { console.log("Corpus manifest is empty — nothing to sync."); return; }

  console.log(`Tutor corpus: ${items.length} doc(s) → ${server}${replace ? " (replace mode)" : ""}`);
  for (const it of items) console.log(`  ${it.name}  [${it.tags}]`);

  if (dryRun) { console.log("\n--dry-run: nothing uploaded."); return; }
  if (!apiKey) { console.error("\nORCHESTRATOR_API_KEY (or AUTOMATOS_API_KEY) is required."); process.exit(1); }
  if (!workspaceId) { console.error("\nACADEMY_WORKSPACE_ID is required (the target Academy workspace)."); process.exit(1); }

  console.log(`\nUploading to workspace ${workspaceId} …`);
  const c = await syncAll(items, { server, apiKey, workspaceId, replace });
  console.log(`\n${c.uploaded} uploaded · ${c.duplicate} unchanged · ${c.replaced} replaced · ${c.failed} failed.`);
  if (c.failed) process.exit(1);
}

// CLI only — stay importable + side-effect-free for tests.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) main();
