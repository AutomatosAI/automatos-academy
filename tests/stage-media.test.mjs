#!/usr/bin/env node
// PRD-WAVE-CONTENT-OPS — stage-media planner. Pure classification of a track's
// filename→slot map against the real slots + the files on disk. No fs.

import { planTrack } from "../scripts/stage-media.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.error("  ✗ " + m)));

const validSlots = new Set(["v-m0-1", "v-m1-1", "v-m2-1", "v-ov-1"]);

console.log("planTrack — happy path");
{
  const r = planTrack({
    files: { "Beyond.mp4": "v-m0-1", "Where.mp4": "v-m1-1" },
    validSlots,
    sourceList: ["Beyond.mp4", "Where.mp4"],
  });
  ok(r.staged.length === 2 && !r.errors.length, "maps both files to their slots");
  ok(r.staged[0].slot === "v-m0-1" && r.staged[0].file === "Beyond.mp4", "carries file→slot");
}

console.log("planTrack — the failure modes");
{
  const r = planTrack({
    files: { "Gone.mp4": "v-m0-1", "Bad.mp4": "v-x9-9", "A.mp4": "v-m1-1", "B.mp4": "v-m1-1" },
    validSlots,
    sourceList: ["Bad.mp4", "A.mp4", "B.mp4", "Extra.mp4"],
  });
  const reason = (f) => (r.errors.find((e) => e.file === f) || {}).reason;
  ok(reason("Gone.mp4") === "source-missing", "a mapped file not on disk → source-missing");
  ok(reason("Bad.mp4") === "unknown-slot", "a slot not in the track → unknown-slot");
  ok(String(reason("B.mp4")).startsWith("slot-reused"), "two files → one slot → slot-reused (second loses)");
  ok(r.staged.length === 1 && r.staged[0].file === "A.mp4", "only the first claimant of a slot stages");
  ok(r.unmappedVideos.includes("Extra.mp4") && !r.unmappedVideos.includes("A.mp4"), "a video in the folder nobody mapped is surfaced");
}

console.log("planTrack — non-video clutter is ignored, not flagged");
{
  const r = planTrack({ files: {}, validSlots, sourceList: [".DS_Store", "notes.txt", "clip.mp4"] });
  ok(r.unmappedVideos.length === 1 && r.unmappedVideos[0] === "clip.mp4", "only unmapped VIDEOS count as unmapped (ignores .DS_Store/.txt)");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
