#!/usr/bin/env node
// Validate every content track: schema sanity, weights sum to 1.0, unique ids,
// answerable questions, resolvable references. Exit non-zero on any error.
//
// PRD-FACTORY-GATE US-001: the checks themselves live in
// server/content/validate-tree.js — one pure library, two callers. This
// wrapper owns exactly what a CLI owns: the disk walk, JSON parsing (and its
// error messages), printing, and the exit code. The draft plane calls the
// same library against its in-memory effective tree, so a draft cannot be
// approved with a defect this gate would have failed a PR for.
//
// One deliberate divergence from the pre-extraction script: a domain file
// with INVALID JSON now reports both "invalid JSON — …" (from this wrapper)
// and "missing domain file …" (from the library, which never receives the
// unparseable doc). The old script printed only the first. Both lines are
// true, and the gate fails either way.
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { validateContentTree } from "../server/content/validate-tree.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "content");
const PUBLIC = dirname(ROOT);
const parseErrors = [];
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

// ── Build the documents map in the exact order the old script walked ────
const documents = new Map();

for (const { vendor, track, dir } of findTracks(ROOT)) {
  const label = `${vendor}/${track}`;
  let t;
  try { t = read(join(dir, "track.json")); } catch (e) { parseErrors.push(`${label}: track.json invalid — ${e.message}`); continue; }
  documents.set(`${vendor}/${track}/track.json`, t);
  for (const df of t.domainFiles || []) {
    const dp = join(dir, df);
    if (!existsSync(dp)) continue; // the library reports the missing file
    try { documents.set(`${vendor}/${track}/${df}`, read(dp)); }
    catch (e) { parseErrors.push(`${label}/${df}: invalid JSON — ${e.message}`); }
  }
}

for (const single of ["manifest.json", "paths.json", "levels.json", "podcasts.json"]) {
  const p = join(ROOT, single);
  if (!existsSync(p)) continue; // the library reports the missing singleton
  try { documents.set(single, read(p)); }
  catch (e) { parseErrors.push(`${single} invalid — ${e.message}`); }
}

// ── Validate ────────────────────────────────────────────────────────────
const { errors, warnings, info } = validateContentTree(documents, {
  assetExists: (rel) => existsSync(join(PUBLIC, rel)),
});
const allErrors = [...parseErrors, ...errors];

info.forEach((l) => console.log(l));
if (warnings.length) { console.log("\nWarnings:"); warnings.forEach((w) => console.log("  ! " + w)); }
if (allErrors.length) { console.error("\nErrors:"); allErrors.forEach((e) => console.error("  ✗ " + e)); process.exit(1); }
console.log(`\n✓ content valid${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : ""}`);
