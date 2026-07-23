#!/usr/bin/env node
// PRD-WAVE-CONTENT-OPS C3 — bulk-bind planner + bind loop. Pure planning over
// relative staging paths (no fs, no network) + the POST loop over a fake fetch.

import { planBindings, slotIdOf, bindUrl, bindAll } from "../scripts/bulk-bind-media.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.error("  ✗ " + m)));

const BASE = "https://widgets.automatos.app";

console.log("slotIdOf / bindUrl");
ok(slotIdOf("v-d1-2.mp4") === "v-d1-2", "strips the extension to the slot id");
ok(slotIdOf("v-ov-1.webm") === "v-ov-1", "works for any video extension");
ok(bindUrl(BASE + "/", "anthropic", "cca-f", "v-d1-2.mp4") === `${BASE}/academy/anthropic/cca-f/v-d1-2.mp4`, "builds the CDN url (trailing slash on base tolerated)");

console.log("planBindings (pure)");
const plan = planBindings(
  [
    "anthropic/cca-f/v-d1-2.mp4",
    "anthropic/cca-f/v-ov-1.mp4",
    "github/gh-300/v-d3-1.mov",
    "anthropic/cca-f/notes.txt",       // non-video → skip
    "anthropic/cca-f/audio/x.mp3",     // depth 4 → skip
    "stray.mp4",                        // depth 1 → skip
  ],
  BASE,
);
ok(plan.length === 3, "keeps only the 3 vendor/track/<video> files");
ok(plan.every((b) => b.kind === "video"), "every planned binding is kind=video");
const cca = plan.find((b) => b.slotId === "v-d1-2");
ok(cca && cca.vendor === "anthropic" && cca.track === "cca-f" && cca.url.endsWith("/academy/anthropic/cca-f/v-d1-2.mp4"), "maps vendor/track/slot/url correctly");
ok(plan.some((b) => b.vendor === "github" && b.track === "gh-300" && b.slotId === "v-d3-1"), "a second track is planned independently");
ok(planBindings([], BASE).length === 0, "no paths → no bindings");

console.log("bindAll (POST loop over a fake fetch)");
{
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    const body = JSON.parse(init.body);
    // simulate: the second slot doesn't exist on the server → 404
    return body.slotId === "v-ov-1"
      ? { ok: false, status: 404, text: async () => '{"error":"unknown_slot"}' }
      : { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const quiet = { log() {}, error() {} };
  const res = await bindAll(plan, { server: "https://srv", adminKey: "K", fetchImpl: fakeFetch, log: quiet });
  ok(res.bound === 2 && res.failed === 1, "counts bound vs failed from the responses");
  ok(calls.length === 3 && calls.every((c) => c.init.headers["x-admin-key"] === "K"), "every call carries the X-Admin-Key");
  ok(calls[0].url === "https://srv/api/admin/media/bind" && calls[0].init.method === "POST", "POSTs to the bind endpoint");
  const sent = JSON.parse(calls[0].init.body);
  ok(sent.kind === "video" && sent.vendor && sent.track && sent.slotId && sent.url, "sends the full bind body");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
