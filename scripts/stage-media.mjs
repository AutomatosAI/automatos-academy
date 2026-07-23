#!/usr/bin/env node
// Stage produced videos for bulk upload (PRD-WAVE-CONTENT-OPS).
//
// NotebookLM downloads are named by their title (Beyond_The_AI_Hype.mp4); the
// upload pipeline wants media-staging/<vendor>/<track>/<slotId>.mp4. This reads
// the reviewed media-map.json and copies+renames each mapped file into that
// shape, validating that the source exists AND the slot is a real video slot in
// the track (never invents a binding). Then either commit media-staging/ on a
// short-lived branch for deploy-media (staging, bind=true), or `aws s3 sync` it
// up + scripts/register-videos.mjs / bulk-bind.
//
//   node scripts/stage-media.mjs                 # dry-run: validate + report every track
//   node scripts/stage-media.mjs --commit        # actually copy into media-staging/
//   node scripts/stage-media.mjs --track ABF     # one track
//   node scripts/stage-media.mjs --out ./staged  # different output root

import { readFileSync, existsSync, readdirSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLATFORM_ROOT = resolve(ROOT, ".."); // sources (DUMPING AREA) live beside the repo
const CONTENT = join(ROOT, "public", "content");
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

/** Every video slot id defined in a track (track-level + per domain). */
export function trackSlotIds(contentDir, vendor, track) {
  const dir = join(contentDir, vendor, track);
  const tj = JSON.parse(readFileSync(join(dir, "track.json"), "utf8"));
  const ids = new Set((tj.videos || []).map((v) => v.id));
  for (const df of tj.domainFiles || []) {
    try {
      const d = JSON.parse(readFileSync(join(dir, df), "utf8"));
      for (const v of d.videos || []) ids.add(v.id);
    } catch { /* a coming-soon domain with no file — skip */ }
  }
  return ids;
}

/**
 * PURE. Plan one track: classify each mapped file, and surface the two gaps that
 * matter — files in the folder nobody mapped, and mapped slots that collide.
 * @param files      map of filename → slotId (from media-map.json)
 * @param validSlots Set of real slot ids in the track
 * @param sourceList filenames actually present in the source folder
 */
export function planTrack({ files, validSlots, sourceList }) {
  const staged = [];
  const errors = [];
  const seenSlots = new Map(); // slot → filename, to catch two files → one slot
  for (const [file, slot] of Object.entries(files || {})) {
    if (!sourceList.includes(file)) { errors.push({ file, slot, reason: "source-missing" }); continue; }
    if (!validSlots.has(slot)) { errors.push({ file, slot, reason: "unknown-slot" }); continue; }
    if (seenSlots.has(slot)) { errors.push({ file, slot, reason: `slot-reused (also ${seenSlots.get(slot)})` }); continue; }
    seenSlots.set(slot, file);
    staged.push({ file, slot });
  }
  const mapped = new Set(Object.keys(files || {}));
  const unmappedVideos = sourceList.filter((f) => VIDEO_EXT.test(f) && !mapped.has(f));
  return { staged, errors, unmappedVideos };
}

function listSource(absDir) {
  try { return readdirSync(absDir); } catch { return null; }
}

function main() {
  const args = process.argv.slice(2);
  const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
  const commit = args.includes("--commit");
  const only = opt("--track", null);
  const outRoot = resolve(opt("--out", join(ROOT, "media-staging")));
  const mapPath = opt("--map", join(ROOT, "media-map.json"));

  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const tracks = (map.tracks || []).filter((t) => !only || t.code === only);
  if (!tracks.length) { console.error(only ? `No track '${only}' in the map.` : "No tracks in the map."); process.exit(1); }

  let totalStaged = 0, totalErr = 0;
  for (const t of tracks) {
    const absSource = resolve(PLATFORM_ROOT, t.source);
    const sourceList = listSource(absSource);
    console.log(`\n${t.code} → ${t.vendor}/${t.track}   (${t.source})`);
    if (sourceList === null) { console.log(`  ! source folder not found — skipping (${absSource})`); totalErr++; continue; }

    let validSlots;
    try { validSlots = trackSlotIds(CONTENT, t.vendor, t.track); }
    catch (e) { console.log(`  ! cannot read track ${t.vendor}/${t.track}: ${e.message}`); totalErr++; continue; }

    const { staged, errors, unmappedVideos } = planTrack({ files: t.files, validSlots, sourceList });
    for (const s of staged) {
      const dest = join(outRoot, t.vendor, t.track, `${s.slot}${s.file.match(VIDEO_EXT)[0].toLowerCase()}`);
      if (commit) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(join(absSource, s.file), dest); }
      console.log(`  ${commit ? "✓ staged" : "· would stage"}  ${s.slot}  ← ${s.file}`);
      totalStaged++;
    }
    for (const e of errors) { console.log(`  ✗ ${e.slot || "?"}  ← ${e.file}  (${e.reason})`); totalErr++; }
    if (unmappedVideos.length) console.log(`  … ${unmappedVideos.length} unmapped video(s) in the folder: ${unmappedVideos.join(", ")}`);
  }

  console.log(`\n${commit ? "Staged" : "Would stage"} ${totalStaged} file(s)${totalErr ? ` · ${totalErr} problem(s)` : ""}.`);
  if (!commit) console.log(`Dry-run — re-run with --commit to copy into ${outRoot.replace(ROOT + "/", "")}/.`);
  if (totalErr) process.exit(1);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) main();
