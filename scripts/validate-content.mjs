#!/usr/bin/env node
// Validate every content track: schema sanity, weights sum to 1.0, unique ids,
// answerable questions, resolvable references. Exit non-zero on any error.
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "content");
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

function findTracks(dir) {
  const out = [];
  for (const vendor of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const vdir = join(dir, vendor.name);
    for (const track of readdirSync(vdir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const tdir = join(vdir, track.name);
      if (existsSync(join(tdir, "track.json"))) out.push({ vendor: vendor.name, track: track.name, dir: tdir });
    }
  }
  return out;
}

function validateQuestion(q, where, ids) {
  if (!q.id) return err(`${where}: question missing id`);
  if (ids.has(q.id)) err(`${where}: duplicate question id ${q.id}`); else ids.add(q.id);
  if (!q.stem) err(`${q.id}: missing stem`);
  if (!q.explanation) err(`${q.id}: missing explanation`);
  if (!Array.isArray(q.options) || q.options.length < 2) return err(`${q.id}: needs ≥2 options`);
  const correct = q.options.filter((o) => o.correct).length;
  if (correct < 1) err(`${q.id}: no correct option`);
  if (q.type === "multi" ? correct < 2 : correct !== 1) warn(`${q.id}: ${correct} correct for type=${q.type || "single"}`);
  if (new Set(q.options.map((o) => o.id)).size !== q.options.length) err(`${q.id}: duplicate option ids`);
}

for (const { vendor, track, dir } of findTracks(ROOT)) {
  const label = `${vendor}/${track}`;
  let t;
  try { t = read(join(dir, "track.json")); } catch (e) { err(`${label}: track.json invalid — ${e.message}`); continue; }
  if (!t.exam) warn(`${label}: no exam spec`);

  const ids = new Set();
  let weightSum = 0, domainCount = 0;
  for (const df of t.domainFiles || []) {
    const dp = join(dir, df);
    if (!existsSync(dp)) { err(`${label}: missing domain file ${df}`); continue; }
    let d;
    try { d = read(dp); } catch (e) { err(`${label}/${df}: invalid JSON — ${e.message}`); continue; }
    domainCount++;
    weightSum += d.weight || 0;
    if (typeof d.weight !== "number") err(`${label}/${df}: weight missing/not a number`);
    for (const l of d.lessons || []) {
      if (!l.body) warn(`${d.id}/${l.id}: empty lesson body`);
      for (const kc of l.knowledgeCheck || []) {
        if (kc.domainId !== d.id) err(`${kc.id}: domainId ${kc.domainId} ≠ ${d.id}`);
        validateQuestion(kc, `${df}`, ids);
      }
    }
    for (const q of d.questions || []) {
      if (q.domainId !== d.id) err(`${q.id}: domainId ${q.domainId} ≠ ${d.id}`);
      validateQuestion(q, `${df}`, ids);
    }
    for (const s of d.scenarios || []) {
      for (const st of s.steps || []) {
        if (!(st.choices || []).some((c) => c.verdict === "best")) err(`${s.id}/${st.id}: no 'best' choice`);
      }
    }
    console.log(`  ✓ ${d.code || df} — ${(d.lessons || []).length} lessons, ${(d.questions || []).length} q, ${(d.scenarios || []).length} scn, weight ${d.weight}`);
  }
  if (domainCount && Math.abs(weightSum - 1) > 0.005) err(`${label}: domain weights sum to ${weightSum.toFixed(3)}, expected 1.000`);
  console.log(`${label}: ${domainCount} domains, weight sum ${weightSum.toFixed(3)}`);
}

if (warnings.length) { console.log("\nWarnings:"); warnings.forEach((w) => console.log("  ! " + w)); }
if (errors.length) { console.error("\nErrors:"); errors.forEach((e) => console.error("  ✗ " + e)); process.exit(1); }
console.log(`\n✓ content valid${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : ""}`);
