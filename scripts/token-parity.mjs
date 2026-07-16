#!/usr/bin/env node
// Token parity — public/academy.css is the canonical "Academy Periwinkle" source
// of truth (FigmaDesigns/academy/handover/TOKENS.md). This fails CI if any
// canonical Mist/Night colour, the Funnel families, the radius scale, or the
// six widget-motion keyframes drift. The app repo (automatos-academy-app) runs
// the mirror check against src/theme/palette.ts (palette.test.ts), so the two
// token sources can never silently diverge. Zero-dependency; wired into `npm test`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(HERE, "..", "public", "academy.css"), "utf8");
const html = readFileSync(join(HERE, "..", "public", "index.html"), "utf8");

// Full TOKENS.md colour tables — every key, both modes.
const MIST = {
  "--bg": "#D3DEF0", "--bg-2": "#BECFEA", "--bg-3": "#A9BFDD",
  "--fg": "#273C59", "--fg-2": "rgba(39,60,89,0.72)",
  "--muted": "rgba(39,60,89,0.60)", "--rule": "rgba(39,60,89,0.14)",
  "--rule-strong": "rgba(39,60,89,0.30)",
  "--accent": "#273C59", "--accent-soft": "rgba(39,60,89,0.12)",
  "--muted-fill": "#BBC9E5",
};
const NIGHT = {
  "--bg": "#141D30", "--bg-2": "#1C2740", "--bg-3": "#24314C",
  "--fg": "#E6EDF8", "--fg-2": "rgba(230,237,248,0.72)",
  "--muted": "rgba(230,237,248,0.55)", "--rule": "rgba(230,237,248,0.14)",
  "--rule-strong": "rgba(230,237,248,0.30)",
  "--accent": "#A9BFDD", "--accent-soft": "rgba(169,191,221,0.16)",
  "--muted-fill": "#2E3A54",
};
const RADIUS = {
  "--radius-sm": "12px", "--radius": "16px", "--radius-lg": "24px",
  "--radius-2xl": "28px", "--radius-pill": "999px",
};

const bad = [];

// Whitespace/case-insensitive declaration check, so `--fg-2: rgba(39, 60, 89, 0.72);`
// matches the canonical `rgba(39,60,89,0.72)` regardless of formatting.
const squish = (s) => s.replace(/\s+/g, "").toLowerCase();
const hasDecl = (section, name, value) => squish(section).includes(squish(`${name}:${value}`));

// Slice a `selector { … }` block precisely. Anchor on the RULE at line start —
// the file header comment also mentions [data-mood="night"], and matching that
// would cut the sections in the wrong place.
function block(selectorRe, label) {
  const m = css.match(selectorRe);
  if (!m) { bad.push(`${label} block missing`); return ""; }
  const open = css.indexOf("{", m.index);
  const close = css.indexOf("}", open);
  return close > open ? css.slice(open, close) : "";
}

const root = block(/^:root\s*\{/m, ":root");
const night = block(/^\[data-mood="night"\]\s*\{/m, '[data-mood="night"]');

for (const [k, v] of Object.entries(MIST)) if (!hasDecl(root, k, v)) bad.push(`Mist ${k}: ${v} missing from :root`);
for (const [k, v] of Object.entries(NIGHT)) if (!hasDecl(night, k, v)) bad.push(`Night ${k}: ${v} missing from [data-mood="night"]`);
for (const [k, v] of Object.entries(RADIUS)) if (!hasDecl(root, k, v)) bad.push(`radius ${k}: ${v} missing from :root`);

// Retired token keys must stay gone (the drift this check exists to catch).
for (const retired of ["--muted-2", "--rule-c"]) {
  if (css.includes(`${retired}:`)) bad.push(`retired token key ${retired} is back in academy.css`);
}

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
console.log("✓ tokens in parity — full Mist/Night tables, Funnel type, radius scale, and the six motion keyframes all present");
