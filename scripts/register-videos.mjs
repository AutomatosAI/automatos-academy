#!/usr/bin/env node
// Video registry tool (PRD-GROWTH scale problem: ~70+ videos, no hand-editing).
//
// Two modes:
//
//   --swap-cdn --base https://widgets.automatos.app
//       Rewrites every registered video whose url points into the repo
//       (/content/<vendor>/videos/…) to the CDN
//       (<base>/academy/<vendor>/videos/…). Run once after the MIGRATE
//       workflow has synced the legacy files; then git rm the MP4s.
//
//   --publish <dir> --vendor <v> --track <t> --base https://widgets.automatos.app
//       Registers NEW videos: for every file in <dir> named after its slot id
//       (v-d1-2.mp4, v-ov-1.mp4, v-m3-1.mp4 …) find the matching placeholder in
//       the track/domain JSONs and flip it to published with the CDN url
//       (<base>/academy/<v>/<t>/<file>). Unmatched files and still-placeholder
//       slots are reported, never guessed.
//
// Data-only: touches url/provider/status on existing videos[] entries; never
// creates or deletes slots. Idempotent — re-running is safe.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "public", "content");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const base = (opt("--base") || "https://widgets.automatos.app").replace(/\/$/, "");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n", "utf8");

function eachTrackFile(cb) {
  const manifest = read(join(CONTENT, "manifest.json"));
  for (const v of manifest.vendors) {
    for (const t of v.tracks || []) {
      const dir = join(CONTENT, v.id, t.trackId);
      const tp = join(dir, "track.json");
      if (!existsSync(tp)) continue;
      const track = read(tp);
      cb({ vendorId: v.id, trackId: t.trackId, path: tp, data: track });
      for (const df of track.domainFiles || []) {
        const dp = join(dir, df);
        if (existsSync(dp)) cb({ vendorId: v.id, trackId: t.trackId, path: dp, data: read(dp) });
      }
    }
  }
}

let changed = 0;

if (flag("--swap-cdn")) {
  eachTrackFile(({ path, data }) => {
    let dirty = false;
    for (const vid of data.videos || []) {
      const m = typeof vid.url === "string" && vid.url.match(/^\/content\/([^/]+)\/videos\/(.+)$/);
      if (m) {
        vid.url = `${base}/academy/${m[1]}/videos/${m[2]}`;
        dirty = true;
        changed++;
      }
    }
    if (dirty) { write(path, data); console.log(`  ✓ ${path.replace(ROOT + "/", "")}`); }
  });
  console.log(`\n${changed} video url${changed === 1 ? "" : "s"} swapped to ${base}/academy/…`);
  if (!changed) console.log("(nothing matched /content/<vendor>/videos/ — already migrated?)");
  process.exit(0);
}

const pubDir = opt("--publish");
if (pubDir) {
  const vendor = opt("--vendor"), track = opt("--track");
  if (!vendor || !track) { console.error("--publish needs --vendor <id> --track <id>"); process.exit(1); }
  const files = readdirSync(pubDir).filter((f) => /\.(mp4|mp3)$/.test(f));
  const byId = new Map(files.map((f) => [f.replace(/\.(mp4|mp3)$/, ""), f]));
  const matched = new Set();

  eachTrackFile(({ vendorId, trackId, path, data }) => {
    if (vendorId !== vendor || trackId !== track) return;
    let dirty = false;
    for (const vid of data.videos || []) {
      const file = byId.get(vid.id);
      if (!file) continue;
      vid.url = `${base}/academy/${vendor}/${track}/${file}`;
      vid.provider = "file";
      vid.status = "published";
      matched.add(file);
      dirty = true;
      changed++;
    }
    if (dirty) { write(path, data); console.log(`  ✓ ${path.replace(ROOT + "/", "")}`); }
  });

  const unmatchedFiles = files.filter((f) => !matched.has(f));
  console.log(`\n${changed} slot${changed === 1 ? "" : "s"} published for ${vendor}/${track}`);
  if (unmatchedFiles.length) {
    console.log(`! ${unmatchedFiles.length} file(s) matched no slot id (name files after the slot id, e.g. v-d1-2.mp4):`);
    unmatchedFiles.forEach((f) => console.log(`    ${f}`));
    process.exitCode = 2;
  }
  process.exit();
}

console.log(`Usage:
  node scripts/register-videos.mjs --swap-cdn [--base <cdn>]
  node scripts/register-videos.mjs --publish <dir> --vendor <id> --track <id> [--base <cdn>]`);
process.exit(1);
