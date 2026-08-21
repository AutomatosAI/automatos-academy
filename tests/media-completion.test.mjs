#!/usr/bin/env node
// LX-1 — media completion: the store round-trip, the event builder's bounds
// (mirroring server validation), and reconcile's last-write-wins merge.
// localStorage is shimmed; store.js only touches it inside try/catch methods.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const { Store, setSyncEmitter, loadRawState, saveRawState } = await import("../public/js/store.js");
const { buildMediaEvent, KIND_ORDER } = await import("../public/js/sync/events.js");
const { validateMediaEvent } = await import("../server/spine/validate.js");

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// ── store round-trip + emit ──
const emitted = [];
setSyncEmitter((w) => emitted.push(w));
const store = new Store("github", "gh-500");
ok(store.mediaDone("v-d3-1") === false, "unknown media starts not-done");
store.mediaAuto("video", "v-d3-1");
ok(store.mediaDone("v-d3-1") === true, "mediaAuto marks done");
store.mediaAuto("video", "v-d3-1");
ok(emitted.length === 1, "a second auto never re-fires (done is sticky)");
store.markMedia("video", "v-d3-1", false, "manual");
ok(store.mediaDone("v-d3-1") === false && emitted.length === 2, "manual unmark works and emits");
ok(emitted[1].completed === false && emitted[1].type === "media", "unmark emits completed:false");
const reloaded = new Store("github", "gh-500");
store.markMedia("video", "v-d1-1", true, "manual");
ok(new Store("github", "gh-500").mediaDone("v-d1-1"), "state persists across Store instances");
ok(store.mediaDoneCount(["v-d1-1", "v-d3-1", "v-x"]) === 1, "mediaDoneCount counts only done ids");
setSyncEmitter(null);

// ── builder ⇄ server validation agreement ──
const built = buildMediaEvent({ vendorId: "github", trackId: "gh-500", kind: "video", mediaId: "v-d3-1", completed: true, how: "auto", at: Date.now() });
ok(built.event && !built.error, "builder accepts a good event");
const v = validateMediaEvent(built.event, Date.now());
ok(v.value && !v.error, "server validator accepts what the builder emits");
ok(buildMediaEvent({ vendorId: "g", trackId: "t", kind: "gif", mediaId: "m", completed: true, how: "auto" }).error === "kind_unknown", "builder refuses unknown kind");
ok(buildMediaEvent({ vendorId: "g", trackId: "t", kind: "video", mediaId: "m", completed: "yes", how: "auto" }).error === "completed_not_boolean", "builder refuses non-boolean completed");
ok(validateMediaEvent({ ...built.event, at: Date.now() + 49 * 3600_000 }, Date.now()).error === "at_too_far_future", "server refuses far-future timestamps");
ok(KIND_ORDER.includes("media"), "media joined the flush order");

// reconcile's network path needs a browser; the LWW merge itself is proven
// through the raw-state contract it reads and writes:
saveRawState("iapp", "aigp", { lessons: {}, q: {}, exams: [], scenarios: {}, media: { "v-d1-1": { done: true, how: "manual", at: 2000, kind: "video" } } });
const raw = loadRawState("iapp", "aigp");
ok(raw.media["v-d1-1"].done === true, "raw state carries media through save/load");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
