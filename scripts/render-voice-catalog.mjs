#!/usr/bin/env node
// PRD-VOICE §8.1 — THE MASS JOB. Every lesson in the catalogue → Laura,
// through the exact lane the ear-gate approved (server/audio/fishLane.js:
// stitched breathing, pause-as-section-break, sparse tone tags, natural pace).
//
//   node scripts/render-voice-catalog.mjs                  # DRY RUN (default)
//   node scripts/render-voice-catalog.mjs --render         # spend money
//   node scripts/render-voice-catalog.mjs --tracks anthropic/cca-f,google/gen-ai-leader
//
// Content-addressed, so edits only ever re-bill what changed: the S3 key
// carries audioHash(spoken + settings) — `audio/<lessonId>.<hash>.mp3` — and
// an existing object at that key skips the render entirely (checked with
// `aws s3api head-object`). Change the text, the voice, the speed, or the
// gaps and the hash moves; a new namespace is a deliberate regeneration.
//
// GUARDS: dry-run is the default; --render is the spend switch; a run whose
// estimate exceeds $25 refuses without --force (the whole corpus is ~$17).
// Output: dist/voice-catalog/bindings.json (slot a-<lessonId> → CDN url) +
// manifest.md. Binding into media_bindings is a SEPARATE deliberate step.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { FISH_SETTINGS, buildSpoken, audioHash, renderLesson } from "../server/audio/fishLane.js";

const run = promisify(execFile);
const CONTENT_ROOT = "public/content";
const CDN_BASE = "https://widgets.automatos.app";
const PRICE_PER_1K = 0.015;
const HARD_CAP_USD = 25;
/** spoken heading before a domain's objectives — plain English, not "Objectives" */
const INTRO_OBJECTIVES_HEADING = "What you'll be able to do";

function parseArgs(argv) {
  const a = argv.slice(2);
  const val = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  return {
    render: a.includes("--render"),
    force: a.includes("--force"),
    out: val("--out") ?? "dist/voice-catalog",
    tracks: (val("--tracks") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

/**
 * The spoken form of a domain's INTRO — its overview prose and objectives.
 *
 * Authored as markdown so it flows through the one shared transform the
 * lessons use (heading → pause, list → "First:/Next:/Finally:"), rather than
 * growing a second set of speech rules that could drift from it.
 *
 * Why this exists: the intro is the only part of a cheat sheet that a learner
 * hears BEFORE committing to it — "what is this domain, and what will I be
 * able to do." The app used to read it with the device voice; when device TTS
 * was removed from lesson reading, that left the intro spoken by nothing.
 */
export function introBody(doc) {
  const overview = typeof doc?.overview === "string" ? doc.overview.trim() : "";
  const objectives = (doc?.objectives ?? []).filter((o) => typeof o === "string" && o.trim());
  if (!overview && !objectives.length) return "";
  const parts = [];
  if (overview) parts.push(overview);
  if (objectives.length) {
    parts.push(`## ${INTRO_OBJECTIVES_HEADING}`);
    parts.push(objectives.map((o) => `- ${o.trim()}`).join("\n"));
  }
  return parts.join("\n\n");
}

/**
 * Every unit of narratable content, in the order a learner meets it: each
 * domain's intro, then its lessons. `kind` decides only the slot and file
 * name — both kinds share one transform, one voice and one hash rule, so a
 * settings change re-renders them together or not at all.
 */
async function walkUnits(filterTracks) {
  const out = [];
  for (const vendor of await readdir(CONTENT_ROOT)) {
    const vDir = path.join(CONTENT_ROOT, vendor);
    let tracks; try { tracks = await readdir(vDir); } catch { continue; }
    for (const track of tracks) {
      if (filterTracks.length && !filterTracks.includes(`${vendor}/${track}`)) continue;
      const tDir = path.join(vDir, track);
      let files; try { files = (await readdir(tDir)).filter((f) => f.endsWith(".json")); } catch { continue; }
      for (const f of files) {
        let doc; try { doc = JSON.parse(await readFile(path.join(tDir, f), "utf8")); } catch { continue; }
        const domain = doc?.id ?? f.replace(/\.json$/, "");
        const intro = introBody(doc);
        if (intro.trim()) {
          out.push({
            vendor, track, domain, kind: "intro",
            id: `${domain}-intro`,
            title: doc?.name ?? domain,
            body: intro,
          });
        }
        for (const lesson of doc?.lessons ?? []) {
          const body = typeof lesson?.body === "string" ? lesson.body : "";
          if (!body.trim()) continue;
          out.push({ vendor, track, domain, kind: "lesson", id: lesson.id ?? "?", title: lesson.title ?? lesson.id ?? "?", body });
        }
      }
    }
  }
  return out;
}

async function s3Exists(bucket, key) {
  try { await run("aws", ["s3api", "head-object", "--bucket", bucket, "--key", key]); return true; }
  catch { return false; }
}

async function main() {
  const { render, force, out, tracks } = parseArgs(process.argv);
  const key = process.env.FISH_API_KEY;
  const bucket = process.env.AWS_SDK_DEPLOY_BUCKET;
  const S = FISH_SETTINGS;

  const units = await walkUnits(tracks);
  if (!units.length) { console.error("no content matched"); process.exit(1); }

  // Plan every unit first: spoken form, hash, key. Pure — no network.
  const plan = units.map((l) => {
    const built = buildSpoken(l.title, l.body, S);
    const hash = audioHash(built.spoken, S);
    const s3key = `academy/${l.vendor}/${l.track}/audio/${l.id}.${hash}.mp3`;
    return { ...l, ...built, hash, s3key, slotId: `a-${l.id}` };
  });
  const totalChars = plan.reduce((n, p) => n + p.chars, 0);
  const estUsd = (totalChars / 1000) * PRICE_PER_1K;
  const nIntro = plan.filter((p) => p.kind === "intro").length;
  const nLesson = plan.length - nIntro;

  console.log(`voice-catalog · ${S.SETTINGS_VERSION} · ${nLesson} lessons + ${nIntro} domain intros · ${totalChars.toLocaleString()} spoken chars ≈ $${estUsd.toFixed(2)} ceiling (skips are free)`);
  const byTrack = {};
  for (const p of plan) byTrack[`${p.vendor}/${p.track}`] = (byTrack[`${p.vendor}/${p.track}`] ?? 0) + 1;
  for (const [t, n] of Object.entries(byTrack)) console.log(`  · ${t}: ${n} units`);

  if (!render) {
    console.log("\nDRY RUN (default) — nothing rendered, nothing spent. Re-run with --render.");
    await mkdir(out, { recursive: true });
    await writeFile(path.join(out, "plan.json"),
      JSON.stringify(plan.map(({ vendor, track, domain, kind, id, chars, hash, s3key, slotId }) =>
        ({ vendor, track, domain, kind, id, chars, hash, s3key, slotId })), null, 2));
    console.log(`plan → ${out}/plan.json`);
    return;
  }

  if (!key) { console.error("FISH_API_KEY required for --render"); process.exit(1); }
  if (!bucket) { console.error("AWS_SDK_DEPLOY_BUCKET required for --render (upload target)"); process.exit(1); }
  if (estUsd > HARD_CAP_USD && !force) {
    console.error(`Refusing: estimate $${estUsd.toFixed(2)} exceeds the $${HARD_CAP_USD} cap without --force.`);
    process.exit(1);
  }

  await mkdir(out, { recursive: true });
  const bindings = [];
  let rendered = 0, skipped = 0, spentChars = 0;
  for (const [i, p] of plan.entries()) {
    const label = `${p.vendor}/${p.track}/${p.id}`;
    if (await s3Exists(bucket, p.s3key)) {
      skipped++;
      bindings.push({ slotId: p.slotId, vendor: p.vendor, track: p.track, url: `${CDN_BASE}/${p.s3key}`, hash: p.hash, skipped: true });
      console.log(`  = ${label} (unchanged, ${p.hash})`);
      continue;
    }
    process.stdout.write(`  → [${i + 1}/${plan.length}] ${label} (${p.chars.toLocaleString()} chars)`);
    const tmpFile = path.join(out, `${p.id}.${p.hash}.mp3`);
    const bytes = await renderLesson(p, tmpFile, key, S);
    await run("aws", ["s3", "cp", tmpFile, `s3://${bucket}/${p.s3key}`,
      "--content-type", "audio/mpeg", "--cache-control", "public, max-age=31536000, immutable"]);
    rendered++; spentChars += p.chars;
    bindings.push({ slotId: p.slotId, vendor: p.vendor, track: p.track, url: `${CDN_BASE}/${p.s3key}`, hash: p.hash, bytes });
    console.log(` ✓ ${(bytes / 1024 / 1024).toFixed(1)} MiB`);
  }

  await writeFile(path.join(out, "bindings.json"), JSON.stringify(bindings, null, 2));
  const spent = (spentChars / 1000) * PRICE_PER_1K;
  console.log(`\nrendered ${rendered} · skipped ${skipped} (already current) · spent ≈ $${spent.toFixed(2)}`);
  console.log(`bindings → ${out}/bindings.json — bind into media_bindings as the separate, deliberate next step.`);
}

// Run ONLY as a program. The module also exports introBody for tests, and an
// import must never kick off a job that can spend money — the same reason the
// render itself is opt-in behind --render.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message ?? err); process.exit(1); });
}
