#!/usr/bin/env node
// Validate every content track: schema sanity, weights sum to 1.0, unique ids,
// answerable questions, resolvable references. Exit non-zero on any error.
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { collectEpisodeErrors } from "../server/podcasts.js";
import { validateCards } from "../server/cards/types.js";
import { cardsFromDomain } from "../server/cards/map.js";

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
  // Two shapes: exam tracks (weighted blueprint, mock, A+ gate) and skills
  // tracks (no exam{} — APA/ABF/AI-Security shape; weights optional).
  const isExam = !!(t.exam && t.exam.questionCount);
  if (t.exam && !t.exam.questionCount) err(`${label}: exam{} present but questionCount missing — either complete it or drop exam{} (skills track)`);
  if (!isExam) console.log(`${label}: skills track (no exam — weights optional, no readiness gate)`);
  // Non-1000 scales (e.g. AIGP's 100–500) must state their A+ margin bar
  // explicitly — the historic 800 default only makes sense on a 1000 scale.
  if (isExam && t.exam.scoreScale && t.exam.scoreScale !== 1000 && !t.exam.aPlusScore) {
    warn(`${label}: scoreScale ${t.exam.scoreScale} without exam.aPlusScore — set the A+ margin bar explicitly`);
  }
  if (isExam && t.exam.aPlusScore && !(t.exam.aPlusScore > t.exam.passingScore && t.exam.aPlusScore <= (t.exam.scoreScale || 1000))) {
    err(`${label}: exam.aPlusScore ${t.exam.aPlusScore} must sit between passingScore and scoreScale`);
  }

  const ids = new Set();
  const cardIds = new Set(); // LA-1 — card uids are unique per track
  let weightSum = 0, domainCount = 0, weighted = 0, cardCount = 0;
  for (const df of t.domainFiles || []) {
    const dp = join(dir, df);
    if (!existsSync(dp)) { err(`${label}: missing domain file ${df}`); continue; }
    let d;
    try { d = read(dp); } catch (e) { err(`${label}/${df}: invalid JSON — ${e.message}`); continue; }
    domainCount++;
    weightSum += d.weight || 0;
    if (typeof d.weight === "number") weighted++;
    if (isExam && typeof d.weight !== "number") err(`${label}/${df}: weight missing/not a number (exam tracks are blueprint-weighted)`);
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
    // LA-1 — the whole domain must project cleanly into the typed feed
    // (cardsFromDomain validates any authored cards[] on the way through).
    // Cards are served by /api/catalog/cards, so a malformed card is a
    // merge-time error here, never a serve-time surprise.
    const projected = cardsFromDomain(d, { vendorId: vendor, trackId: track, domainId: d.id });
    projected.errors.forEach(err);
    for (const c of projected.cards) {
      if (cardIds.has(c.uid)) err(`${df}: duplicate card uid ${c.uid}`); else cardIds.add(c.uid);
    }
    cardCount += projected.cards.length;
    console.log(`  ✓ ${d.code || df} — ${(d.lessons || []).length} lessons, ${(d.questions || []).length} q, ${(d.scenarios || []).length} scn, ${projected.cards.length} cards, weight ${d.weight}`);
  }
  // Track-scope cards (LA-11's changelog seam) — same contract, no derivation.
  {
    const r = validateCards(t.cards, { scope: { vendorId: vendor, trackId: track }, where: `${label}: track cards` });
    r.errors.forEach(err);
    for (const c of r.cards) {
      if (cardIds.has(c.uid)) err(`${label}: duplicate card uid ${c.uid}`); else cardIds.add(c.uid);
    }
    cardCount += r.cards.length;
  }
  if (cardCount) console.log(`${label}: ${cardCount} feed cards`);
  // Exam tracks must sum to 1.000. A skills track may omit weights entirely;
  // if it declares any, they must still sum (half-weighted = authoring bug).
  if ((isExam || weighted > 0) && domainCount && Math.abs(weightSum - 1) > 0.005) err(`${label}: domain weights sum to ${weightSum.toFixed(3)}, expected 1.000`);
  console.log(`${label}: ${domainCount} domains${isExam || weighted ? `, weight sum ${weightSum.toFixed(3)}` : ""}`);
}

// ── Paths & levels (D6 content objects — CONTENT-API-CONTRACT.md §3) ──
// Both files are required: the Content API serves them, and the mobile
// chooser + `path` mastery scope have no source data without them.
{
  const manifest = existsSync(join(ROOT, "manifest.json")) ? read(join(ROOT, "manifest.json")) : null;
  if (!manifest) err("manifest.json missing");
  const manifestTracks = new Map(); // "vendor/track" → {lane, status}
  for (const v of manifest?.vendors || []) for (const t of v.tracks || []) {
    manifestTracks.set(`${v.id}/${t.trackId}`, { lane: t.lane, status: t.status });
  }
  const refKey = (r) => `${r?.vendorId}/${r?.trackId}`;
  const validRef = (r, where) => {
    if (!r || typeof r.vendorId !== "string" || typeof r.trackId !== "string") { err(`${where}: malformed track ref ${JSON.stringify(r)}`); return false; }
    if (!manifestTracks.has(refKey(r))) { err(`${where}: track ref ${refKey(r)} not in manifest`); return false; }
    return true;
  };

  let paths = null, levels = null;
  if (!existsSync(join(ROOT, "paths.json"))) err("paths.json missing (D6 — required by the Content API)");
  else try { paths = read(join(ROOT, "paths.json")); } catch (e) { err(`paths.json invalid — ${e.message}`); }
  if (!existsSync(join(ROOT, "levels.json"))) err("levels.json missing (D6 — required by the Content API)");
  else try { levels = read(join(ROOT, "levels.json")); } catch (e) { err(`levels.json invalid — ${e.message}`); }

  if (paths) {
    const ids = new Set();
    for (const p of paths.paths || []) {
      const where = `paths/${p.id || "?"}`;
      if (!p.id || !p.name) err(`${where}: id and name required`);
      if (ids.has(p.id)) err(`${where}: duplicate path id`); else ids.add(p.id);
      if (!Array.isArray(p.tracks) || !p.tracks.length) { err(`${where}: needs ≥1 ordered track ref`); continue; }
      const resolved = p.tracks.filter((r) => validRef(r, where));
      if (resolved.length && !resolved.some((r) => manifestTracks.get(refKey(r)).status === "live")) {
        err(`${where}: every track is unpublished — a path may not be all coming-soon`);
      }
    }
    if (!(paths.paths || []).length) err("paths.json: empty paths[]");
    else console.log(`paths: ${(paths.paths || []).length} learning paths`);
  }

  if (levels) {
    const ids = new Set(), orders = new Set(), covered = new Map(); // "vendor/track" → levelId
    for (const l of levels.levels || []) {
      const where = `levels/${l.id || "?"}`;
      if (!l.id || !l.name || typeof l.order !== "number") err(`${where}: id, name, numeric order required`);
      if (ids.has(l.id)) err(`${where}: duplicate level id`); else ids.add(l.id);
      if (orders.has(l.order)) err(`${where}: duplicate order ${l.order}`); else orders.add(l.order);
      for (const r of l.tracks || []) {
        if (!validRef(r, where)) continue;
        const key = refKey(r);
        if (covered.has(key)) err(`${where}: ${key} already in level ${covered.get(key)} — a track appears in exactly one level`);
        covered.set(key, l.id);
        const lane = manifestTracks.get(key).lane;
        if (lane && lane !== l.id) err(`${where}: ${key} has manifest lane "${lane}" but sits in level "${l.id}" — levels are lanes promoted to objects, they must agree`);
      }
    }
    for (const [key, meta] of manifestTracks) {
      if (meta.status === "live" && !covered.has(key)) err(`levels: live track ${key} not assigned to any level`);
    }
    if (!(levels.levels || []).length) err("levels.json: empty levels[]");
    else console.log(`levels: ${(levels.levels || []).length} levels, ${covered.size} tracks assigned`);
  }

  // ── Podcasts (PRD-MT-10 — CONTENT-API-CONTRACT.md §8) ──────────────────
  // Episode shape is the app's client contract (schema.ts); collectEpisodeErrors
  // (server/podcasts.js) is the ONE shared judge the boot index uses too, so a
  // malformed manifest fails the PR here, not the deploy. Every episode's
  // (vendorId, trackId) must resolve to a real manifest track — no dangling audio.
  const pp = join(ROOT, "podcasts.json");
  if (!existsSync(pp)) err("podcasts.json missing (PRD-MT-10 — required by the Content API)");
  else {
    let pod = null;
    try { pod = read(pp); } catch (e) { err(`podcasts.json invalid — ${e.message}`); }
    if (pod) {
      if (typeof pod.version !== "number") err("podcasts.json: version must be a number");
      if (!Array.isArray(pod.episodes)) err("podcasts.json: episodes must be an array");
      const epIds = new Set();
      for (const ep of pod.episodes || []) {
        const where = `podcasts/${ep?.id || "?"}`;
        for (const m of collectEpisodeErrors(ep, where)) err(m);
        if (ep?.id) { if (epIds.has(ep.id)) err(`${where}: duplicate episode id`); else epIds.add(ep.id); }
        validRef({ vendorId: ep?.vendorId, trackId: ep?.trackId }, where);
      }
      const n = (pod.episodes || []).length;
      console.log(`podcasts: ${n} episode${n === 1 ? "" : "s"}`);
    }
  }
}

if (warnings.length) { console.log("\nWarnings:"); warnings.forEach((w) => console.log("  ! " + w)); }
if (errors.length) { console.error("\nErrors:"); errors.forEach((e) => console.error("  ✗ " + e)); process.exit(1); }
console.log(`\n✓ content valid${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : ""}`);
