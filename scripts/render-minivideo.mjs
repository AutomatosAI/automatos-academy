#!/usr/bin/env node
// LA-14 · Lane 2 — verified payload → vertical mini-video.
//
//   node scripts/render-minivideo.mjs <payload.json|dir> [--out dist/minivideos]
//
// A payload file is the SAME shape an infographic takes
// (`{ domainId, index, title, points[], eyebrow?, source? }`) — the factory
// drafts one verified payload and both renderers film it. Output is named
// after the slot it binds to (`mv-<domain>-<n>.mp4`), so the existing
// bulk-bind path picks it up with no new vocabulary.
//
// Puppeteer is NOT a dependency of this repo (it drags Chromium in and every
// CI install would pay for it); the workflow installs it with --no-save for
// the render job only. ffmpeg is preinstalled on the runner.
//
// Order of operations is the PRD's rule, not an implementation detail: the
// payload is VERIFIED before any pixels exist. A card that cannot be filmed
// correctly is a rejected payload, never a video that cuts off mid-sentence.

import { readdir, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  MINIVIDEO_SIZE,
  MINIVIDEO_TIMING,
  minivideoSlotId,
  toRenderParams,
  toRenderQuery,
  toSlides,
  planTimeline,
  toVtt,
} from "../server/media/minivideo.js";

const run = promisify(execFile);
const RENDER_PAGE = path.resolve("render/minivideo.html");

function parseArgs(argv) {
  const args = argv.slice(2);
  const outIdx = args.indexOf("--out");
  const out = outIdx >= 0 ? args[outIdx + 1] : "dist/minivideos";
  const target = args.find((a) => !a.startsWith("--") && a !== out);
  return { target, out };
}

async function payloadFiles(target) {
  if (!target || !existsSync(target)) return [];
  if (statSync(target).isDirectory()) {
    const names = await readdir(target);
    return names.filter((n) => n.endsWith(".json")).sort().map((n) => path.join(target, n));
  }
  return [target];
}

/** payload file → { slotId, params, plan } or an error, with nothing rendered */
async function prepare(file) {
  let payload;
  try {
    payload = JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    return { file, error: `not JSON (${err.message})` };
  }
  const slotId = minivideoSlotId(payload.domainId, payload.index);
  if (!slotId) return { file, error: `bad domainId/index (${payload.domainId}/${payload.index})` };
  const v = toRenderParams(payload);
  if (!v.ok) return { file, error: `${v.error}${v.note ? ` — ${v.note}` : ""}` };
  const plan = planTimeline(toSlides(v.params));
  if (!plan.ok) return { file, error: `${plan.error}${plan.note ? ` — ${plan.note}` : ""}` };
  return { file, slotId, params: v.params, plan };
}

/**
 * The xfade chain.
 *
 * xfade's `offset` is when the transition begins on the timeline of what came
 * before it, so the offsets are NOT a running sum of slide lengths — every
 * join swallows one fade. planTimeline already tracks exactly that (it
 * advances by `frames - fadeFrames` per slide), so each slide's `offsetFrames`
 * IS its join offset, and the VTT cues and the video use one shared timeline
 * rather than two that can disagree.
 */
function filterChain(plan) {
  const { slides, fps, fadeFrames } = plan;
  const d = (fadeFrames / fps).toFixed(4);
  const parts = [];
  let label = "[0:v]";
  for (let i = 1; i < slides.length; i++) {
    const offset = (slides[i].offsetFrames / fps).toFixed(4);
    const out = i === slides.length - 1 ? "[v]" : `[x${i}]`;
    parts.push(`${label}[${i}:v]xfade=transition=fade:duration=${d}:offset=${offset}${out}`);
    label = out;
  }
  return parts.join(";");
}

async function ffmpegAvailable() {
  try {
    await run("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { target, out } = parseArgs(process.argv);
  const files = await payloadFiles(target);
  if (!files.length) {
    console.error(`No payloads found at ${target || "(no path given)"}`);
    process.exit(1);
  }
  if (!existsSync(RENDER_PAGE)) {
    console.error(`Missing render page: ${RENDER_PAGE}`);
    process.exit(1);
  }
  if (!(await ffmpegAvailable())) {
    console.error("ffmpeg not found on PATH — the render job installs it, a local run needs it too.");
    process.exit(1);
  }

  // Verify every payload BEFORE launching a browser: a batch with one bad
  // card should fail in a second with a readable reason, not after N renders.
  const prepared = [];
  const rejected = [];
  for (const f of files) {
    const r = await prepare(f);
    (r.error ? rejected : prepared).push(r);
  }
  for (const r of rejected) console.error(`  ✗ ${path.basename(r.file)} — ${r.error}`);
  if (rejected.length) {
    console.error(`\n${rejected.length} payload(s) rejected — nothing rendered.`);
    process.exit(1);
  }

  const { default: puppeteer } = await import("puppeteer");
  await mkdir(out, { recursive: true });

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: MINIVIDEO_SIZE.w, height: MINIVIDEO_SIZE.h, deviceScaleFactor: 1 });

    for (const { slotId, params, plan } of prepared) {
      const frameDir = path.join(out, `.frames-${slotId}`);
      await mkdir(frameDir, { recursive: true });

      // ── film the stills ──────────────────────────────────────────────
      const framePaths = [];
      for (const slide of plan.slides) {
        const url = `${pathToFileURL(RENDER_PAGE).href}?${toRenderQuery(params, slide)}`;
        await page.goto(url, { waitUntil: "load" });
        await page.waitForFunction("window.__renderReady === true");
        const f = path.join(frameDir, `slide-${String(slide.index).padStart(2, "0")}.png`);
        await page.screenshot({ path: f, type: "png" });
        framePaths.push(f);
      }

      // ── composite ────────────────────────────────────────────────────
      const args = ["-y", "-nostdin"];
      // bitexact + stripped metadata so the same payload encodes to the same
      // bytes: without it every run stamps a fresh creation time and FR-5's
      // "same payload → same output" is quietly untrue.
      args.push("-fflags", "+bitexact");
      plan.slides.forEach((slide, i) => {
        args.push("-loop", "1", "-framerate", String(plan.fps),
          "-t", (slide.frames / plan.fps).toFixed(4), "-i", framePaths[i]);
      });
      args.push(
        "-filter_complex", filterChain(plan),
        "-map", "[v]",
        "-r", String(plan.fps),
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-flags:v", "+bitexact",
        "-map_metadata", "-1",
        "-movflags", "+faststart",
        path.join(out, `${slotId}.mp4`),
      );
      await run("ffmpeg", args, { maxBuffer: 32 * 1024 * 1024 });

      // Cues written from the SAME plan the video was cut from — not derived
      // from the finished file, where a rounding difference would desync them.
      await writeFile(path.join(out, `${slotId}.vtt`), toVtt(plan), "utf8");
      await rm(frameDir, { recursive: true, force: true });

      console.log(
        `  ✓ ${slotId} → ${path.join(out, `${slotId}.mp4`)} ` +
          `(${plan.slides.length} slides, ${plan.totalSeconds.toFixed(1)}s)`,
      );
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${prepared.length} mini-video(s) rendered into ${out}`);
  console.log(`   band: ${MINIVIDEO_TIMING.minTotalSeconds}–${MINIVIDEO_TIMING.maxTotalSeconds}s · ${MINIVIDEO_TIMING.fps}fps · ${MINIVIDEO_SIZE.w}×${MINIVIDEO_SIZE.h}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
