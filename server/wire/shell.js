// Per-request SEO surfaces (PRD-WIRE §4.6, S3): the real-path post shell at
// /wire/:slug/ and the wire sitemap at /wire/sitemap.xml, both served FROM
// THE DB on every request — the /cert/:payload precedent in server.js. The
// boot-time generate-shells.mjs cannot see posts published after boot (or
// unsee posts killed after boot), so the runtime owns these two paths; the
// generator emits only the static /wire/ index shell.
//
// The shell is the no-JS truth of a post: og/article tags, NewsArticle or
// BlogPosting JSON-LD with `citation` built from sources[] (the verification
// travels with the SEO, not just the claims), canonical on the trailing-slash
// real path, the full body, the Sources and Corrections boxes, and the
// transparency label (S5: the label's fourth surface). Everything emitted is
// escaped — wire content arrives over the network and is never trusted
// (PRD-WIRE §7); JSON-LD additionally strips `<` so a title can never break
// out of its <script> element.
//
// buildPostShellHtml / buildWireSitemapXml are pure (row in, markup out) so
// tests cover shape and escaping without a server; handlers own query +
// headers, mirroring rss.js.
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { md } from "../../public/js/markdown.js";
import { FACTUAL_TYPES } from "./validate.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

const iso = (v) => new Date(v).toISOString();
const fmtDay = (v) => {
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

// Human labels for the type kicker — mirrors TYPE_LABELS in views/wire.js
// (the SPA copy is the canonical wording; keep the two in step).
const TYPE_LABELS = {
  "model-news": "Model news", "trend": "Trend", "new-course": "New course",
  "question-refresh": "Question refresh", "changelog": "Changelog",
};

// Same visibility rule as every public surface: published only, so an
// unpublished post 404s its shell on the next request (US-W3).
export const SHELL_SQL = `
  SELECT slug, type, tags, title, summary, body_md, sources, byline, corrections, published_at, updated_at
  FROM wire_posts WHERE slug = $1 AND status = 'published'
`;

export const SITEMAP_SQL = `
  SELECT slug, updated_at FROM wire_posts
  WHERE status = 'published' ORDER BY published_at DESC
`;

/** JSON-LD for one post. Factual types are NewsArticle (which carries the
 *  `correction` property — corrections in the open, even to machines);
 *  first-party types are BlogPosting. `citation` is the §4.3 sources[]. */
function jsonLd(post, pageUrl, baseUrl) {
  const factual = FACTUAL_TYPES.includes(post.type);
  const agents = (post.byline && post.byline.agents) || [];
  const ld = {
    "@context": "https://schema.org",
    "@type": factual ? "NewsArticle" : "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: iso(post.published_at),
    dateModified: iso(post.updated_at),
    author: { "@type": "Organization", name: agents.join(", ") || "Automatos agents" },
    publisher: { "@type": "Organization", name: "Automatos Academy", url: baseUrl },
    isAccessibleForFree: true,
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    citation: (post.sources || []).map((s) => ({ "@type": "WebPage", url: s.url, name: s.title })),
  };
  if (factual && (post.corrections || []).length) {
    ld.correction = post.corrections.map((c) => `${String(c.at).slice(0, 10)}: ${c.note}`);
  }
  // `<` escaped inside string values so untrusted text can never terminate
  // the <script> element (JSON.stringify leaves "</script>" intact).
  return JSON.stringify(ld).replace(/</g, "\\u003c");
}

/**
 * @param {{post: object, baseUrl: string, label: string}} opts — post is a
 *        wire_posts row (snake_case timestamps, jsonb parsed); label is the
 *        transparency label (D-W5), rendered verbatim under the byline.
 */
export function buildPostShellHtml({ post, baseUrl, label }) {
  const pageUrl = `${baseUrl}/wire/${post.slug}/`;
  const appUrl = `/#/wire/${post.slug}`;
  const title = `${post.title} · The Wire — Automatos Academy`;
  const agents = ((post.byline && post.byline.agents) || []).join(", ") || "Automatos agents";
  const corrections = post.corrections || [];
  const corrected = corrections.length ? ` · corrected ${esc(String(corrections[corrections.length - 1].at).slice(0, 10))}` : "";

  const sourcesHtml = (post.sources || []).map((s) =>
    `<li><a href="${esc(s.url)}">${esc(s.title)}</a> — retrieved ${esc(String(s.retrievedAt).slice(0, 10))}<br>${esc(s.claims)}</li>`,
  ).join("\n      ");
  const correctionsHtml = corrections.length
    ? `\n  <div class="callout warn wire-corrections"><div class="ct">Corrections</div>
    <ul>${corrections.map((c) => `<li>${esc(String(c.at).slice(0, 10))} — ${esc(c.note)}</li>`).join("")}</ul>
  </div>`
    : "";
  const tagsMeta = (post.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}">`).join("");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(post.summary)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Automatos Academy">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(post.summary)}">
<meta property="og:url" content="${esc(pageUrl)}"><meta property="og:image" content="${esc(baseUrl)}/og-academy.png?v=2">
<meta property="article:published_time" content="${iso(post.published_at)}">
<meta property="article:modified_time" content="${iso(post.updated_at)}">
${tagsMeta}
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/atom+xml" title="The Wire — Automatos Academy" href="/wire/rss.xml">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/academy.css">
<script type="application/ld+json">${jsonLd(post, pageUrl, baseUrl)}</script>
</head><body data-mood="mist" style="display:block">
<main style="max-width:820px;margin:0 auto;padding:64px 22px">
  <p class="mono-label">The Wire · ${esc(TYPE_LABELS[post.type] || post.type)} · Automatos Academy</p>
  <h1 style="font-size:clamp(30px,4.4vw,50px);margin:14px 0 0">${esc(post.title)}</h1>
  <p class="lede muted" style="max-width:66ch;margin-top:14px">${esc(post.summary)}</p>
  <p class="mono-label" style="margin-top:18px">By ${esc(agents)} · ${esc(fmtDay(post.published_at))}${corrected}</p>
  <p class="wire-label">${esc(label)}</p>
  <div class="prose wire-body" style="margin-top:22px">${md(post.body_md)}</div>
  <div class="callout wire-sources" style="margin-top:30px"><div class="ct">Sources — what each one supports</div>
    <ul>
      ${sourcesHtml}
    </ul>
  </div>${correctionsHtml}
  <p style="margin-top:26px"><a class="ac-btn ac-btn-solid" href="${esc(appUrl)}">Open on the Wire →</a>
  <a class="ac-btn" href="/#/wire">All Wire posts</a></p>
  <p class="mono-label" style="margin-top:18px"><a href="/wire/rss.xml">Subscribe — RSS</a></p>
</main></body></html>`;
}

/** Wire section sitemap: the /wire/ index plus every published post shell,
 *  <lastmod> tracking corrections (updated_at) — same honesty as the feed. */
export function buildWireSitemapXml({ posts, baseUrl }) {
  const newest = posts.length
    ? iso(Math.max(...posts.map((p) => new Date(p.updated_at).getTime())))
    : iso(Date.now());
  const urls = [
    `  <url><loc>${esc(baseUrl)}/wire/</loc><lastmod>${newest}</lastmod></url>`,
    ...posts.map((p) => `  <url><loc>${esc(baseUrl)}/wire/${esc(p.slug)}/</loc><lastmod>${iso(p.updated_at)}</lastmod></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

const DEFAULT_INDEX = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "index.html");

/** GET /wire/:slug — 200 shell for a published post; 404 + the SPA shell for
 *  anything else (the /cert/:payload posture: crawlers see the status, a
 *  human clicking a dead link still lands in the app). */
export function createShellHandler({ pool, label, indexHtml = DEFAULT_INDEX }) {
  return async function wireShellHandler(req, res) {
    try {
      const { rows } = await pool.query(SHELL_SQL, [req.params.slug]);
      if (rows.length === 0) {
        res.status(404);
        if (existsSync(indexHtml)) return res.sendFile(indexHtml);
        return res.json({ error: "not_found" });
      }
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      res.set("Cache-Control", "public, max-age=60");
      res.send(buildPostShellHtml({ post: rows[0], baseUrl, label }));
    } catch (e) {
      console.error("[wire] shell failed:", e);
      res.status(500).json({ error: "internal_error" });
    }
  };
}

/** GET /wire/sitemap.xml — per request, so publishes appear and unpublishes
 *  vanish without a redeploy. robots.txt points here (generate-shells.mjs). */
export function createSitemapHandler({ pool }) {
  return async function wireSitemapHandler(req, res) {
    try {
      const { rows } = await pool.query(SITEMAP_SQL);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=60");
      res.send(buildWireSitemapXml({ posts: rows, baseUrl }));
    } catch (e) {
      console.error("[wire] sitemap failed:", e);
      res.status(500).json({ error: "internal_error" });
    }
  };
}
