#!/usr/bin/env node
// validate-tree tests (PRD-FACTORY-GATE US-001) — the pure library that is now
// the ONE definition of content validity for both the git lane and the draft
// plane. Same zero-framework style as the other suites.
//
// The CLI's behaviour is proven separately (byte-identical output on the real
// tree, gated by content-publish.yml). These tests prove the library catches
// each defect class the factory gate exists to stop, against minimal fixture
// trees — so US-002 can assert "approving this draft 422s" against the same
// fixtures.
import { validateContentTree } from "../server/content/validate-tree.js";

let failures = 0;
function ok(cond, label) {
  if (cond) { console.log(`  ok   ${label}`); return; }
  failures++;
  console.error(`  FAIL ${label}`);
}
const section = (t) => console.log(`\n${t}`);

/** Minimal clean tree: one live skills track, one domain, all singletons. */
function cleanTree() {
  return new Map(Object.entries({
    "manifest.json": {
      vendors: [{ id: "v", name: "Vendor", tracks: [{ trackId: "t", name: "Track", lane: "core", status: "live" }] }],
    },
    "v/t/track.json": { name: "Track", domainFiles: ["d1.json"] },
    "v/t/d1.json": {
      id: "d1", code: "D1",
      lessons: [{ id: "l1", title: "Lesson one", body: "Words.", knowledgeCheck: [] }],
      questions: [{
        id: "q1", domainId: "d1", stem: "Which?", explanation: "Because.",
        options: [{ id: "a", text: "A", correct: true }, { id: "b", text: "B" }],
      }],
      scenarios: [],
    },
    "paths.json": { paths: [{ id: "p1", name: "Path", tracks: [{ vendorId: "v", trackId: "t" }] }] },
    "levels.json": { levels: [{ id: "core", name: "Core", order: 1, tracks: [{ vendorId: "v", trackId: "t" }] }] },
    "podcasts.json": { version: 1, episodes: [] },
  }));
}

const run = (docs, opts) => validateContentTree(docs, { assetExists: () => true, ...opts });
const hasError = (r, rx) => r.errors.some((e) => rx.test(e));

// ── The clean tree is clean ──────────────────────────────────────────────
section("clean fixture tree");
{
  const r = run(cleanTree());
  ok(r.errors.length === 0, `no errors on the clean tree (got: ${r.errors[0] || "none"})`);
  ok(r.info.some((l) => /v\/t: 1 domains/.test(l)), "info carries the per-track summary the CLI prints");
  ok(r.info.some((l) => /skills track/.test(l)), "skills track (no exam{}) is named, not failed");
}

// ── Each factory-gate defect class ───────────────────────────────────────
section("defect: dead repo-relative link (the 211-dead-links class)");
{
  const docs = cleanTree();
  docs.get("v/t/d1.json").resources = [{ id: "r1", title: "Doc", url: "automatos-gitbook/about.md" }];
  ok(hasError(run(docs), /not reachable from a browser/), "repo-relative url is an error");
}

section("defect: root-relative url with no file behind it");
{
  const docs = cleanTree();
  docs.get("v/t/d1.json").resources = [{ id: "r1", title: "Doc", url: "/content/v/missing.pdf" }];
  ok(hasError(run(docs, { assetExists: () => false }), /has no file at public/), "missing asset is an error when assetExists says no");
  ok(!hasError(run(docs, { assetExists: () => true }), /has no file/), "…and clean when the injected check says the file exists");
}

section("defect: markdown token in a plain-text field (the GH-500 D1 class)");
{
  const docs = cleanTree();
  docs.get("v/t/d1.json").lessons[0].title = "**Secret Protection**";
  ok(hasError(run(docs), /markdown token in a plain-text field/), "bold tokens in a title are an error");
}

section("defect: question with no correct option");
{
  const docs = cleanTree();
  docs.get("v/t/d1.json").questions[0].options = [{ id: "a", text: "A" }, { id: "b", text: "B" }];
  ok(hasError(run(docs), /no correct option/), "unanswerable question is an error");
}

section("defect: duplicate question id across a domain");
{
  const docs = cleanTree();
  const q = docs.get("v/t/d1.json").questions[0];
  docs.get("v/t/d1.json").questions.push({ ...q });
  ok(hasError(run(docs), /duplicate question id q1/), "duplicate id is an error");
}

section("defect: exam-track weights that do not sum to 1.000");
{
  const docs = cleanTree();
  docs.get("v/t/track.json").exam = { questionCount: 50, passingScore: 700, scoreScale: 1000 };
  docs.get("v/t/d1.json").weight = 0.5;
  ok(hasError(run(docs), /weights sum to 0\.500, expected 1\.000/), "half-weighted blueprint is an error");
}

section("defect: missing domain file (the R2 seam, single-track case)");
{
  const docs = cleanTree();
  docs.get("v/t/track.json").domainFiles = ["d1.json", "d2.json"];
  ok(hasError(run(docs), /missing domain file d2\.json/), "a domainFiles entry with no document is an error");
}

section("defect: podcast episode pointing at no manifest track");
{
  const docs = cleanTree();
  docs.get("podcasts.json").episodes = [{
    id: "e1", title: "Ep", vendorId: "ghost", trackId: "nope",
    durationSec: 60, chapters: [], audioUrl: "https://cdn.test/e1.m4a", groundingLabel: "g",
  }];
  ok(hasError(run(docs), /track ref ghost\/nope not in manifest/), "dangling episode ref is an error");
}

// ── Contract details the draft plane relies on ──────────────────────────
section("contract");
{
  const r = validateContentTree(Object.fromEntries(cleanTree()), { assetExists: () => true });
  ok(r.errors.length === 0, "a plain object works as well as a Map");
  const docs = cleanTree();
  docs.get("v/t/d1.json").lessons[0].title = "**x**";
  docs.get("v/t/d1.json").questions[0].options = [{ id: "a", text: "A" }];
  const r2 = run(docs);
  ok(r2.errors.length >= 2, "errors are collected, not first-only — the agent fixing a draft needs the full account");
  const missing = run(new Map());
  ok(hasError(missing, /manifest\.json missing/) && hasError(missing, /podcasts\.json missing/), "an empty tree names every missing singleton");
}

console.log(failures ? `\n${failures} failure(s)` : "\nvalidate-tree: all assertions passed");
process.exit(failures ? 1 : 0);
