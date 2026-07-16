#!/usr/bin/env node
// SEO landing shells (PRD-GROWTH §2.1). The SPA is hash-routed — invisible to
// search — so every LIVE track gets a real, static, crawlable page at
// /tracks/<trackId>/ with Course JSON-LD, plus sitemap.xml + robots.txt.
// Generated from content at server boot (and runnable standalone: npm run
// shells). Output is derived — gitignored, never edited by hand.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const BASE = (process.env.ACADEMY_BASE_URL || "https://academy.automatos.app").replace(/\/$/, "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const manifest = JSON.parse(readFileSync(join(PUBLIC, "content", "manifest.json"), "utf8"));
const live = manifest.vendors.flatMap((v) =>
  (v.tracks || []).filter((t) => t.status === "live").map((t) => ({ ...t, vendorId: v.id, vendorName: v.name }))
);

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

const urls = [`${BASE}/`];
for (const t of live) {
  let track;
  try { track = JSON.parse(readFileSync(join(PUBLIC, "content", t.vendorId, t.trackId, "track.json"), "utf8")); }
  catch (e) { console.warn(`[shells] ${t.trackId}: track.json unreadable — skipped (${e.message})`); continue; }
  // Domain names come from the domain files so the shell lists real curriculum.
  track.domainNames = (track.domainFiles || []).map((df) => {
    try { return JSON.parse(readFileSync(join(PUBLIC, "content", t.vendorId, t.trackId, df), "utf8")).name; }
    catch (_) { return null; }
  }).filter(Boolean);
  const dir = join(PUBLIC, "tracks", t.trackId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), shellHtml(t, track), "utf8");
  urls.push(`${BASE}/tracks/${t.trackId}/`);
  console.log(`[shells] /tracks/${t.trackId}/ ✓`);
}

writeFileSync(join(PUBLIC, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n") + `\n</urlset>\n`, "utf8");
writeFileSync(join(PUBLIC, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`, "utf8");
console.log(`[shells] sitemap.xml (${urls.length} urls) + robots.txt ✓`);
