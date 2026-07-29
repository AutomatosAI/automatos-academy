// The Fish render lane (PRD-VOICE §8.1) — ONE implementation shared by the
// ear-gate sampler and the catalogue job. This matters more than tidiness:
// the voice decision was made by EAR against specific behaviour (stitched
// breathing, pause-as-section-break, sparse tone tags, Laura at natural
// pace), and two renderers would let the catalogue drift from what was
// approved. Engine-scoped throughout — nothing here touches the shared
// speakable semantics the app's device TTS relies on.

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SPOKEN, speakableLesson } from "./speakable.js";

const run = promisify(execFile);

/**
 * THE locked production settings — Gerard's ear verdict, 2026-07-29
 * (ROUND-5): Laura ("assertive, easy to listen to"), natural pace, default
 * temperature, sparse tone tags on. SETTINGS_VERSION participates in the
 * content hash: change ANY of this and every lesson's hash moves, which is
 * exactly right — a new voice is new content.
 */
export const FISH_SETTINGS = {
  model: "s2.1-pro",
  voice: "e3cd384158934cc9a01029cd7d278634", // Laura — conversational · educational
  voiceName: "laura",
  speed: 1,
  temperature: null, // engine default — expressiveness without lottery
  tone: true,        // [warm] opening · [casual] code aside
  boldTag: "[emphasis]",
  SETTINGS_VERSION: "fish-s21p-laura-v1",
};

/** classify a RAW transform segment (before decoration strips cues) */
export function kindOf(seg) {
  if (seg.startsWith(SPOKEN.sectionPrefix)) return "heading";
  if (seg === SPOKEN.codeSample) return "code";
  if (/^(First|Next|Finally):/.test(seg)) return "list";
  return "plain";
}

/** silence between segments, by KINDS — the narration rhythm the ear approved.
 *  Longest breath BEFORE a new section (it replaces saying "Section:"). */
export function gapMs(prevKind, nextKind) {
  if (nextKind === "heading") return 750;
  if (prevKind === "heading") return 500;
  if (prevKind === "code") return 500;
  if (prevKind === "list" && nextKind === "list") return 300;
  return 420;
}

/** fish-lane decoration: heading announcements become pauses; two sparse
 *  tone tags. Device TTS keeps the announcements — it has no silence to
 *  speak with. */
export function decorateSegment(seg, i, kind, settings = FISH_SETTINGS) {
  let out = kind === "heading" ? seg.slice(SPOKEN.sectionPrefix.length).trim() : seg;
  if (!settings.tone) return out;
  if (i === 1 && !out.startsWith("[")) out = `[warm] ${out}`;
  if (kind === "code") out = `[casual] ${out}`;
  return out;
}

/** lesson → the exact spoken form the lane will render */
export function buildSpoken(title, body, settings = FISH_SETTINGS) {
  const raw = speakableLesson(title, body, { boldTag: settings.boldTag });
  const kinds = raw.map(kindOf);
  const segments = raw.map((seg, i) => decorateSegment(seg, i, kinds[i], settings));
  const spoken = segments.join("\n\n");
  return { segments, kinds, spoken, chars: spoken.length };
}

/** content address: the spoken TEXT + every setting that shapes the audio.
 *  Same lesson, same settings → same hash → never re-billed. */
export function audioHash(spoken, settings = FISH_SETTINGS) {
  const h = createHash("sha256");
  h.update(settings.SETTINGS_VERSION);
  h.update("|"); h.update(settings.model);
  h.update("|"); h.update(settings.voice);
  h.update("|"); h.update(String(settings.speed));
  h.update("|"); h.update(String(settings.temperature ?? ""));
  h.update("|"); h.update(settings.tone ? "tone" : "");
  h.update("|"); h.update(spoken);
  return h.digest("hex").slice(0, 12);
}

/** one Fish TTS call — errors verbatim, always */
export async function ttsSegment(text, key, settings = FISH_SETTINGS) {
  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model: settings.model },
    body: JSON.stringify({
      text,
      format: "mp3",
      ...(settings.voice ? { reference_id: settings.voice } : {}),
      ...(settings.speed && settings.speed !== 1 ? { prosody: { speed: settings.speed } } : {}),
      ...(settings.temperature ? { temperature: settings.temperature } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`Fish TTS ${res.status} ${res.statusText}\n${body.slice(0, 1200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** per-segment buffers → one MP3 with real silence at the kind boundaries.
 *  Fish returns constant-format mp3 (128k/44.1k mono); silences are generated
 *  in the same format so `-c copy` concat is exact and deterministic. */
export async function stitchToFile(buffers, kinds, outFile) {
  const tmp = path.join(os.tmpdir(), `fish-stitch-${process.pid}-${Date.now()}`);
  await mkdir(tmp, { recursive: true });
  const gaps = kinds.slice(0, -1).map((k, i) => gapMs(k, kinds[i + 1]));
  const silence = {};
  for (const ms of new Set(gaps)) {
    const f = path.join(tmp, `sil-${ms}.mp3`);
    await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
      "-t", (ms / 1000).toFixed(3), "-c:a", "libmp3lame", "-b:a", "128k", f]);
    silence[ms] = f;
  }
  const list = [];
  for (let i = 0; i < buffers.length; i++) {
    const f = path.join(tmp, `seg-${String(i).padStart(3, "0")}.mp3`);
    await writeFile(f, buffers[i]);
    list.push(`file '${f}'`);
    if (i < buffers.length - 1) list.push(`file '${silence[gaps[i]]}'`);
  }
  const listFile = path.join(tmp, "concat.txt");
  await writeFile(listFile, list.join("\n"), "utf8");
  await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outFile],
    { maxBuffer: 64 * 1024 * 1024 });
  return (await readFile(outFile)).length;
}

/** render a whole lesson to a file: segments → TTS (small concurrent pool,
 *  ORDER PRESERVED) → stitch. The pool matters at catalogue scale: thousands
 *  of segment calls sequentially is hours; six in flight is minutes. */
export async function renderLesson({ segments, kinds }, outFile, key, settings = FISH_SETTINGS, concurrency = 6) {
  const buffers = new Array(segments.length);
  let next = 0;
  async function worker() {
    while (next < segments.length) {
      const i = next++;
      buffers[i] = await ttsSegment(segments[i], key, settings);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, segments.length) }, worker));
  return stitchToFile(buffers, kinds, outFile);
}
