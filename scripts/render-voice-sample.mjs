#!/usr/bin/env node
// PRD-VOICE §8.1 — the EAR-GATE. Renders a handful of REAL lessons through the
// speakable transform and Fish Audio TTS, so a human can LISTEN before any
// bulk spend. This script is deliberately not the mass job: it picks three
// contrasting lessons, prints the cost before spending it, and refuses to run
// big without being told so.
//
//   FISH_API_KEY=…  node scripts/render-voice-sample.mjs [--out dist/voice-samples]
//     [--lessons vendor/track/domain/lessonId,…]   explicit picks (else auto)
//     [--force]                                    lift the spend cap
//
//   env: FISH_MODEL (default s2.1-pro) · FISH_VOICE (reference id, optional)
//
// Auto-pick, deterministic: the lesson with the MOST fenced code blocks (the
// transform's hardest case), the LONGEST lesson (endurance), and a mid-length
// lesson from a third track (typical case). Same tree → same three lessons.
//
// Outputs per lesson: <slug>.mp3 + <slug>.spoken.txt (exactly what was sent —
// judge the TRANSFORM separately from the VOICE) + manifest.md with the maths.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { speakableLesson } from "../server/audio/speakable.js";

const CONTENT_ROOT = "public/content";
const SPEND_CAP_CHARS = 80_000; // ~$1.20 — an ear-gate, not a bulk job
const FISH_URL = "https://api.fish.audio/v1/tts";

function parseArgs(argv) {
  const args = argv.slice(2);
  const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  return {
    out: val("--out") ?? "dist/voice-samples",
    lessons: (val("--lessons") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    force: args.includes("--force"),
  };
}

/** every lesson in the tree, flat: {vendor, track, domain, id, title, body} */
async function allLessons() {
  const out = [];
  for (const vendor of await readdir(CONTENT_ROOT)) {
    const vDir = path.join(CONTENT_ROOT, vendor);
    let tracks; try { tracks = await readdir(vDir); } catch { continue; }
    for (const track of tracks) {
      const tDir = path.join(vDir, track);
      let files; try { files = (await readdir(tDir)).filter((f) => f.endsWith(".json")); } catch { continue; }
      for (const f of files) {
        let doc; try { doc = JSON.parse(await readFile(path.join(tDir, f), "utf8")); } catch { continue; }
        const domain = doc?.id ?? f.replace(/\.json$/, "");
        for (const lesson of doc?.lessons ?? []) {
          const body = typeof lesson?.body === "string" ? lesson.body : "";
          if (!body.trim()) continue;
          out.push({ vendor, track, domain, id: lesson.id ?? "?", title: lesson.title ?? lesson.id ?? "?", body });
        }
      }
    }
  }
  return out;
}

const fenceCount = (s) => (s.match(/^\s*(```|~~~)/gm) ?? []).length / 2;

/** deterministic contrast picks: most-fenced, longest, mid-length elsewhere */
function autoPick(lessons) {
  const sorted = [...lessons].sort((a, b) => a.body.length - b.body.length);
  const byFences = [...lessons].sort((a, b) => fenceCount(b.body) - fenceCount(a.body) || b.body.length - a.body.length);
  const picks = [];
  const key = (l) => `${l.vendor}/${l.track}/${l.domain}/${l.id}`;
  const trackOf = (l) => `${l.vendor}/${l.track}`;
  picks.push(byFences[0]);                                                    // hardest transform case
  const longest = sorted.findLast((l) => !picks.some((p) => key(p) === key(l)));
  if (longest) picks.push(longest);                                           // endurance
  const mid = sorted[Math.floor(sorted.length / 2)];
  const midPick = picks.some((p) => trackOf(p) === trackOf(mid))
    ? sorted.find((l) => !picks.some((p) => trackOf(p) === trackOf(l)))
    : mid;
  if (midPick) picks.push(midPick);                                           // typical case, third track
  return picks.filter(Boolean);
}

async function tts(text, { key, model, voice, speed }) {
  const res = await fetch(FISH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      model,
    },
    body: JSON.stringify({
      text,
      format: "mp3",
      ...(voice ? { reference_id: voice } : {}),
      // prosody.speed — the ear-gate's pacing dial (TTSRequest.ProsodyControl).
      // 1.0 = the voice's natural pace; Gerard's first-listen verdict on the
      // default voice was "really slow", so this is a first-class knob.
      ...(speed && speed !== 1 ? { prosody: { speed } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    // verbatim, so an API-shape mismatch is a readable morning fix, not a mystery
    throw new Error(`Fish TTS ${res.status} ${res.statusText}\n${body.slice(0, 1200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const { out, lessons: explicit, force } = parseArgs(process.argv);
  const key = process.env.FISH_API_KEY;
  const model = process.env.FISH_MODEL || "s2.1-pro";
  const voice = process.env.FISH_VOICE || "";
  const speed = Number(process.env.FISH_SPEED || "1") || 1;
  if (!key) {
    console.error("FISH_API_KEY is not set — the ear-gate needs a key. Add the repo secret (or export it locally) to activate.");
    process.exit(1);
  }

  const all = await allLessons();
  if (!all.length) { console.error(`No lessons found under ${CONTENT_ROOT}`); process.exit(1); }

  const wanted = explicit.length
    ? explicit.map((spec) => {
        const [vendor, track, domain, id] = spec.split("/");
        const hit = all.find((l) => l.vendor === vendor && l.track === track && l.domain === domain && l.id === id);
        if (!hit) { console.error(`  ✗ no such lesson: ${spec}`); process.exit(1); }
        return hit;
      })
    : autoPick(all);

  const jobs = wanted.map((l) => {
    const spoken = speakableLesson(l.title, l.body).join("\n\n");
    return { ...l, spoken, chars: spoken.length };
  });

  const total = jobs.reduce((n, j) => n + j.chars, 0);
  const usd = (total / 1000) * 0.015;
  console.log(`ear-gate: ${jobs.length} lesson(s), ${total.toLocaleString()} spoken chars ≈ $${usd.toFixed(2)} (${model}${voice ? `, voice ${voice}` : ""}${speed !== 1 ? `, speed ${speed}` : ""})`);
  for (const j of jobs) console.log(`  · ${j.vendor}/${j.track}/${j.domain}/${j.id} — ${j.chars.toLocaleString()} chars, ${fenceCount(j.body)} code fence(s)`);
  if (total > SPEND_CAP_CHARS && !force) {
    console.error(`\nRefusing: ${total.toLocaleString()} chars exceeds the ear-gate cap (${SPEND_CAP_CHARS.toLocaleString()}). This script samples; the mass job is a separate, deliberate lane. --force overrides.`);
    process.exit(1);
  }

  await mkdir(out, { recursive: true });
  const manifest = [
    "# Voice samples — PRD-VOICE §8.1 ear-gate", "",
    `model: \`${model}\` · voice: \`${voice || "(engine default)"}\` · ${new Date().toISOString()}`, "",
    `| lesson | chars | est $ |`, `|---|---|---|`,
  ];
  for (const j of jobs) {
    const slug = `${j.vendor}--${j.track}--${j.domain}--${j.id}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    await writeFile(path.join(out, `${slug}.spoken.txt`), j.spoken, "utf8");
    process.stdout.write(`  → ${slug}.mp3 …`);
    const audio = await tts(j.spoken, { key, model, voice, speed });
    await writeFile(path.join(out, `${slug}.mp3`), audio);
    console.log(` ${(audio.length / 1024).toFixed(0)} KiB`);
    manifest.push(`| ${j.vendor}/${j.track}/${j.domain}/${j.id} | ${j.chars.toLocaleString()} | $${((j.chars / 1000) * 0.015).toFixed(3)} |`);
  }
  manifest.push("", "Listen for: code fences ANNOUNCED not read · list rhythm (First/Next/Finally) · jargon (MCP, RAG, SM-2) · long-form fatigue.", "");
  await writeFile(path.join(out, "manifest.md"), manifest.join("\n"), "utf8");
  console.log(`\n${jobs.length} sample(s) + spoken-text transcripts + manifest → ${out}`);
}

main().catch((err) => { console.error(err.message ?? err); process.exit(1); });
