#!/usr/bin/env node
// LA-9 · Lane 2 — verified payload → portrait PNG.
//
//   node scripts/render-infographic.mjs <payload.json|dir> [--out dist/infographics]
//
// A payload file is `{ domainId, index, title, points[], eyebrow?, source? }`.
// Output is named after the slot it binds to (`ig-<domain>-<n>.png`), so the
// existing bulk-bind path (`scripts/bulk-bind-media.mjs`, the deploy-media
// bind=true step) picks it up with no new vocabulary — LA-9 adds a renderer,
// not a second publishing plane.
//
// Puppeteer is NOT a dependency of this repo (it drags Chromium in and every
// CI install would pay for it). The workflow installs it with --no-save for
// the render job only; running this locally needs the same one-off install.
//
// Order of operations matters and is the PRD's rule, not an implementation
// detail: the payload is VERIFIED before any pixels exist. A card that cannot
// be drawn correctly is a rejected payload, never a clipped render.

import { readdir, readFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  INFOGRAPHIC_SIZE,
  infographicSlotId,
  toRenderParams,
  toRenderQuery,
} from "../server/media/infographic.js";

const RENDER_PAGE = path.resolve("render/infographic.html");

function parseArgs(argv) {
  const args = argv.slice(2);
  const outIdx = args.indexOf("--out");
  const out = outIdx >= 0 ? args[outIdx + 1] : "dist/infographics";
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

/** payload file → { slotId, query } or an error, with nothing rendered yet */
async function prepare(file) {
  let payload;
  try {
    payload = JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    return { file, error: `not JSON (${err.message})` };
  }
  const slotId = infographicSlotId(payload.domainId, payload.index);
  if (!slotId) return { file, error: `bad domainId/index (${payload.domainId}/${payload.index})` };
  const v = toRenderParams(payload);
  if (!v.ok) return { file, error: `${v.error}${v.note ? ` — ${v.note}` : ""}` };
  return { file, slotId, query: toRenderQuery(v.params) };
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

  // Verify every payload BEFORE launching a browser: a batch with one bad card
  // should fail in a second with a readable reason, not after N screenshots.
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
    await page.setViewport({ ...pageViewport(), deviceScaleFactor: 1 });
    for (const { slotId, query } of prepared) {
      const url = `${pathToFileURL(RENDER_PAGE).href}?${query}`;
      await page.goto(url, { waitUntil: "load" });
      // The page sets this after two rAFs. No timeout fallback: a render that
      // never signals is a real fault, and screenshotting a half-drawn card
      // would publish it.
      await page.waitForFunction("window.__renderReady === true");
      const file = path.join(out, `${slotId}.png`);
      await page.screenshot({ path: file, type: "png" });
      console.log(`  ✓ ${slotId} → ${file}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${prepared.length} infographic(s) rendered into ${out}`);
}

const pageViewport = () => ({ width: INFOGRAPHIC_SIZE.w, height: INFOGRAPHIC_SIZE.h });

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
