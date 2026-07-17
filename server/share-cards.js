// Share-card OG images (PRD-COMMUNITY S1, D-C3) — one SVG template per card
// type on the periwinkle system with oversized numerals, rasterised to a
// 1200×630 PNG by @resvg/resvg-wasm (small pinned pure-wasm dependency — no
// native toolchain, NEVER a headless browser). Fonts are the two committed
// static Funnel instances in server/assets/fonts (OFL — licenses alongside).
//
// Templates are pure string builders (exported for tests); every dynamic slot
// is XML-escaped and every payload was validated by its codec BEFORE reaching
// here — the server never renders arbitrary strings. Honesty rules ride the
// pixels too: readiness binds to the PREP TRACK (never "ready for <exam>"),
// vendor-naming cards carry the independence line, and nothing here may ever
// render the word "verified" (PRD-CREDENTIALS §2).
import { readFileSync } from "fs";
import { createRequire } from "module";

export const CARD_W = 1200;
export const CARD_H = 630;

export const INDEPENDENCE_LINE =
  "Independent, free training — not affiliated with or endorsed by any certification body.";

const INK = "#273C59";
const MUTED = "rgba(39,60,89,0.62)";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ── layout helpers (no text measurement in wasm — estimate and fit) ──────
const LEFT = 72, RIGHT = 1128, WIDTH = RIGHT - LEFT;

/** Font size that fits `text` in `maxW`, from `base` down to `min`. */
function fitSize(text, base, maxW = WIDTH, factor = 0.56, min = 26) {
  const w = text.length * factor * base;
  if (w <= maxW) return base;
  return Math.max(min, Math.floor(maxW / (text.length * factor)));
}

/** Greedy two-line word wrap by estimated width; overflow shrinks instead. */
function twoLines(text, size, factor = 0.56, maxW = WIDTH) {
  const perLine = Math.floor(maxW / (factor * size));
  if (text.length <= perLine) return [text];
  const words = text.split(" ");
  let first = "";
  for (const w of words) {
    const next = first ? `${first} ${w}` : w;
    if (next.length > perLine) break;
    first = next;
  }
  if (!first) return [text]; // one unbreakable word — fitSize handles it
  const rest = text.slice(first.length).trim();
  return rest ? [first, rest] : [first];
}

const display = (x, y, size, content, extra = "") =>
  `<text x="${x}" y="${y}" font-family="Funnel Display" font-weight="700" font-size="${size}" fill="${INK}"${extra}>${content}</text>`;
const sans = (x, y, size, content, { fill = MUTED, extra = "" } = {}) =>
  `<text x="${x}" y="${y}" font-family="Funnel Sans" font-weight="500" font-size="${size}" fill="${fill}"${extra}>${content}</text>`;

// "✓ Signed by the Academy" pill, top-right. The check is a path, not a
// glyph, so it can never fall out of the font subset. Only server-attested
// payloads carry the sig that turns this on — and it says "Signed", nothing
// stronger, matching the /cert chip posture exactly.
function signedChip() {
  const w = 285, x = RIGHT - w;
  return `<rect x="${x}" y="48" width="${w}" height="44" rx="22" fill="rgba(39,60,89,0.10)" stroke="rgba(39,60,89,0.22)"/>
  <path d="M ${x + 24} 70 l 6 7 l 12 -14" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ${sans(x + 54, 77, 21, "Signed by the Academy", { fill: INK })}`;
}

function frame(inner, { signed = false } = {}) {
  return `<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="mist" x1="0" y1="0" x2="1" y2="0.92">
<stop offset="0" stop-color="#D3DEF0"/><stop offset="0.46" stop-color="#BECFEA"/><stop offset="1" stop-color="#A9BFDD"/>
</linearGradient></defs>
<rect width="${CARD_W}" height="${CARD_H}" fill="url(#mist)"/>
<circle cx="1010" cy="580" r="330" fill="rgba(255,255,255,0.16)"/>
<circle cx="1010" cy="580" r="330" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="1.5"/>
<circle cx="86" cy="70" r="13" fill="none" stroke="${INK}" stroke-width="2.4"/>
<circle cx="86" cy="70" r="6.2" fill="${INK}"/>
${sans(112, 78, 23, "AUTOMATOS ACADEMY", { fill: INK, extra: ' letter-spacing="3.5"' })}
${signed ? signedChip() : ""}
${inner}
</svg>`;
}

const footer = (leftText) =>
  `${sans(LEFT, 582, 23, esc(leftText))}
${sans(RIGHT, 582, 23, "academy.automatos.app", { extra: ' text-anchor="end"' })}`;

const byline = (name, date) => (name ? `${name} · ${date}` : date);

// ── (a) streak milestone — "30-day study streak · Automatos Academy" ────
export function streakCardSvg({ n, date, name = "", signed = false }) {
  const num = String(n);
  const size = fitSize(num, 290, 700, 0.62, 80);
  return frame(`${display(66, 398, size, esc(num))}
${display(LEFT, 484, 58, "day study streak")}
${sans(LEFT, 530, 26, "Counted from daily study activity — free, independent AI training.")}
${footer(byline(name, date))}`, { signed });
}

// ── (b) per-track readiness — "68% readiness · GH-500 prep track" ───────
// The number is the ACADEMY readiness score and the card says so; it binds
// to the prep track, never to the exam (PRD-CREDENTIALS §2 honesty rules).
export function readinessCardSvg({ n, code, trackName, isExam, date, name = "", signed = false }) {
  const line = isExam ? `readiness · ${code} prep track` : `complete · ${trackName}`;
  const caption = isExam
    ? "The Academy's readiness score for this prep track — not a pass prediction."
    : "Lesson-by-lesson completion of an Academy skills track.";
  return frame(`${display(66, 380, 240, esc(`${n}%`))}
${display(LEFT, 470, fitSize(line, 54), esc(line))}
${sans(LEFT, 516, 26, esc(caption))}
${sans(LEFT, 548, 21, esc(INDEPENDENCE_LINE))}
${footer(byline(name, date))}`, { signed });
}

// ── (c) claimed certificate — name + track + date (the /cert model) ─────
export function certCardSvg({ name, trackName, date, certId, signed = false }) {
  const nameSize = fitSize(name, 108, WIDTH, 0.54, 44);
  const completed = `completed the ${trackName} track`;
  const lineSize = fitSize(completed, 46, WIDTH * 2, 0.52, 34); // 2 lines' worth before shrinking
  const lines = twoLines(completed, lineSize, 0.52);
  const lineSvg = lines
    .map((l, i) => display(LEFT, 420 + i * (lineSize + 12), lineSize, esc(l)))
    .join("\n");
  return frame(`${sans(LEFT, 218, 25, "THIS CERTIFIES THAT", { extra: ' letter-spacing="3"' })}
${display(LEFT, 330, nameSize, esc(name))}
${lineSvg}
${sans(LEFT, 548, 21, esc(INDEPENDENCE_LINE))}
${footer(`Ref ${certId} · ${date}`)}`, { signed });
}

// ── rasteriser — lazy, optional, never load-bearing for the page render ──
// If the wasm module or fonts are missing, cardsAvailable() stays false and
// the routes fall back to the static /og-academy.png (the v1 precedent) —
// share pages keep working, unfurls just lose the dynamic image.
let renderer = null;

export async function initCardRenderer() {
  if (renderer) return true;
  try {
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
    const { initWasm, Resvg } = await import("@resvg/resvg-wasm");
    try {
      await initWasm(readFileSync(wasmPath));
    } catch (e) {
      // initWasm throws if called twice (tests + boot) — that state is fine.
      if (!/already/i.test(String(e && e.message))) throw e;
    }
    const fontsDir = new URL("./assets/fonts/", import.meta.url);
    const fonts = [
      new Uint8Array(readFileSync(new URL("FunnelDisplay-Bold.ttf", fontsDir))),
      new Uint8Array(readFileSync(new URL("FunnelSans-Medium.ttf", fontsDir))),
    ];
    renderer = { Resvg, fonts };
    return true;
  } catch (e) {
    console.warn("[share] card renderer unavailable — falling back to the static OG image:", e.message);
    return false;
  }
}

export const cardsAvailable = () => !!renderer;

/** SVG string → PNG bytes (Uint8Array). Callers must check cardsAvailable(). */
export function renderCardPng(svg) {
  if (!renderer) throw new Error("card renderer not initialized");
  const resvg = new renderer.Resvg(svg, {
    // CustomFontsOptions: only the two committed faces exist in the wasm
    // fontdb, so family resolution is deterministic (no system fonts).
    font: { fontBuffers: renderer.fonts, defaultFontFamily: "Funnel Sans" },
  });
  return resvg.render().asPng();
}
