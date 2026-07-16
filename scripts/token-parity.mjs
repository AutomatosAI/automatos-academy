#!/usr/bin/env node
// Token parity — public/academy.css is the canonical "Academy Periwinkle" source
// of truth (FigmaDesigns/academy/handover/TOKENS.md). This fails CI if the
// canonical Mist/Night colours, the Funnel families, the radius scale, or the
// six widget-motion keyframes drift. The app repo (automatos-academy-app) runs
// the mirror check against src/theme/palette.ts, so the two token sources can
// never silently diverge. Zero-dependency; wired into `npm test`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(HERE, "..", "public", "academy.css"), "utf8");
const html = readFileSync(join(HERE, "..", "public", "index.html"), "utf8");

const MIST = {
  "--bg": "#D3DEF0", "--bg-2": "#BECFEA", "--bg-3": "#A9BFDD",
  "--fg": "#273C59", "--accent": "#273C59", "--muted-fill": "#BBC9E5",
};
const NIGHT = { "--bg": "#141D30", "--accent": "#A9BFDD" };
const RADIUS = { "--radius-lg": "24px", "--radius-2xl": "28px", "--radius-pill": "999px" };

const bad = [];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const decl = (name, value) => new RegExp(`${esc(name)}\\s*:\\s*${esc(value)}`, "i");

// Mist tokens live in :root (everything above the night block).
const root = css.split('[data-mood="night"]')[0];
for (const [k, v] of Object.entries(MIST)) if (!decl(k, v).test(root)) bad.push(`Mist ${k}: ${v} missing from :root`);

// Night tokens live in the [data-mood="night"] block.
const nightIdx = css.indexOf('[data-mood="night"]');
if (nightIdx < 0) bad.push('[data-mood="night"] block missing');
const night = nightIdx >= 0 ? css.slice(nightIdx) : "";
for (const [k, v] of Object.entries(NIGHT)) if (!decl(k, v).test(night)) bad.push(`Night ${k}: ${v} missing from [data-mood="night"]`);

for (const [k, v] of Object.entries(RADIUS)) if (!decl(k, v).test(css)) bad.push(`radius ${k}: ${v} missing`);

// Funnel families are canonical; the retired serif/mono voices must be gone.
if (!/--display:\s*"Funnel Display"/.test(css)) bad.push("--display is not Funnel Display");
if (!/--sans:\s*"Funnel Sans"/.test(css)) bad.push("--sans is not Funnel Sans");
if (/"Instrument Serif"|"Geist Mono"|"Geist"/.test(css)) bad.push("a retired font family (Instrument Serif / Geist / Geist Mono) is still referenced in academy.css");
if (!/family=Funnel\+Display/.test(html) || !/family=Funnel\+Sans/.test(html)) bad.push("index.html does not load Funnel Display + Funnel Sans");
if (/Instrument\+Serif|Geist\+Mono|family=Geist:/.test(html)) bad.push("index.html still loads a retired Google font");

// The six widget-motion keyframes from the design mock (§5).
for (const kf of ["floatY", "barGrow", "ringSweep", "flamePulse", "shimmerX", "playPulse"]) {
  if (!new RegExp(`@keyframes\\s+${kf}\\b`).test(css)) bad.push(`@keyframes ${kf} missing`);
}
if (!/prefers-reduced-motion:\s*reduce/.test(css)) bad.push("prefers-reduced-motion guard missing");

if (bad.length) {
  console.error("✗ token parity FAILED:\n  " + bad.join("\n  "));
  process.exit(1);
}
console.log("✓ tokens in parity — Mist/Night colours, Funnel type, radius scale, and the six motion keyframes all present");
