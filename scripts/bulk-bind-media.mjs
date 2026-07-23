#!/usr/bin/env node
// Bulk-bind staged videos (PRD-WAVE-CONTENT-OPS C3 — the machine path).
//
// After deploy-media.yml (staging mode) syncs media-staging/** to
// s3://$BUCKET/academy/<vendor>/<track>/, this binds every staged video to its
// slot via the C3 admin API (X-Admin-Key) — the DB-native, no-git-commit bulk
// equivalent of the browser Upload button. Name each file after its slot id
// (v-d1-2.mp4, v-ov-1.mp4 …); the server verifies the slot exists and HEADs the
// object before writing the binding. Idempotent — re-binding a slot upserts.
//
//   ACADEMY_ADMIN_KEY=… node scripts/bulk-bind-media.mjs \
//     [--dir media-staging] [--base https://widgets.automatos.app] \
//     [--server https://automatos-academy-production.up.railway.app] [--dry-run]
//
// Env fallbacks: MEDIA_CDN_BASE (--base), ACADEMY_SERVER_URL (--server).

import { readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const DEFAULT_BASE = "https://widgets.automatos.app";
const DEFAULT_SERVER = "https://automatos-academy-production.up.railway.app";

/** slot id = the filename with its extension stripped (staging convention). */
export const slotIdOf = (file) => file.replace(/\.[^.]+$/, "");

/** the CDN url the sync produces for a staged file (base has no trailing slash). */
export const bindUrl = (base, vendor, track, file) =>
  `${String(base).replace(/\/+$/, "")}/academy/${vendor}/${track}/${file}`;

/**
 * PURE. Given relative staging paths ("anthropic/cca-f/v-d1-2.mp4") produce the
 * bindings to write. Only <vendor>/<track>/<file> videos qualify; anything at a
 * different depth or a non-video extension is skipped (so .mp3/.vtt and stray
 * files never mis-bind as videos).
 */
export function planBindings(relPaths, base) {
  const out = [];
  for (const rel of relPaths) {
    const parts = rel.split("/").filter(Boolean);
    if (parts.length !== 3) continue;
    const [vendor, track, file] = parts;
    if (!VIDEO_EXT.test(file)) continue;
    out.push({ vendor, track, file, slotId: slotIdOf(file), url: bindUrl(base, vendor, track, file), kind: "video" });
  }
  return out;
}

/** fs walk → forward-slash relative paths under root (thin, impure). */
export function walkStaging(root) {
  const rels = [];
  const walk = (dir, prefix) => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const full = join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      let s;
      try { s = statSync(full); } catch { continue; }
      if (s.isDirectory()) walk(full, rel);
      else rels.push(rel);
    }
  };
  walk(root, "");
  return rels;
}

/** POST each binding to the admin API. fetchImpl injectable for tests. */
export async function bindAll(bindings, { server, adminKey, fetchImpl = fetch, log = console }) {
  const info = log.log ? log.log.bind(log) : () => {};
  const err = log.error ? log.error.bind(log) : () => {};
  let bound = 0, failed = 0;
  for (const b of bindings) {
    try {
      const r = await fetchImpl(`${server}/api/admin/media/bind`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ vendor: b.vendor, track: b.track, slotId: b.slotId, kind: b.kind, url: b.url }),
      });
      if (r.ok) { bound++; info(`  ✓ ${b.vendor}/${b.track}/${b.slotId}`); }
      else {
        failed++;
        let detail = "";
        try { detail = (await r.text()).slice(0, 140); } catch { /* ignore */ }
        err(`  ✗ ${b.vendor}/${b.track}/${b.slotId} — ${r.status} ${detail}`);
      }
    } catch (e) {
      failed++;
      err(`  ✗ ${b.vendor}/${b.track}/${b.slotId} — ${e.message}`);
    }
  }
  return { bound, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (flag, def) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
  const dryRun = args.includes("--dry-run");
  const root = opt("--dir", "media-staging");
  const base = opt("--base", process.env.MEDIA_CDN_BASE || DEFAULT_BASE);
  const server = opt("--server", process.env.ACADEMY_SERVER_URL || DEFAULT_SERVER).replace(/\/+$/, "");
  const adminKey = process.env.ACADEMY_ADMIN_KEY;

  const bindings = planBindings(walkStaging(root), base);
  if (!bindings.length) {
    console.log(`No staged videos under ${root}/ (expected ${root}/<vendor>/<track>/<slotId>.mp4).`);
    return;
  }
  console.log(`Found ${bindings.length} staged video(s) under ${root}/:`);
  for (const b of bindings) console.log(`  ${b.vendor}/${b.track}  ${b.slotId}  ← ${b.file}`);

  if (dryRun) { console.log("\n--dry-run: nothing written."); return; }
  if (!adminKey) { console.error("\nACADEMY_ADMIN_KEY is required to bind (set it as a repo secret / env)."); process.exit(1); }

  console.log(`\nBinding via ${server} …`);
  const { bound, failed } = await bindAll(bindings, { server, adminKey });
  console.log(`\n${bound} bound, ${failed} failed.`);
  if (failed) process.exit(1);
}

// CLI only — stay importable (and side-effect-free) for tests.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) main();
