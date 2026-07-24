#!/usr/bin/env node
// Register a whole-track deep-dive podcast into public/content/podcasts.json —
// the audio twin of register-videos.mjs. The bytes ride the video pipeline onto
// the CDN (media-staging/<vendor>/podcasts/<id>.m4a → deploy-media.yml, bind=false);
// this writes the episode entry that /api/catalog/podcasts serves to the academy
// web SPA AND the mobile app (one shared contract, one central store).
//
// Usage:
//   node scripts/register-podcasts.mjs \
//     --file "<path to .m4a|.mp3>" --vendor <vendorId> --track <trackId> \
//     --id <podcastId> --title "<Title>" [--base https://widgets.automatos.app] \
//     [--duration <sec>] [--transcript <url>] [--grounding "<label>"]
//
// - Resolves durationSec from --duration, else parses it from the audio's mvhd
//   box (no ffprobe needed), so the >0 validator rule is always satisfied.
// - Refuses a vendor/track that isn't a LIVE manifest track (no dangling audio).
// - Validates via server/podcasts.js collectEpisodeErrors (the exact pre-merge +
//   boot contract, = the app's schema.ts) before writing — a bad entry can't land.
// - Idempotent: re-running upserts the episode by id.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { collectEpisodeErrors } from "../server/podcasts.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
};

const DEFAULT_BASE = "https://widgets.automatos.app";
const DEFAULT_GROUNDING = "grounded: source transcript verified; synthesis spot-checked";

// ── mvhd duration: walk MP4/M4A boxes for moov → mvhd, durationSec = dur/scale ──
// Exported (with mp4DurationSec) so tests cover the parser on synthetic buffers.
export function findBox(buf, type, start, end) {
  let o = start;
  while (o + 8 <= end) {
    let size = buf.readUInt32BE(o);
    const t = buf.toString("latin1", o + 4, o + 8);
    let header = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(o + 8)); header = 16; }
    else if (size === 0) { size = end - o; }
    if (size < header || o + size > end) break; // malformed — stop walking
    if (t === type) return { contentStart: o + header, end: o + size };
    o += size;
  }
  return null;
}
export function mp4DurationSecFromBuffer(buf) {
  const moov = findBox(buf, "moov", 0, buf.length);
  if (!moov) throw new Error("no moov box (not an MP4/M4A?) — pass --duration <sec>");
  const mvhd = findBox(buf, "mvhd", moov.contentStart, moov.end);
  if (!mvhd) throw new Error("no mvhd box — pass --duration <sec>");
  const p = mvhd.contentStart;
  const version = buf[p];
  let timescale, duration;
  if (version === 1) { timescale = buf.readUInt32BE(p + 20); duration = Number(buf.readBigUInt64BE(p + 24)); }
  else { timescale = buf.readUInt32BE(p + 12); duration = buf.readUInt32BE(p + 16); }
  if (!timescale) throw new Error("bad mvhd timescale — pass --duration <sec>");
  return Math.round(duration / timescale);
}
function mp4DurationSec(path) {
  const buf = readFileSync(path);
  const moov = findBox(buf, "moov", 0, buf.length);
  if (!moov) throw new Error("no moov box (not an MP4/M4A?) — pass --duration <sec>");
  const mvhd = findBox(buf, "mvhd", moov.contentStart, moov.end);
  if (!mvhd) throw new Error("no mvhd box — pass --duration <sec>");
  const p = mvhd.contentStart;
  const version = buf[p];
  let timescale, duration;
  if (version === 1) { timescale = buf.readUInt32BE(p + 20); duration = Number(buf.readBigUInt64BE(p + 24)); }
  else { timescale = buf.readUInt32BE(p + 12); duration = buf.readUInt32BE(p + 16); }
  if (!timescale) throw new Error("bad mvhd timescale — pass --duration <sec>");
  return Math.round(duration / timescale);
}

function liveTrack(vendorId, trackId) {
  const manifest = JSON.parse(readFileSync(join(ROOT, "public/content/manifest.json"), "utf8"));
  for (const v of manifest.vendors || []) {
    if (v.id !== vendorId) continue;
    for (const t of v.tracks || []) {
      if (t.trackId === trackId) return t;
    }
  }
  return null;
}

function main() {
  const file = opt("--file");
  const vendorId = opt("--vendor");
  const trackId = opt("--track");
  const id = opt("--id");
  const title = opt("--title");
  const base = opt("--base") || DEFAULT_BASE;
  const transcriptUrl = opt("--transcript");
  const groundingLabel = opt("--grounding") || DEFAULT_GROUNDING;

  if (!file || !vendorId || !trackId || !id || !title) {
    console.error("Usage: register-podcasts.mjs --file <audio> --vendor <v> --track <t> --id <id> --title <title> [--base <cdn>] [--duration <sec>] [--transcript <url>]");
    process.exit(1);
  }
  if (!existsSync(file)) { console.error(`! file not found: ${file}`); process.exit(1); }

  const track = liveTrack(vendorId, trackId);
  if (!track) { console.error(`! ${vendorId}/${trackId} is not a live manifest track — refusing to register dangling audio`); process.exit(1); }

  const ext = (extname(file) || ".m4a").replace(/^\./, "");
  const durationSec = opt("--duration") ? parseInt(opt("--duration"), 10) : mp4DurationSec(file);

  const episode = {
    id, title, vendorId, trackId, durationSec, chapters: [],
    audioUrl: `${base}/academy/${vendorId}/podcasts/${id}.${ext}`,
    groundingLabel,
    ...(transcriptUrl ? { transcriptUrl } : {}),
  };

  const errs = collectEpisodeErrors(episode, `episode ${id}`);
  if (errs.length) { console.error("! episode fails the contract:\n  " + errs.join("\n  ")); process.exit(1); }

  const path = join(ROOT, "public/content/podcasts.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.episodes = manifest.episodes || [];
  const at = manifest.episodes.findIndex((e) => e.id === id);
  const verb = at >= 0 ? "updated" : "added";
  if (at >= 0) manifest.episodes[at] = episode; else manifest.episodes.push(episode);

  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`✓ ${verb} "${title}" (${vendorId}/${trackId}) — ${durationSec}s → ${episode.audioUrl}`);
  console.log(`  podcasts.json now has ${manifest.episodes.length} episode(s).`);
  console.log(`  Deploy the bytes: stage ${file} → media-staging/${vendorId}/podcasts/${id}.${ext}, dispatch deploy-media.yml (mode=staging, bind=false).`);
}

// Run only as a CLI — importing the module (tests) never triggers main().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
