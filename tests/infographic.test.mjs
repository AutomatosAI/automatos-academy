#!/usr/bin/env node
// LA-9 — the pure half of the infographic renderer: slot naming, payload
// normalisation, and the size ceilings that keep a card readable.
//
// The browser half cannot be unit-tested (it IS a browser), which is exactly
// why everything decidable without one lives in server/media/infographic.js.
// What this file pins is the contract the CI render job depends on: a payload
// that would draw badly is REJECTED here, before any pixels exist.

import {
  INFOGRAPHIC_LIMITS,
  INFOGRAPHIC_SIZE,
  infographicSlotId,
  toRenderParams,
  toRenderQuery,
} from "../server/media/infographic.js";
import { kindForSlot, validatePresign, MEDIA_RULES } from "../server/media/validate.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const P = (over = {}) => ({
  domainId: "d1-agentic-architectures",
  index: 1,
  title: "Three ways agents fail",
  points: ["They forget", "They over-call tools", "They never stop"],
  ...over,
});

console.log("slot naming");
{
  ok(infographicSlotId("d1-agentic-architectures", 1) === "ig-d1-agentic-architectures-1", "ig-<domain>-<n>, 1-based");
  ok(infographicSlotId("d1", 12) === "ig-d1-12", "double digits fine");
  ok(infographicSlotId("d1", 0) === null, "index is 1-based — 0 rejected");
  ok(infographicSlotId("d1", 1.5) === null, "non-integer index rejected");
  ok(infographicSlotId("", 1) === null, "empty domain rejected");
  // A slash here would climb out of the academy/<vendor>/<track>/ key prefix
  // that the presign path locks writes to — this is a containment check.
  ok(infographicSlotId("../../etc", 1) === null, "path separators rejected (key prefix containment)");
  ok(infographicSlotId("d1 spaced", 1) === null, "spaces rejected");
}

console.log("slot family ↔ media kind");
{
  ok(kindForSlot("ig-d1-1") === "image", "ig-* is an image slot");
  ok(kindForSlot("v-d1-2") === "video", "v-* stays video (unchanged convention)");
  ok(kindForSlot("mv-d1-1") === "video", "mv-* reserved for LA-14, already video");
  ok(kindForSlot("legacy-thing") === null, "an unprefixed legacy slot declares nothing");

  const base = { vendor: "anthropic", track: "cca-f", filename: "card.png" };
  const good = validatePresign({ ...base, slotId: "ig-d1-1", kind: "image", contentType: "image/png" }, { cdnBase: "https://cdn" });
  ok(good.ok && good.key === "academy/anthropic/cca-f/ig-d1-1-card.png", "image presign into an ig-* slot is allowed");

  // The failure this prevents is silent: an image on a v-* slot renders as a
  // <video> with an unplayable source — a dead card, not an error.
  const crossed = validatePresign({ ...base, slotId: "v-d1-2", kind: "image", contentType: "image/png" }, { cdnBase: "https://cdn" });
  ok(!crossed.ok && crossed.error === "slot_kind_mismatch", "an image cannot be bound to a video slot");

  const mp4OnIg = validatePresign({ ...base, slotId: "ig-d1-1", kind: "video", contentType: "video/mp4", filename: "x.mp4" }, { cdnBase: "https://cdn" });
  ok(!mp4OnIg.ok && mp4OnIg.error === "slot_kind_mismatch", "a video cannot be bound to an infographic slot");

  const legacy = validatePresign({ ...base, slotId: "legacy-thing", kind: "video", contentType: "video/mp4", filename: "x.mp4" }, { cdnBase: "https://cdn" });
  ok(legacy.ok, "a legacy unprefixed slot still binds — live bindings are not stranded");

  ok(MEDIA_RULES.image.types.includes("image/png"), "png is an allowed image type");
  ok(!MEDIA_RULES.image.types.includes("image/svg+xml"), "svg is NOT allowed (it is executable markup)");
}

console.log("payload → render params");
{
  const v = toRenderParams(P());
  ok(v.ok && v.params.title === "Three ways agents fail", "title kept");
  ok(v.params.points.length === 3, "points kept");
  ok(v.params.w === INFOGRAPHIC_SIZE.w && v.params.h === 1350, "portrait 1080×1350");

  ok(toRenderParams(P({ title: "  spaced   out  " })).params.title === "spaced out", "whitespace collapsed (determinism)");
  ok(toRenderParams(P({ points: ["a", "", "  ", "b"] })).params.points.length === 2, "empty points dropped");

  ok(toRenderParams(P({ title: "" })).error === "title_required", "no title → rejected");
  ok(toRenderParams(P({ points: ["only one"] })).error === "too_few_points", "one point is not an infographic");
  ok(toRenderParams(P({ points: ["a", "b", "c", "d", "e", "f"] })).error === "too_many_points", "six points → rejected");
  ok(toRenderParams(null).error === "bad_payload", "null payload → rejected");
  ok(toRenderParams([1, 2]).error === "bad_payload", "array payload → rejected");

  // The blowout lesson: an over-long payload is REFUSED, never shrunk to fit.
  // A card that renders wrong still gets served; a rejected one gets fixed.
  const longTitle = "x".repeat(INFOGRAPHIC_LIMITS.titleMax + 1);
  ok(toRenderParams(P({ title: longTitle })).error === "title_too_long", "over-long title → rejected, not clipped");
  const longPoint = "y".repeat(INFOGRAPHIC_LIMITS.pointMax + 1);
  ok(toRenderParams(P({ points: ["ok", longPoint] })).error === "point_too_long", "over-long point → rejected, not clipped");

  // Optional chrome truncates rather than fails — it is decoration, and the
  // card's provenance strip (not the pixels) carries the grounding claim.
  const longSource = "z".repeat(200);
  ok(toRenderParams(P({ source: longSource })).params.source.length === INFOGRAPHIC_LIMITS.sourceMax, "source truncated, not rejected");
  ok(toRenderParams(P()).params.source === "", "source is optional");
}

console.log("render query is stable (FR-5)");
{
  const a = toRenderQuery(toRenderParams(P()).params);
  const b = toRenderQuery(toRenderParams(P()).params);
  ok(a === b, "same payload → identical query → identical PNG");

  // Key order fixed by construction, not by object iteration order: a payload
  // authored with its keys in a different order must still render the same.
  const shuffled = toRenderQuery(toRenderParams({
    points: P().points, index: 1, title: P().title, domainId: P().domainId,
  }).params);
  ok(a === shuffled, "payload key order does not change the query");

  const different = toRenderQuery(toRenderParams(P({ title: "Something else" })).params);
  ok(a !== different, "a changed payload changes the query");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
