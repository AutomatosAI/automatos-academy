#!/usr/bin/env node
// LA-14 · Lane 2 — verified payload → vertical mini-video.
//
//   node scripts/render-minivideo.mjs <payload.json|dir> [--out dist/minivideos]
//                                     [--narrate] [--voice-cache dist/voice-cache]
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
//
// --narrate: every slide with a caption is also spoken — the caption's own
// words, in the lessons' voice (server/audio/fishLane.js, Laura), one Fish
// call per line. Needs FISH_API_KEY. The clips are content-addressed
// (audioHash of the spoken text + the locked settings) into --voice-cache, so
// a re-render bills only lines that changed — and a cached clip is the same
// bytes, which is what keeps FR-5 true for a narrated video. Every payload is
// verified silent FIRST, so a batch with a bad card fails before any spend.

import { readdir, readFile, mkdir, writeFile, rm, rename } from "node:fs/promises";
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
  narrationLines,
} from "../server/media/minivideo.js";
import { FISH_SETTINGS, audioHash, ttsSegment } from "../server/audio/fishLane.js";
import { inlineText } from "../server/audio/speakable.js";

const run = promisify(execFile);
const RENDER_PAGE = path.resolve("render/minivideo.html");

function parseArgs(argv) {
  const args = argv.slice(2);
  const valued = new Set(["--out", "--voice-cache"]);
  const opts = { out: "dist/minivideos", voiceCache: "dist/voice-cache", narrate: false, target: undefined };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--narrate") opts.narrate = true;
    else if (valued.has(a)) {
      const v = args[++i];
      if (a === "--out") opts.out = v;
      else opts.voiceCache = v;
    } else if (!a.startsWith("--") && opts.target === undefined) opts.target = a;
  }
  return opts;
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

/** the mixer's half of the plan: each narrated slide's clip, delayed to its
 *  frame, summed, then padded/trimmed to EXACTLY the video's runtime so the
 *  audio stream never ends early or runs past the last frame. */
function audioChain(plan, firstInput) {
  const voiced = plan.slides.filter((s) => s.voice);
  const total = (plan.totalFrames / plan.fps).toFixed(4);
  const parts = voiced.map((s, k) => {
    const ms = Math.round((s.voice.offsetFrames / plan.fps) * 1000);
    return `[${firstInput + k}:a]adelay=${ms}:all=1[a${k}]`;
  });
  const inputs = voiced.map((_, k) => `[a${k}]`).join("");
  parts.push(`${inputs}amix=inputs=${voiced.length}:normalize=0:dropout_transition=0,apad=whole_dur=${total},atrim=0:${total}[a]`);
  return parts.join(";");
}

/** seconds of audio in a clip, as ffprobe reads its container */
async function clipSeconds(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  const seconds = Number(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`ffprobe could not time ${file}: "${stdout.trim()}"`);
  return seconds;
}

/**
 * One prepared payload → its narration clips (cached or synthesised) and a
 * plan re-cut around their real lengths. Returns the prepared entry with
 * `clips` + the narrated `plan`, or `{ file, error }` when the voiced video no
 * longer fits the format — refused like any other unfilmable payload.
 */
async function narrate(entry, { key, voiceCache, spend }) {
  const slides = entry.plan.slides.map(({ role, title, text, index }) => ({ role, title, text, index }));
  const lines = narrationLines(slides);
  const clips = [];
  const voiceSeconds = [];
  for (const line of lines) {
    if (!line) { voiceSeconds.push(null); continue; }
    const spoken = inlineText(line);
    const file = path.join(voiceCache, `${audioHash(spoken, FISH_SETTINGS)}.mp3`);
    if (existsSync(file)) {
      spend.cached++;
      voiceSeconds.push(await clipSeconds(file));
    } else {
      // Written aside and timed BEFORE it takes its hash name: the cache is
      // trusted on name alone, so a clip that cannot be read must never get one.
      const part = `${file}.part`;
      try {
        await writeFile(part, await ttsSegment(spoken, key, FISH_SETTINGS));
        spend.billed++;
        spend.chars += spoken.length;
        voiceSeconds.push(await clipSeconds(part));
        await rename(part, file);
      } catch (err) {
        // Reported per payload like any other refusal, Fish's error verbatim.
        await rm(part, { force: true });
        return { file: entry.file, error: `narration failed: ${err.message}` };
      }
    }
    clips.push(file);
  }
  const plan = planTimeline(slides, MINIVIDEO_TIMING, voiceSeconds);
  if (!plan.ok) return { file: entry.file, error: `narrated: ${plan.error}${plan.note ? ` — ${plan.note}` : ""}` };
  return { ...entry, plan, clips };
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
  const { target, out, narrate: narrated, voiceCache } = parseArgs(process.argv);
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
  const refuse = (list) => {
    for (const r of list) console.error(`  ✗ ${path.basename(r.file)} — ${r.error}`);
    console.error(`\n${list.length} payload(s) rejected — nothing rendered.`);
    process.exit(1);
  };
  if (rejected.length) refuse(rejected);

  // Narration happens AFTER every payload has passed silent and BEFORE any
  // pixels: a voice that pushes a video past the band refuses the batch here,
  // with a reason, rather than after N renders.
  let ready = prepared;
  if (narrated) {
    const key = process.env.FISH_API_KEY;
    if (!key) {
      console.error("--narrate needs FISH_API_KEY — refusing to render a silent video that was asked to speak.");
      process.exit(1);
    }
    await mkdir(voiceCache, { recursive: true });
    const spend = { billed: 0, cached: 0, chars: 0 };
    ready = [];
    const voiceRejected = [];
    for (const entry of prepared) {
      const r = await narrate(entry, { key, voiceCache, spend });
      (r.error ? voiceRejected : ready).push(r);
    }
    console.log(`narration: ${spend.billed} line(s) synthesised (${spend.chars} chars billed), ${spend.cached} from cache`);
    if (voiceRejected.length) refuse(voiceRejected);
  }

  const { default: puppeteer } = await import("puppeteer");
  await mkdir(out, { recursive: true });

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: MINIVIDEO_SIZE.w, height: MINIVIDEO_SIZE.h, deviceScaleFactor: 1 });

    for (const { slotId, params, plan, clips = [] } of ready) {
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
      // Narration clips follow the stills as inputs, in slide order — the
      // order audioChain numbers them in.
      for (const clip of clips) args.push("-i", clip);
      const graph = clips.length
        ? `${filterChain(plan)};${audioChain(plan, plan.slides.length)}`
        : filterChain(plan);
      args.push(
        "-filter_complex", graph,
        "-map", "[v]",
        "-r", String(plan.fps),
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-flags:v", "+bitexact",
      );
      if (clips.length) {
        args.push("-map", "[a]", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", "-flags:a", "+bitexact");
      }
      args.push(
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
          `(${plan.slides.length} slides, ${plan.totalSeconds.toFixed(1)}s${clips.length ? `, ${clips.length} narrated` : ", silent"})`,
      );
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${ready.length} mini-video(s) rendered into ${out}`);
  console.log(`   band: ${MINIVIDEO_TIMING.minTotalSeconds}–${MINIVIDEO_TIMING.maxTotalSeconds}s · ${MINIVIDEO_TIMING.fps}fps · ${MINIVIDEO_SIZE.w}×${MINIVIDEO_SIZE.h}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
