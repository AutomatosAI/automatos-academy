#!/usr/bin/env node
// PRD-WAVE-CONTENT-OPS C5 — tutor-corpus → workspace KB sync. Pure planning
// (manifest → tagged upload plan) + the push loop (upload / duplicate / replace
// / fail) over a fake fetch + fake readFile. No network, no filesystem.

import { uploadFilename, documentDescription, planUploads, syncAll } from "../scripts/sync-tutor-corpus.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.error("  ✗ " + m)));

const manifest = {
  files: [
    { file: "anthropic--cca-f/00-track-overview.md", vendor: "anthropic", track: "cca-f", domain: null, lane: "practitioner", kind: "track-overview", title: "CCA-F — overview", tags: "academy,anthropic,cca-f,CCA-F,practitioner" },
    { file: "anthropic--cca-f/d1-agentic.md", vendor: "anthropic", track: "cca-f", domain: "d1-agentic", lane: "practitioner", kind: "domain", title: "CCA-F · Agentic architectures", tags: "academy,anthropic,cca-f,d1-agentic" },
  ],
};

console.log("uploadFilename / planUploads (pure)");
ok(uploadFilename("a/b/c.md") === "a__b__c.md", "flattens the corpus path to a unique KB name");
const items = planUploads(manifest);
ok(items.length === 2, "one plan item per manifest file");
ok(items[0].name === "anthropic--cca-f__00-track-overview.md", "overview docs get a unique flattened name (no cross-track collision)");
ok(items[0].tags === "academy,anthropic,cca-f,CCA-F,practitioner" && items[1].tags.includes("d1-agentic"), "each doc carries its per-course tags");
ok(items[0].description.includes("overview") && documentDescription(manifest.files[1]).includes("Agentic"), "description names the doc");

console.log("syncAll — upload / duplicate / fail");
{
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET", body: init.body, headers: init.headers });
    if (url.includes("/upload")) {
      const tags = init.body.get("tags");
      return { ok: true, json: async () => ({ status: tags.includes("d1-agentic") ? "duplicate" : "created", document_id: "x" }) };
    }
    return { ok: true, json: async () => [] };
  };
  const res = await syncAll(items, { server: "https://srv", apiKey: "K", workspaceId: "ws1", fetchImpl: fakeFetch, readFile: (r) => "# " + r, log: { log() {}, error() {} } });
  ok(res.uploaded === 1 && res.duplicate === 1 && res.failed === 0, "counts created vs duplicate from the response status");
  const up = calls.filter((c) => c.url.includes("/upload"));
  ok(up.length === 2 && up[0].headers["x-api-key"] === "K" && up[0].headers["X-Workspace-ID"] === "ws1", "every upload carries x-api-key + X-Workspace-ID");
  ok(up[0].body.get("file") && up[0].body.get("description") && up[0].body.get("tags"), "posts multipart file + tags + description");
}

console.log("syncAll --replace (delete the exact-name twin, then upload)");
{
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET" });
    if (url.includes("/upload")) return { ok: true, json: async () => ({ status: "created" }) };
    if ((init.method || "GET") === "DELETE") return { ok: true };
    // list search → one exact-name match + one unrelated doc
    return { ok: true, json: async () => [
      { id: "old1", filename: "anthropic--cca-f__00-track-overview.md" },
      { id: "other", filename: "something-else.md" },
    ] };
  };
  const res = await syncAll([items[0]], { server: "https://srv", apiKey: "K", workspaceId: "ws1", replace: true, fetchImpl: fakeFetch, readFile: () => "#", log: { log() {}, error() {} } });
  ok(res.replaced === 1 && res.uploaded === 1, "deletes the exact-name doc, then uploads the new copy");
  ok(calls.some((c) => c.method === "DELETE" && c.url.includes("old1")) && !calls.some((c) => c.url.includes("other")), "only the exact-name match is deleted (not a fuzzy search hit)");
}

console.log("syncAll — a non-ok upload counts as failed");
{
  const fakeFetch = async (url) => (url.includes("/upload") ? { ok: false, status: 403, text: async () => "forbidden" } : { ok: true, json: async () => [] });
  const res = await syncAll([items[0]], { server: "s", apiKey: "K", workspaceId: "w", fetchImpl: fakeFetch, readFile: () => "#", log: { log() {}, error() {} } });
  ok(res.failed === 1 && res.uploaded === 0, "403 → failed, not counted as uploaded");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
