#!/usr/bin/env node
// The Fish lane's pure half (PRD-VOICE §8.1) — what the catalogue's money
// rides on: the content address must move when anything audible changes and
// hold still when nothing did, and the decoration must match what the ear
// approved (pauses instead of "Section:", sparse tags, Laura locked).

import {
  FISH_SETTINGS,
  audioHash,
  buildSpoken,
  decorateSegment,
  gapMs,
  kindOf,
} from "../server/audio/fishLane.js";
import { SPOKEN } from "../server/audio/speakable.js";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.error("  ✗ " + m)));

console.log("locked settings — the ear verdict, encoded");
{
  ok(FISH_SETTINGS.voice === "e3cd384158934cc9a01029cd7d278634", "Laura's reference id is pinned");
  ok(FISH_SETTINGS.speed === 1, "natural pace (the web-UI pace the ear approved)");
  ok(FISH_SETTINGS.SETTINGS_VERSION === "fish-s21p-laura-v1", "the namespace names the voice");
}

console.log("content address — same in, same out; anything audible moves it");
{
  const { spoken } = buildSpoken("T", "Hello.\n\n## Next\n\nWorld.");
  ok(audioHash(spoken) === audioHash(spoken), "deterministic");
  ok(audioHash(spoken) !== audioHash(spoken + " more"), "text change moves it");
  ok(audioHash(spoken, { ...FISH_SETTINGS, speed: 1.15 }) !== audioHash(spoken), "speed change moves it");
  ok(audioHash(spoken, { ...FISH_SETTINGS, voice: "other" }) !== audioHash(spoken), "voice change moves it");
  ok(audioHash(spoken, { ...FISH_SETTINGS, SETTINGS_VERSION: "v2" }) !== audioHash(spoken), "namespace bump regenerates everything, on purpose");
  ok(/^[0-9a-f]{12}$/.test(audioHash(spoken)), "12-hex — short enough for a key, long enough to never collide here");
}

console.log("decoration — the pause IS the section announcement");
{
  const { segments, kinds } = buildSpoken("Title", "Intro.\n\n## The Plan\n\nBody.\n\n```js\nx()\n```\n\nAfter.");
  ok(!segments.some((s) => s.startsWith(SPOKEN.sectionPrefix)), "no 'Section:' reaches the voice");
  ok(kinds.includes("heading"), "…but the stitcher still KNOWS where headings are (pause placement)");
  ok(segments.some((s) => s.includes("[casual]") && s.includes("Code sample")), "code aside stays casual");
  ok(segments[1].startsWith("[warm]"), "the opening line is warm");
  ok(decorateSegment("plain text", 5, "plain") === "plain text", "everything else is untouched");
}

console.log("rhythm — kind-keyed gaps");
{
  ok(gapMs("plain", "heading") === 750, "longest breath BEFORE a new section");
  ok(gapMs("heading", "plain") === 500, "heading lands");
  ok(gapMs("list", "list") === 300, "list beats stay tight");
  ok(gapMs("plain", "plain") === 420, "sentence rhythm");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
