#!/usr/bin/env node
// Video-hub layout (Part 1a): module-00 lifted into "Start here"; unproduced
// slots hidden from visitors, shown to admins. Pure selectors from content.js.

import { trackVideoSections, isStartHereDomain, isPublishedVideo, isDeepDiveVideo } from "../public/js/content.js";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.error("  ✗ " + m)));

const pub = (id) => ({ id, status: "published", url: `https://cdn/${id}.mp4` });
const ph = (id) => ({ id, status: "placeholder", url: "" });

// A skills track: unproduced overview, module-00 (main published + deep-dive placeholder), module-01.
const skills = {
  videos: [ph("v-ov-1"), ph("v-ov-2")],
  domains: [
    { id: "m00-what-is-ai", name: "M00", videos: [pub("v-m00-1"), ph("v-m00-2")] },
    { id: "m01-agent", name: "M01", videos: [pub("v-m01-1"), ph("v-m01-2")] },
    { id: "m10-kg", name: "M10", videos: [pub("v-m10-1"), ph("v-m10-2")] },
  ],
};
// An exam track: published overview, d1 domain (must NOT be lifted to Start here).
const exam = { videos: [pub("v-ov-1")], domains: [{ id: "d1-fundamentals", name: "D1", videos: [pub("v-d1-1")] }] };

console.log("isStartHereDomain / isPublishedVideo");
ok(isStartHereDomain("m00-what-is-ai") && isStartHereDomain("m0-what-ai-is") && isStartHereDomain("m00-what-is-automatos"), "m0-/m00- intro domains match");
ok(!isStartHereDomain("m1-where") && !isStartHereDomain("m10-kg") && !isStartHereDomain("d1-fundamentals"), "m1+/m10/d1 do NOT match (only module zero)");
ok(isPublishedVideo(pub("x")) && !isPublishedVideo(ph("x")) && !isPublishedVideo({ status: "published", url: "" }), "published requires status AND a url");

console.log("trackVideoSections — visitor (hide unproduced, lift module-00)");
{
  const v = trackVideoSections(skills, { includeUnproduced: false });
  ok(v.startHere.length === 1 && v.startHere[0].id === "v-m00-1", "module-00's produced video is lifted to Start here; unproduced overviews + its deep-dive are hidden");
  ok(v.byDomain.length === 2 && v.byDomain.every((x) => x.id === "v-m01-1" || x.id === "v-m10-1"), "By domain shows only produced videos — no 'Video coming' clutter");
  ok(!v.byDomain.some((x) => x.id.endsWith("-2")), "no deep-dive placeholders leak into the visitor grid");
}

console.log("trackVideoSections — admin (upload targets, but NOT unproduced deep-dives)");
{
  const a = trackVideoSections(skills, { includeUnproduced: true });
  ok(a.startHere.some((x) => x.id === "v-ov-1") && a.startHere.some((x) => x.id === "v-m00-1"), "admin sees the overview upload targets + the module-00 main in Start here");
  ok(!a.startHere.some((x) => x.id === "v-m00-2") && !a.byDomain.some((x) => x.id.endsWith("-2")), "unproduced deep-dive (-2) slots are hidden even for admins — one card per module, no 'add more'");
  ok(a.byDomain.length === 2 && a.byDomain.every((x) => x.id.endsWith("-1")), "admin's By-domain is the main slots only");
}

console.log("trackVideoSections — a PRODUCED deep-dive is real content, still shows");
{
  const withDD = { videos: [], domains: [{ id: "m01-agent", name: "M01", videos: [pub("v-m01-1"), pub("v-m01-2")] }] };
  const r = trackVideoSections(withDD, { includeUnproduced: false });
  ok(r.byDomain.some((x) => x.id === "v-m01-2"), "a published deep-dive shows (only UNPRODUCED ones are hidden)");
  ok(isDeepDiveVideo({ id: "v-m01-2", domainId: "m01" }) && !isDeepDiveVideo({ id: "v-m01-1", domainId: "m01" }) && !isDeepDiveVideo({ id: "v-ov-2" }), "isDeepDiveVideo: a domain -2 only (not -1, not the track-level v-ov-2)");
}

console.log("trackVideoSections — exam track (no module-00)");
{
  const e = trackVideoSections(exam, { includeUnproduced: false });
  ok(e.startHere.length === 1 && e.startHere[0].id === "v-ov-1", "exam track: the overview is Start here");
  ok(e.byDomain.length === 1 && e.byDomain[0].id === "v-d1-1", "exam track: d1 stays By domain (never lifted)");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
