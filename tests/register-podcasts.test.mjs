#!/usr/bin/env node
// Podcast registrar — the mvhd duration parser (register-podcasts.mjs) on
// synthetic MP4 buffers (no real audio file needed), plus an episode-contract
// round-trip through the shared collectEpisodeErrors validator.

import { mp4DurationSecFromBuffer, findBox } from "../scripts/register-podcasts.mjs";
import { collectEpisodeErrors } from "../server/podcasts.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// ── synthetic MP4 box builders ──
function box(type, payload) {
  const b = Buffer.alloc(8 + payload.length);
  b.writeUInt32BE(b.length, 0);
  b.write(type, 4, "latin1");
  payload.copy(b, 8);
  return b;
}
// mvhd v0: version+flags(4) creation(4) modification(4) timescale@12 duration@16
function mvhdV0(timescale, duration) {
  const p = Buffer.alloc(20);
  p.writeUInt8(0, 0);
  p.writeUInt32BE(timescale, 12);
  p.writeUInt32BE(duration, 16);
  return box("mvhd", p);
}
// mvhd v1: version(1)=1 creation(8) modification(8) timescale@20 duration(64)@24
function mvhdV1(timescale, duration) {
  const p = Buffer.alloc(32);
  p.writeUInt8(1, 0);
  p.writeUInt32BE(timescale, 20);
  p.writeBigUInt64BE(BigInt(duration), 24);
  return box("mvhd", p);
}

console.log("mvhd duration parser");
{
  // A realistic layout: ftyp precedes moov (parser must skip it), moov holds mvhd.
  const ftyp = box("ftyp", Buffer.alloc(16));
  const file0 = Buffer.concat([ftyp, box("moov", mvhdV0(1000, 3234000))]);
  ok(mp4DurationSecFromBuffer(file0) === 3234, "v0: 3234000/1000 → 3234s (skips ftyp, finds moov→mvhd)");

  const file1 = Buffer.concat([ftyp, box("moov", mvhdV1(48000, 48000 * 2700))]);
  ok(mp4DurationSecFromBuffer(file1) === 2700, "v1 (64-bit duration): 2700s");

  // rounding: 44100 timescale, 100.6s worth of samples → rounds to 101
  const file2 = box("moov", mvhdV0(44100, Math.round(44100 * 100.6)));
  ok(mp4DurationSecFromBuffer(file2) === 101, "rounds to the nearest second");

  ok(findBox(file0, "moov", 0, file0.length) !== null, "findBox locates a present box");
  ok(findBox(file0, "trak", 0, file0.length) === null, "findBox returns null for an absent box");

  let threw = false;
  try { mp4DurationSecFromBuffer(box("ftyp", Buffer.alloc(8))); } catch { threw = true; }
  ok(threw, "no moov box → throws (caller falls back to --duration)");
}

console.log("episode contract (collectEpisodeErrors parity)");
{
  const good = {
    id: "gen-ai-leader-deep-dive", title: "Generative AI Leader — The Whole Track",
    vendorId: "google", trackId: "gen-ai-leader", durationSec: 3234, chapters: [],
    audioUrl: "https://widgets.automatos.app/academy/google/podcasts/gen-ai-leader-deep-dive.m4a",
    groundingLabel: "grounded: source transcript verified; synthesis spot-checked",
  };
  ok(collectEpisodeErrors(good, "e").length === 0, "a well-formed episode passes the contract");
  ok(collectEpisodeErrors({ ...good, durationSec: 0 }, "e").some((e) => /durationSec/.test(e)), "durationSec 0 is rejected (the >0 rule)");
  ok(collectEpisodeErrors({ ...good, audioUrl: "" }, "e").some((e) => /audioUrl/.test(e)), "empty audioUrl is rejected");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
