#!/usr/bin/env node
// LA-14 — the pure half of the mini-video renderer: slot naming, payload
// normalisation, and the TIMELINE.
//
// The browser and the encoder cannot be unit-tested (they are a browser and an
// encoder), which is exactly why everything decidable without them lives in
// server/media/minivideo.js. The timeline is the part worth pinning hardest:
// it is shared by the video and the caption file, so an error there does not
// crash anything — it silently desyncs the words from the picture, which is
// the kind of defect that ships.

import {
  MINIVIDEO_LIMITS,
  MINIVIDEO_SIZE,
  MINIVIDEO_TIMING,
  minivideoSlotId,
  toRenderParams,
  toRenderQuery,
  toSlides,
  planTimeline,
  toVtt,
  narrationLines,
  MINIVIDEO_NARRATION,
} from "../server/media/minivideo.js";
import { kindForSlot } from "../server/media/validate.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const P = (over = {}) => ({
  domainId: "d1-agentic-architectures",
  index: 1,
  eyebrow: "Agentic architectures",
  title: "Three ways agent loops fail",
  points: [
    "No stop condition — the loop runs until the budget does",
    "State lives in the prompt, so it is lost on every retry",
    "Tool errors are swallowed and read as tool success",
  ],
  source: "CCA-F · D1",
  ...over,
});

const planOf = (over = {}) => {
  const v = toRenderParams(P(over));
  if (!v.ok) throw new Error(`payload rejected: ${v.error}`);
  return planTimeline(toSlides(v.params));
};

// ══════════════════════════════════════════════════════ slot naming ══
console.log("slot id (mv-*, the family LA-9 reserved)");
{
  ok(minivideoSlotId("d1-agentic-architectures", 1) === "mv-d1-agentic-architectures-1", "ig's twin: mv-<domain>-<n>");
  ok(kindForSlot(minivideoSlotId("d1", 2)) === "video", "an mv-* slot is a VIDEO slot to the media plane");
  ok(minivideoSlotId("d1/../../etc", 1) === null, "a slot id that could escape the key prefix is refused");
  ok(minivideoSlotId("d1", 0) === null && minivideoSlotId("d1", 100) === null, "index is 1-based and bounded");
}

// ═════════════════════════════════════════════════ payload contract ══
console.log("payload (the same shape an infographic takes)");
{
  ok(toRenderParams(P()).ok, "a valid payload is accepted");
  ok(toRenderParams(P({ title: "" })).error === "title_required", "no title → refused");
  ok(toRenderParams(P({ title: "x".repeat(MINIVIDEO_LIMITS.titleMax + 1) })).error === "title_too_long", "over-long title → refused, never shrunk");
  ok(toRenderParams(P({ points: ["a", "b"] })).error === "too_few_points",
    "TWO points is refused where an infographic allows it — a two-point video is one idea and cannot fill the format");
  ok(toRenderParams(P({ points: ["a", "b", "c", "d", "e", "f"] })).error === "too_many_points", "six points → refused");
  ok(toRenderParams(P({ points: ["a", "b", "x".repeat(MINIVIDEO_LIMITS.pointMax + 1)] })).error === "point_too_long", "over-long point → refused");
  ok(toRenderParams(P()).params.w === MINIVIDEO_SIZE.w && toRenderParams(P()).params.h === 1920, "vertical 1080×1920, not the card's 4:5");
}

// ═══════════════════════════════════════════════════════════ slides ══
console.log("slides (one thought each)");
{
  const slides = toSlides(toRenderParams(P()).params);
  ok(slides.length === 5, "title + 3 points + end card = 5 slides");
  ok(slides[0].role === "title" && slides[4].role === "end", "it opens on the claim and closes on the source");
  ok(slides.slice(1, 4).every((s) => s.role === "point"), "every middle slide is a single point");
  ok(slides[1].text === P().points[0], "points keep the payload's order — the argument is not reshuffled");
  ok(slides.filter((s) => s.role === "point").every((s) => s.title === P().title),
    "every point slide carries the claim, so a viewer arriving mid-video knows what is being argued");
}

// ═════════════════════════════════════════════════════════ timeline ══
console.log("timeline (whole frames, inside the format's band)");
{
  const plan = planOf();
  ok(plan.ok, "a valid payload plans");
  ok(plan.slides.every((s) => Number.isInteger(s.frames)), "every duration is a whole number of frames");
  ok(plan.slides.every((s) => Number.isInteger(s.offsetFrames)), "every offset is a whole number of frames");
  ok(plan.totalSeconds >= MINIVIDEO_TIMING.minTotalSeconds && plan.totalSeconds <= MINIVIDEO_TIMING.maxTotalSeconds,
    `runtime lands in the 20–40s band (${plan.totalSeconds.toFixed(1)}s)`);

  // The invariant the video and the captions BOTH depend on. If offsets were a
  // plain running sum of slide lengths the picture would drift later than the
  // words by one fade per join, and nothing would error — the captions would
  // just be increasingly wrong the longer the video ran.
  const joins = plan.slides.length - 1;
  const summed = plan.slides.reduce((a, s) => a + s.frames, 0);
  ok(plan.totalFrames === summed - joins * plan.fadeFrames,
    "runtime is the sum of the slides MINUS one fade per join — crossfades overlap, they do not append");

  let expected = 0;
  const offsetsAgree = plan.slides.every((s) => {
    const agrees = s.offsetFrames === expected;
    expected += s.frames - plan.fadeFrames;
    return agrees;
  });
  ok(offsetsAgree, "each slide's offset advances by its length minus one fade — the xfade chain reads these directly");
  ok(plan.slides[0].offsetFrames === 0, "the first slide starts at zero");
}

console.log("timeline — terse payloads are stretched, verbose ones refused");
{
  const terse = planOf({ title: "Agents fail", points: ["No stop rule", "Lost state", "Silent errors"] });
  ok(terse.ok, "a very short payload still plans");
  ok(terse.totalSeconds >= MINIVIDEO_TIMING.minTotalSeconds,
    `three terse points are stretched up to the 20s floor (${terse.totalSeconds.toFixed(1)}s), not left as a 12s GIF`);
  ok(terse.slides.every((s) => s.seconds <= MINIVIDEO_TIMING.maxSlideSeconds + 6),
    "stretching spreads across the slides rather than dumping it all on one");

  // The over-runtime branch is a GUARD, not a routine path. Five points of 88
  // characters of real prose is ~39s, so the payload ceilings already keep
  // every legal payload inside the band — there is no payload a validator
  // accepts that reaches it. Exercised with a tightened timing instead, which
  // is the honest way to test an unreachable branch: pretending some payload
  // triggers it would be a test that passes for the wrong reason.
  const wordy = Array.from({ length: 5 }, () => "one two three four five six seven eight nine ten twelve");
  const atCeiling = planTimeline(
    toSlides(toRenderParams(P({ points: wordy })).params),
    { ...MINIVIDEO_TIMING, maxTotalSeconds: 12 },
  );
  ok(!atCeiling.ok && atCeiling.error === "too_long_for_format",
    "a payload too long to film is REFUSED, not trimmed mid-sentence");

  // ...and the guard does not fire on anything the validator lets through,
  // which is the property that keeps it a guard rather than a trap.
  const maxLegal = planTimeline(toSlides(toRenderParams(P({ points: wordy })).params));
  ok(maxLegal.ok, "the wordiest payload the limits allow still plans under the real timing");
  ok(maxLegal.totalSeconds <= MINIVIDEO_TIMING.maxTotalSeconds,
    `and lands inside the band (${maxLegal.totalSeconds?.toFixed(1)}s ≤ ${MINIVIDEO_TIMING.maxTotalSeconds}s)`);
}

// ═════════════════════════════════════════════════════════════ vtt ══
console.log("captions (written from the same plan the video is cut from)");
{
  const plan = planOf();
  const vtt = toVtt(plan);
  ok(vtt.startsWith("WEBVTT"), "a WebVTT file announces itself");
  const cues = vtt.split("\n").filter((l) => l.includes("-->"));
  ok(cues.length === plan.slides.length - 1,
    "one cue per slide that has words — the end card carries the source, not a sentence");
  ok(vtt.includes(P().points[0]), "a point's words appear as its cue");
  ok(/^00:00:00\.000 -->/m.test(vtt), "the first cue starts at zero, like the first slide");

  const starts = cues.map((c) => c.split(" --> ")[0]);
  ok(starts.join() === [...starts].sort().join(), "cues are monotonic — they never run backwards");

  // Slides overlap by one fade; cues must NOT. A cue that ran to its own
  // slide's end would overlap its successor by 0.4s — two captions on screen
  // through every transition, and a narration script that asks the voice to
  // speak two lines at once.
  const spans = cues.map((c) => c.split(" --> "));
  const overlaps = spans.some((s, i) => i + 1 < spans.length && spans[i + 1][0] < s[1]);
  ok(!overlaps, "no cue overlaps the next — the crossfade is in the picture, not in the words");

  const plan2 = planOf();
  const firstEnd = spans[0][1];
  const secondStart = spans[1][0];
  ok(firstEnd === secondStart,
    "cues are contiguous: one ends exactly where the next begins, so nothing is unlabelled");
  ok(plan2.slides[1].offsetFrames === Math.round(parseFloat(secondStart.split(":")[2]) * plan2.fps),
    "and a cue's start is its slide's real offset, not a running sum that ignores the fade");
}

// ═══════════════════════════════════════════════════════ narration ══
console.log("narration (the captions, spoken — on the same timeline)");
{
  const slides = toSlides(toRenderParams(P()).params);
  const lines = narrationLines(slides);
  ok(lines.length === slides.length, "one script entry per slide, so it indexes like the plan");
  ok(lines[0] === P().title && lines[1] === P().points[0], "the title card speaks the claim, a point slide its point");
  ok(lines[lines.length - 1] === null, "the end card is silent — nobody wants 'CCA-F · D1' read aloud");

  // The single-source invariant: what the voice reads is what the captions show.
  const vttText = toVtt(planOf()).split("\n").filter((l) => l && !l.includes("-->") && l !== "WEBVTT");
  ok(JSON.stringify(vttText) === JSON.stringify(lines.filter(Boolean)),
    "the narration script IS the caption track, line for line");

  const silent = planTimeline(slides);
  ok(silent.slides.every((s) => !s.voice), "a plan with no voice carries no voice cues (the silent video is unchanged)");

  // Clips just under what the silent plan already allows: nothing should move.
  const short = lines.map((l) => (l ? 0.5 : null));
  const quiet = planTimeline(slides, MINIVIDEO_TIMING, short);
  ok(quiet.ok && quiet.slides.every((s, i) => s.frames === silent.slides[i].frames),
    "short lines fit the read-time slides as they are — narration only ever lengthens a slide");

  const voice = lines.map((l) => (l ? 4.2 : null));
  const plan = planTimeline(slides, MINIVIDEO_TIMING, voice);
  ok(plan.ok, "a narrated payload plans");
  const N = MINIVIDEO_NARRATION;
  const voiced = plan.slides.filter((s) => s.voice);
  ok(voiced.length === lines.filter(Boolean).length, "every spoken line has a place on the timeline, the end card none");
  ok(voiced.every((s) => Number.isInteger(s.voice.offsetFrames) && Number.isInteger(s.voice.frames)),
    "voice offsets and lengths are whole frames, like the picture's");
  ok(voiced.every((s) => s.voice.frames >= Math.ceil(4.2 * plan.fps)),
    "a clip's length is rounded UP — rounding down would clip its last syllable");
  ok(plan.slides[0].voice.offsetFrames === Math.round(N.firstStartSeconds * plan.fps),
    "the title's line starts just after zero — there is no fade to wait for");
  ok(voiced.slice(1).every((s) => s.voice.offsetFrames >= s.offsetFrames + plan.fadeFrames),
    "every other line waits for its slide's fade-in to finish — no voice under a crossfade");

  // The property that matters most: no line runs into the next slide's fade.
  const clear = plan.slides.every((s, i) => {
    const next = plan.slides[i + 1];
    if (!s.voice || !next) return true;
    return s.voice.offsetFrames + s.voice.frames + Math.round(N.tailSeconds * plan.fps) <= next.offsetFrames;
  });
  ok(clear, "each line, plus its breath, ends before the next slide starts fading in");

  // Cues and voice share one plan: each line starts inside its own cue.
  const cues = toVtt(plan).split("\n").filter((l) => l.includes("-->"));
  ok(cues.length === voiced.length, "one caption cue per spoken line");

  // A voice longer than the read-time ceiling wins over the ceiling...
  const slow = lines.map((l) => (l ? MINIVIDEO_TIMING.maxSlideSeconds + 0.5 : null));
  const slowPlan = planTimeline(slides, { ...MINIVIDEO_TIMING, maxTotalSeconds: 60 }, slow);
  ok(slowPlan.ok && slowPlan.slides.filter((s) => s.voice).every((s) => s.seconds > MINIVIDEO_TIMING.maxSlideSeconds),
    "a slide is never cut under its own voice — the voice floor beats the read-time ceiling");
  // ...and the runtime band still refuses it, never trims it. (Nine seconds a
  // line: title + three points then run past 40s; 7.5s a line still fits.)
  const tooSlow = planTimeline(slides, MINIVIDEO_TIMING, lines.map((l) => (l ? 9 : null)));
  ok(!tooSlow.ok && tooSlow.error === "too_long_for_format",
    "a narration too long for the format is REFUSED, by the same rule as a silent one");

  ok(planTimeline(slides, MINIVIDEO_TIMING, [1, 2]).error === "bad_voice", "a voice list that does not index the slides is refused");
  ok(planTimeline(slides, MINIVIDEO_TIMING, lines.map((l) => (l ? NaN : null))).error === "bad_voice",
    "a clip with no measurable length is refused, not planned as zero");
}

// ═══════════════════════════════════════════════════════════ query ══
console.log("render query (fixed key order → same slide, same frame)");
{
  const params = toRenderParams(P()).params;
  const slides = toSlides(params);
  const a = toRenderQuery(params, slides[1]);
  const b = toRenderQuery(params, slides[1]);
  ok(a === b, "the same slide always produces the same URL (FR-5)");
  ok(a.includes("role=point") && a.includes("index=1"), "the slide declares its role and position");
  ok(!toRenderQuery(params, slides[0]).includes("text="), "the title slide sends no body text");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
