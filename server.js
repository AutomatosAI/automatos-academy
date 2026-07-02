/**
 * Automatos Academy — learning platform server.
 *
 * Mirrors the automatos-landing server shape so the Railway container is a
 * drop-in sibling. The app itself is a no-build vanilla-JS SPA served from
 * /public; this server only does three things:
 *   - serve static assets with sane cache headers,
 *   - SPA fallback (any non-asset GET → index.html) so refreshes/deep links work,
 *   - reserve /api/* for the future backend (accounts, progress sync, CMS).
 *
 * No backend is required for Phase 1 — progress is local-first (localStorage).
 */
import express from "express";
import compression from "compression";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { decodeCert, linkedInAddUrl } from "./public/js/engine/certificate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "public");
const PORT = process.env.PORT || 4321;

// SEO landing shells + sitemap are generated from content at boot (same
// pattern as chat-config hydration below). Failure is non-fatal — the SPA
// serves fine without shells.
try { await import("./scripts/generate-shells.mjs"); }
catch (e) { console.warn("[shells] generation skipped:", e.message); }

// ── Hydrate the tutor's chat config from env at startup ───────────────
// Mirrors the landing site's _config.js pattern. The tutor is a separate
// agent on the Automatos platform; set ACADEMY_CHAT_PUBLIC_KEY (and optionally
// ACADEMY_CHAT_AGENT_ID) from the Academy workspace. Missing vars → empty
// strings, and the tutor shows a graceful "coming online" state.
function hydrateChatConfig() {
  const tpl = resolve(PUBLIC, "chat-config.js.template");
  if (!existsSync(tpl)) return;
  // Defaults are the Academy workspace's PUBLIC key + tutor agent. An ak_pub_*
  // key is origin-allow-listed server-side, so it is safe to ship in client JS
  // (it only works from the Academy's own allowed_domains). Railway env vars
  // override these if set.
  const out = readFileSync(tpl, "utf8")
    .replace(/\$\{ACADEMY_CHAT_PUBLIC_KEY\}/g, process.env.ACADEMY_CHAT_PUBLIC_KEY || "ak_pub_267f4a7135d136ac8cfce0c193f3b52715d72346b3e0f5df8af55eec7508b9a3")
    .replace(/\$\{ACADEMY_CHAT_AGENT_ID\}/g, process.env.ACADEMY_CHAT_AGENT_ID || "bdfe4212-bd85-4875-8b9a-27c16c1b938c")
    .replace(/\$\{ACADEMY_ANALYTICS_ENDPOINT\}/g, process.env.ACADEMY_ANALYTICS_ENDPOINT || "");
  writeFileSync(resolve(PUBLIC, "chat-config.js"), out, "utf8");
}
hydrateChatConfig();

const app = express();
app.use(compression());
app.use(express.json());

// ── Health check (Railway / uptime) ───────────────────────────────────
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "automatos-academy" }));

// ── Notify-me capture (PRD-GROWTH §4.2) ────────────────────────────────
// Stateless by design: forwards {email, trackId} to NOTIFY_WEBHOOK_URL (any
// list tool / Zapier / an Automatos playbook trigger). Unconfigured → 503 and
// the client shows its fallback — we never silently drop a signup.
app.post("/api/notify", async (req, res) => {
  const { email, trackId } = req.body || {};
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof trackId !== "string") {
    return res.status(400).json({ error: "invalid_input" });
  }
  const hook = process.env.NOTIFY_WEBHOOK_URL;
  if (!hook) return res.status(503).json({ error: "not_configured" });
  try {
    const r = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, trackId, source: "academy-notify", at: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(`webhook ${r.status}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("[notify] forward failed:", e.message);
    res.status(502).json({ error: "forward_failed" });
  }
});

// ── API namespace reserved for the future backend ─────────────────────
// Returns 501 today so client code can feature-detect a backend cleanly.
app.use("/api", (_req, res) => res.status(501).json({ error: "not_implemented", note: "Phase 1 is local-first; no backend yet." }));

// ── Certificate pages (PRD-CREDENTIALS v1) ─────────────────────────────
// Real path (not hash) so shares unfurl: og tags + a no-JS render of the
// certificate. The payload is self-contained; nothing is stored server-side.
// v1 checksum ≠ verification — copy must never claim "verified".
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let manifestCache = null;
function trackMeta(vendorId, trackId) {
  try {
    if (!manifestCache) manifestCache = JSON.parse(readFileSync(resolve(PUBLIC, "content", "manifest.json"), "utf8"));
    const vend = (manifestCache.vendors || []).find((v) => v.id === vendorId);
    const tr = vend && (vend.tracks || []).find((t) => t.trackId === trackId);
    return { vendorName: vend ? vend.name : vendorId, trackName: tr ? tr.name : trackId };
  } catch (_) { return { vendorName: vendorId, trackName: trackId }; }
}

app.get("/cert/:payload", (req, res) => {
  const cert = decodeCert(req.params.payload);
  if (!cert) { res.status(404); return res.sendFile(resolve(PUBLIC, "index.html")); }
  const { vendorName, trackName } = trackMeta(cert.vendorId, cert.trackId);
  const base = `${req.protocol}://${req.get("host")}`;
  const certUrl = `${base}/cert/${req.params.payload}`;
  const title = `${cert.name} — ${trackName} · Automatos Academy`;
  const desc = `${cert.name} completed the Automatos Academy ${trackName} track (${cert.date}). Free, honest AI training — independent of any certification body.`;
  const li = linkedInAddUrl({ certName: `Automatos Academy — ${trackName}`, certUrl, certId: cert.certId, issued: cert.date });
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Automatos Academy">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(certUrl)}"><meta property="og:image" content="${esc(base)}/og-academy.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/academy.css">
</head><body data-mood="bone" style="display:block">
<main style="max-width:820px;margin:0 auto;padding:64px 22px">
  <div class="cert-card">
    <div style="display:flex;justify-content:space-between"><span class="mono-label">Automatos Academy</span><span class="mono-label">${esc(cert.date)}</span></div>
    <p class="mono-label" style="margin-top:34px">This certifies that</p>
    <h1 class="serif-i" style="font-size:clamp(34px,6vw,58px);margin:8px 0 0">${esc(cert.name)}</h1>
    <p style="margin-top:18px;font-size:19px">completed the <b>${esc(trackName)}</b> track (${esc(vendorName)} lane).</p>
    <div style="display:flex;justify-content:space-between;margin-top:36px;padding-top:16px;border-top:1px dashed var(--rule-c)">
      <span class="mono-label">${esc(vendorName)} · ${esc(trackName)}</span><span class="mono-label">Ref ${esc(cert.certId)}</span>
    </div>
  </div>
  <p style="margin-top:22px"><a class="ac-btn ac-btn-solid" href="${esc(li)}">Add to LinkedIn profile ↗</a>
  <a class="ac-btn" href="/#/t/${esc(cert.vendorId)}/${esc(cert.trackId)}">Start this track →</a></p>
  <p class="mono-label" style="margin-top:18px;max-width:70ch">Automatos Academy is independent, free training. Completion badges certify Academy work — never an external credential, which only its certification body can issue.</p>
</main></body></html>`);
});

// ── Static assets ─────────────────────────────────────────────────────
//   .html / manifest   → no-cache (revalidate every request)
//   _*, js, css        → short cache so we can iterate
//   content/*.json     → short cache (content ships often)
//   images, fonts      → 30d
app.use(express.static(PUBLIC, {
  index: "index.html",
  extensions: ["html"],
  maxAge: "30d",
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    } else if (/\.(js|css|json)$/.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
    }
  },
}));

// ── SPA fallback ───────────────────────────────────────────────────────
// Any GET that isn't a real asset (no file extension) renders the shell so
// hash-routed deep links and refreshes resolve.
app.get(/^\/(?!api\/)(?!.*\.[a-zA-Z0-9]+$).*/, (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(resolve(PUBLIC, "index.html"));
});

// ── 404 (asset misses) ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404);
  const fallback = resolve(PUBLIC, "index.html");
  if (existsSync(fallback)) res.sendFile(fallback);
  else res.send("Not found");
});

app.listen(PORT, () => {
  console.log(`Automatos Academy on http://localhost:${PORT}`);
});
