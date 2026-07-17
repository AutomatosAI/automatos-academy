#!/usr/bin/env node
// SEO landing shells (PRD-GROWTH §2.1). The SPA is hash-routed — invisible to
// search — so every LIVE track gets a real, static, crawlable page at
// /tracks/<trackId>/ with Course JSON-LD, plus sitemap.xml + robots.txt.
// Output is derived — gitignored, never edited by hand.
//
// PRD-U3 S4: shells render FROM THE CONTENT INDEX, never from disk — one code
// path whichever source (files or Postgres) built the index. server.js builds
// the index first and calls generateShells(idx); standalone `npm run shells`
// builds a file index below and emits the same bytes.
//
// PRD-WIRE S3: wire-enabled deploys (opts.wire, from WIRE_INGEST_KEY) also
// get the STATIC parts of the Wire's SEO surface — the /wire/ index shell and
// a robots.txt Sitemap line pointing at the DB-served /wire/sitemap.xml. Post
// shells are deliberately NOT generated here: this runs at boot and cannot
// see posts published (or killed) afterwards — they render per request from
// the DB (server/wire/shell.js). Wire off → the index shell is removed, so a
// dev tree flipping env never serves a stale door to a dead surface.
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { buildContentIndex } from "../server/catalog.js";
import { transparencyLabel } from "../server/wire/label.js";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const BASE = (process.env.ACADEMY_BASE_URL || "https://academy.automatos.app").replace(/\/$/, "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const DISCLAIMER = "Automatos Academy is independent, free training — not affiliated with or endorsed by any certification body. Exam names are trademarks of their respective owners.";

function shellHtml(t, track) {
  const isExam = !!(track.exam && track.exam.questionCount);
  const pageUrl = `${BASE}/tracks/${t.trackId}/`;
  const appUrl = `/#/t/${t.vendorId}/${t.trackId}`;
  const title = `${track.name} — free ${isExam ? "exam prep" : "training"} · Automatos Academy`;
  const desc = (track.summary || t.summary || "").slice(0, 300);
  const domains = (track.domainNames || []).length ? track.domainNames : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: track.name,
    description: desc,
    provider: { "@type": "EducationalOrganization", name: "Automatos Academy", url: BASE },
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: "PT20H" },
    url: pageUrl,
  };

  const examRow = isExam
    ? `<p class="mono-label">Real exam: ${track.exam.questionCount} questions · ${track.exam.durationMinutes} min · ${track.exam.passingScore}/${track.exam.scoreScale} to pass</p>`
    : `<p class="mono-label">Skills track — no exam, no gate: finish the work, ship the capstone</p>`;

  const verifiedRow = track.verification && track.verification.verifiedAt
    ? `<p class="mono-label">Facts verified ${esc(track.verification.verifiedAt)} against the official source</p>`
    : "";

  const domainList = (track.domainFiles || []).length && domains
    ? `<ul>${domains.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>`
    : "";

  const faq = isExam
    ? [
        ["Is this the real exam?", "No — it's free preparation. The credential is issued only by the certification body; we prep you to pass it with original, source-grounded questions (never dumps)."],
        ["What does it cost?", "Nothing. The whole academy is free — no account required, no trial, no upsell. Signed out, your progress stays on your device; optional sign-in syncs it across devices."],
        ["How do I know the content is current?", "Every exam fact is verified against the live official study guide and stamped with its verification date on the track page."],
      ]
    : [
        ["Is there an exam?", "No — this is a skills track. You finish when every module's hands-on work is done and the capstone ships."],
        ["What does it cost?", "Nothing. The whole academy is free — no account required, no trial, no upsell."],
        ["Do I need to be technical?", "No. Modules are plain English first; every term of art is explained before it's used."],
      ];

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Automatos Academy">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(pageUrl)}"><meta property="og:image" content="${BASE}/og-academy.png?v=2">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/academy.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head><body data-mood="mist" style="display:block">
<main style="max-width:820px;margin:0 auto;padding:64px 22px">
  <p class="mono-label">Automatos Academy · ${esc(t.vendorName)}</p>
  <h1 class="serif-i" style="font-size:clamp(34px,6vw,54px);margin:10px 0 0">${esc(track.name)}</h1>
  <p style="margin-top:16px;font-size:18px;max-width:66ch">${esc(desc)}</p>
  ${examRow}
  ${verifiedRow}
  <p style="margin:26px 0"><a class="ac-btn ac-btn-solid" href="${appUrl}">Start free — no account needed →</a></p>
  <h2 class="serif-i">What's inside</h2>
  <p>Lessons grounded in primary sources · hands-on labs · branching scenario drills${isExam ? " · full-length timed mock exams · an honest A+ readiness score" : " · a shipped capstone"} · videos and audio deep-dives · a source library where every claim links to the official doc.</p>
  ${domainList}
  <h2 class="serif-i">Questions</h2>
  ${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("\n  ")}
  <p style="margin-top:34px"><a href="/">← All tracks</a></p>
  <p class="mono-label" style="margin-top:26px;max-width:70ch">${esc(DISCLAIMER)}</p>
</main></body></html>`;
}

// The Wire's static index shell (PRD-WIRE S3) — the crawlable front door at
// /wire/; individual posts live at /wire/<slug>/ (per-request, DB-served).
// The transparency label is computed from the same env the runtime reads
// (D-W5: review mode claims the human review that is actually happening).
function wireIndexHtml() {
  const pageUrl = `${BASE}/wire/`;
  const label = transparencyLabel(process.env.WIRE_PUBLISH_POLICY === "auto" ? "auto" : "review");
  const title = "The Wire — agent-written, source-verified AI news · Automatos Academy";
  const desc = "Daily briefings researched and written by Automatos agents — model news, trends, new courses and question refreshes. Every claim linked to its source, every correction in the open.";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Automatos Academy">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(pageUrl)}"><meta property="og:image" content="${BASE}/og-academy.png?v=2">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/atom+xml" title="The Wire — Automatos Academy" href="/wire/rss.xml">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/academy.css">
</head><body data-mood="mist" style="display:block">
<main style="max-width:820px;margin:0 auto;padding:64px 22px">
  <p class="mono-label">Automatos Academy</p>
  <h1 class="serif-i" style="font-size:clamp(34px,6vw,54px);margin:10px 0 0">The Wire</h1>
  <p style="margin-top:16px;font-size:18px;max-width:66ch">${esc(desc)}</p>
  <p class="wire-label">${esc(label)}</p>
  <p style="margin:26px 0"><a class="ac-btn ac-btn-solid" href="/#/wire">Open the Wire →</a>
  <a class="ac-btn" href="/wire/rss.xml">Subscribe — RSS</a></p>
  <p style="margin-top:34px"><a href="/">← Automatos Academy</a></p>
</main></body></html>`;
}

/**
 * Emit /tracks/<trackId>/index.html for every LIVE track, plus sitemap.xml +
 * robots.txt, from an already-built content index. Reads the index only —
 * never disk, never mutating it (the index's track.data is what the Content
 * API serves verbatim; a stray property here would leak into responses).
 *
 * @param {{wire?: boolean}} opts — wire:true additionally emits the static
 *        Wire parts (index shell + robots sitemap line); wire:false/absent
 *        removes any previously generated wire shell.
 */
export function generateShells(idx, opts = {}) {
  const manifest = idx.manifest.data;
  const live = (manifest.vendors || []).flatMap((v) =>
    (v.tracks || []).filter((t) => t.status === "live").map((t) => ({ ...t, vendorId: v.id, vendorName: v.name }))
  );

  const urls = [`${BASE}/`];
  for (const t of live) {
    const entry = idx.tracks.get(`${t.vendorId}/${t.trackId}`);
    if (!entry) { console.warn(`[shells] ${t.trackId}: not in the content index — skipped`); continue; }
    // Domain names come from the indexed domain files (insertion order =
    // domainFiles order) so the shell lists real curriculum. Spread — never
    // mutate the shared index object.
    const track = {
      ...entry.track.data,
      domainNames: [...entry.domains.values()].map((d) => d.data.name).filter(Boolean),
    };
    const dir = join(PUBLIC, "tracks", t.trackId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), shellHtml(t, track), "utf8");
    urls.push(`${BASE}/tracks/${t.trackId}/`);
    console.log(`[shells] /tracks/${t.trackId}/ ✓`);
  }

  writeFileSync(join(PUBLIC, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n") + `\n</urlset>\n`, "utf8");

  // Wire statics (PRD-WIRE S3): the index shell + the second Sitemap line —
  // /wire/sitemap.xml is DB-served, so its urls are always current.
  const wireOn = !!opts.wire;
  if (wireOn) {
    mkdirSync(join(PUBLIC, "wire"), { recursive: true });
    writeFileSync(join(PUBLIC, "wire", "index.html"), wireIndexHtml(), "utf8");
    console.log("[shells] /wire/ index shell ✓");
  } else {
    rmSync(join(PUBLIC, "wire"), { recursive: true, force: true });
  }
  writeFileSync(join(PUBLIC, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n` +
    (wireOn ? `Sitemap: ${BASE}/wire/sitemap.xml\n` : ""), "utf8");
  console.log(`[shells] sitemap.xml (${urls.length} urls) + robots.txt ✓`);
}

// ── standalone: npm run shells — build a file index, emit the same bytes ─
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateShells(buildContentIndex(join(PUBLIC, "content")), { wire: !!process.env.WIRE_INGEST_KEY });
}
