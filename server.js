/**
 * Automatos Academy — learning platform server.
 *
 * Mirrors the automatos-landing server shape so the Railway container is a
 * drop-in sibling. The app itself is a no-build vanilla-JS SPA served from
 * /public; this server only does three things:
 *   - serve static assets with sane cache headers,
 *   - SPA fallback (any non-asset GET → index.html) so refreshes/deep links work,
 *   - host the optional APIs under /api/*: catalog (Content API), badge
 *     signing, and — env-gated, default OFF — the Spine (accounts + sync).
 *
 * No backend is required signed-out: progress is local-first (localStorage)
 * and every surface works without an account. Optional Clerk sign-in (PRD-U1)
 * plus the Spine add cross-device sync — see docs/SPINE-ENABLE.md.
 */
import express from "express";
import compression from "compression";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createHmac, timingSafeEqual } from "crypto";
import { decodeCert, linkedInAddUrl } from "./public/js/engine/certificate.js";
import { buildContentIndex, createCatalogRouter } from "./server/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "public");
const PORT = process.env.PORT || 4321;

// ── Server-signed badges (PRD-CREDENTIALS §4, stateless variant) ──────
// The signature attests only that the Academy issued the certificate LINK —
// it says NOTHING about exam results. Copy is always "Signed by the Academy",
// never "verified". Stateless: nothing is stored; the HMAC is recomputable
// from the payload alone, so this works on ephemeral (Railway) instances.
const DEV_SIGNING_SECRET = "automatos-academy-dev-signing-secret-not-for-production";
const BADGE_SIGNING_SECRET = process.env.BADGE_SIGNING_SECRET || DEV_SIGNING_SECRET;
if (BADGE_SIGNING_SECRET === DEV_SIGNING_SECRET) {
  console.warn("[badge] BADGE_SIGNING_SECRET not set — signing badges in DEV mode with a public default secret. Set BADGE_SIGNING_SECRET in production.");
}
// HMAC-SHA256(payload) as lowercase hex — chars are [0-9a-f] only, so a sig
// never collides with base64url ([A-Za-z0-9-_]), the "." checksum separator,
// or the "~" payload~sig separator used in cert URLs.
const signPayload = (payload) => createHmac("sha256", BADGE_SIGNING_SECRET).update(payload).digest("hex");
const sigMatches = (payload, sig) => {
  if (typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const expected = Buffer.from(signPayload(payload), "utf8");
  const got = Buffer.from(sig, "utf8");
  return expected.length === got.length && timingSafeEqual(expected, got);
};

// Light in-memory rate limit for the sign endpoint (per IP) — deters abuse
// without any store. Ephemeral by design; resets on restart.
const SIGN_RATE_MAX = 30, SIGN_RATE_WINDOW_MS = 60_000;
const signHits = new Map();
function signRateLimited(ip) {
  const now = Date.now();
  const rec = signHits.get(ip);
  if (!rec || now - rec.start >= SIGN_RATE_WINDOW_MS) {
    signHits.set(ip, { start: now, count: 1 });
    if (signHits.size > 5000) for (const [k, v] of signHits) if (now - v.start >= SIGN_RATE_WINDOW_MS) signHits.delete(k);
    return false;
  }
  rec.count += 1;
  return rec.count > SIGN_RATE_MAX;
}

// ── Content index (PRD-U3) — the single runtime source for all content ─
// CONTENT_SOURCE=files (default/absent): read public/content at boot, exactly
// as always — the no-DB static deploy keeps working with zero env.
// CONTENT_SOURCE=db: load the published index from Postgres and poll the
// current pointer every 60 s (D-U7), swapping the index atomically on a new
// publish — content ships without a redeploy. Serving is identical either
// way: same index shape, same router, zero per-request I/O.
// Half-configured deploys fail loudly, same posture as the Spine below.
const CONTENT_SOURCE = process.env.CONTENT_SOURCE || "files";
if (CONTENT_SOURCE !== "files" && CONTENT_SOURCE !== "db") {
  console.error(`[catalog] CONTENT_SOURCE must be 'files' or 'db' (got '${CONTENT_SOURCE}') — refusing to boot.`);
  process.exit(1);
}
if (CONTENT_SOURCE === "db" && !process.env.DATABASE_URL) {
  console.error("[catalog] CONTENT_SOURCE=db but DATABASE_URL is missing — refusing to boot.");
  process.exit(1);
}

let contentIndex; // swapped by the db-mode refresh; read via getContentIndex()
const getContentIndex = () => contentIndex;
if (CONTENT_SOURCE === "db") {
  // Boot fails loudly if nothing is published or an integrity tripwire fires;
  // after a good boot, refresh failures keep serving the last good index.
  const { createContentPool, buildContentIndexFromDb, startContentRefresh } = await import("./server/catalog-db.js");
  const contentPool = createContentPool(process.env.DATABASE_URL);
  contentIndex = await buildContentIndexFromDb(contentPool);
  startContentRefresh(contentPool, {
    getCurrent: getContentIndex,
    swap: (next) => {
      contentIndex = next;
      console.log(`[catalog] content refreshed to ${next.contentVersion}`);
    },
  });
} else {
  contentIndex = buildContentIndex(
    resolve(PUBLIC, "content"),
    process.env.CONTENT_JOURNAL_PATH || resolve(__dirname, "data", "content-journal.json"),
  );
}

// SEO landing shells + sitemap render FROM THE INDEX (PRD-U3 S4 — the index
// exists first; shells never re-read disk). Failure is non-fatal — the SPA
// serves fine without shells.
try {
  const { generateShells } = await import("./scripts/generate-shells.mjs");
  generateShells(getContentIndex());
} catch (e) { console.warn("[shells] generation skipped:", e.message); }

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

// ── Hydrate the sign-in (auth) config from env at startup ─────────────
// Mirrors hydrateChatConfig: boot writes a gitignored public/auth-config.js
// consumed before the app module loads. CLERK_PUBLISHABLE_KEY is the client
// half of the Clerk pair (safe to ship in JS — it only identifies the
// instance; the secret key never leaves the server). Absent env →
// window.ACADEMY_AUTH = null and the SPA renders exactly as before PRD-U1:
// no sign-in affordance, no Clerk script, no network.
function hydrateAuthConfig() {
  const key = process.env.CLERK_PUBLISHABLE_KEY || "";
  if (key && !/^pk_(test|live)_/.test(key)) {
    console.warn("[auth] CLERK_PUBLISHABLE_KEY doesn't look like a Clerk publishable key (pk_test_/pk_live_) — shipping it anyway; the client will degrade to signed-out if it's wrong.");
  }
  if (key && process.env.SPINE_ENABLED !== "true") {
    console.warn("[auth] CLERK_PUBLISHABLE_KEY is set but SPINE_ENABLED is not — learners can sign in, but there is no sync API mounted. See docs/SPINE-ENABLE.md.");
  }
  const body = key
    ? `window.ACADEMY_AUTH = { publishableKey: ${JSON.stringify(key)} };\n`
    : "window.ACADEMY_AUTH = null;\n";
  writeFileSync(
    resolve(PUBLIC, "auth-config.js"),
    "// Generated at boot by server.js (hydrateAuthConfig) — gitignored, do not edit.\n" +
    "// null → this deploy runs signed-out only (the Clerk script is never loaded).\n" +
    body,
    "utf8",
  );
}
hydrateAuthConfig();

const app = express();
app.use(compression());
// 1mb body cap: sync batches (PRD-MT-02, up to 500 events) outgrow the 100kb
// express default; every consumer of req.body validates its input regardless.
app.use(express.json({ limit: "1mb" }));

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

// ── Badge signing (PRD-CREDENTIALS §4) ─────────────────────────────────
// POST /api/badge/sign {payload} → {sig}. We re-decode the payload with the
// SAME codec the client used (decodeCert) before signing, so we never sign
// arbitrary strings — only well-formed Academy certificates.
app.post("/api/badge/sign", (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  if (signRateLimited(ip)) return res.status(429).json({ error: "rate_limited" });
  const payload = req.body && req.body.payload;
  if (typeof payload !== "string" || !payload || !decodeCert(payload)) {
    return res.status(400).json({ error: "invalid_payload" });
  }
  res.json({ sig: signPayload(payload) });
});

// GET /api/badge/verify?payload=&sig= → {valid}. Timing-safe compare. Never
// leaks why a sig failed; the client renders the "Signed by the Academy" chip
// only on valid:true and nothing at all on false.
app.get("/api/badge/verify", (req, res) => {
  const payload = typeof req.query.payload === "string" ? req.query.payload : "";
  const sig = typeof req.query.sig === "string" ? req.query.sig : "";
  const valid = !!payload && !!decodeCert(payload) && sigMatches(payload, sig);
  res.json({ valid });
});

// ── Content API v1 (PRD-MT-01) ─────────────────────────────────────────
// Versioned catalog for the mobile app and the web SPA, serving the index
// built above (files or db — one router, one contract). The getter keeps the
// router on the freshest index when db mode's 60 s refresh swaps it.
app.use("/api/catalog", createCatalogRouter(getContentIndex));
console.log(`[catalog] serving contentVersion ${contentIndex.contentVersion} (${contentIndex.tracks.size} tracks, source=${CONTENT_SOURCE})`);

// ── Spine — per-user state: Postgres + Clerk + sync + GDPR (PRD-MT-02) ─
// Default OFF: without SPINE_ENABLED=true the service boots exactly as
// today — pure static/catalog, no DB, no auth (academy deploy safety).
// Enabled without its config = loud boot failure, never a half-alive API.
if (process.env.SPINE_ENABLED === "true") {
  if (!process.env.DATABASE_URL || !process.env.CLERK_SECRET_KEY) {
    console.error("[spine] SPINE_ENABLED=true but DATABASE_URL and/or CLERK_SECRET_KEY is missing — refusing to boot.");
    process.exit(1);
  }
  const { mountSpine } = await import("./server/spine/index.js");
  mountSpine(app, { contentIndex });
  console.log("[spine] user-state API mounted (/api/me, /api/sync)");
}

// ── API namespace fallback ─────────────────────────────────────────────
// Anything not handled above (catalog/notify/badge always; /api/me + /api/sync
// once the Spine is enabled) returns 501 so client code can feature-detect
// cleanly. Signed-out learners never need /api — progress is local-first.
app.use("/api", (_req, res) => res.status(501).json({ error: "not_implemented", note: "No such API on this deploy. The Academy works signed-out (local-first); accounts + progress sync mount under /api/me and /api/sync when the Spine is enabled — see docs/SPINE-ENABLE.md." }));

// ── Certificate pages (PRD-CREDENTIALS v1) ─────────────────────────────
// Real path (not hash) so shares unfurl: og tags + a no-JS render of the
// certificate. The payload is self-contained; nothing is stored server-side.
// v1 checksum ≠ verification — copy must never claim "verified".
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Track/vendor names come from the content index (PRD-U3 S4 — no disk read,
// no separate cache; db mode's refresh keeps names current automatically).
function trackMeta(vendorId, trackId) {
  try {
    const manifest = getContentIndex().manifest.data;
    const vend = (manifest.vendors || []).find((v) => v.id === vendorId);
    const tr = vend && (vend.tracks || []).find((t) => t.trackId === trackId);
    return { vendorName: vend ? vend.name : vendorId, trackName: tr ? tr.name : trackId };
  } catch (_) { return { vendorName: vendorId, trackName: trackId }; }
}

app.get("/cert/:payload", (req, res) => {
  // A "~sig" suffix is the v2 server signature (progressive enhancement).
  // Strip it before decoding; v1 links WITHOUT a sig keep working unchanged.
  const raw = req.params.payload;
  const tilde = raw.indexOf("~");
  const payload = tilde === -1 ? raw : raw.slice(0, tilde);
  const sig = tilde === -1 ? "" : raw.slice(tilde + 1);
  const signed = !!sig && sigMatches(payload, sig);
  const cert = decodeCert(payload);
  if (!cert) { res.status(404); return res.sendFile(resolve(PUBLIC, "index.html")); }
  const { vendorName, trackName } = trackMeta(cert.vendorId, cert.trackId);
  const base = `${req.protocol}://${req.get("host")}`;
  const certUrl = `${base}/cert/${raw}`;
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
<meta property="og:url" content="${esc(certUrl)}"><meta property="og:image" content="${esc(base)}/og-academy.png?v=2">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/academy.css">
</head><body data-mood="mist" style="display:block">
<main style="max-width:820px;margin:0 auto;padding:64px 22px">
  <div class="cert-card">
    <div style="display:flex;justify-content:space-between"><span class="mono-label">Automatos Academy</span><span class="mono-label">${esc(cert.date)}</span></div>
    <p class="mono-label" style="margin-top:34px">This certifies that</p>
    <h1 class="serif-i" style="font-size:clamp(34px,6vw,58px);margin:8px 0 0">${esc(cert.name)}</h1>
    <p style="margin-top:18px;font-size:19px">completed the <b>${esc(trackName)}</b> track (${esc(vendorName)} lane).</p>
    <div style="display:flex;justify-content:space-between;margin-top:36px;padding-top:16px;border-top:1px dashed var(--rule)">
      <span class="mono-label">${esc(vendorName)} · ${esc(trackName)}</span><span class="mono-label">Ref ${esc(cert.certId)}</span>
    </div>
    ${signed ? '<p class="mono-label" style="margin-top:12px">✓ Signed by the Academy</p>' : ""}
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
