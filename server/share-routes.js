// Share pages + per-card OG images (PRD-COMMUNITY S1) — the /cert pattern,
// generalised. Every route decodes-then-validates before rendering (the
// decodeCert rule); nothing is stored server-side; pages are honest landing
// pages for the next learner (CTA + independence footer on every one).
//
//   GET /s/:payload            — server-rendered share page (streak/readiness)
//   GET /s/:payload/card.png   — its OG card image (immutable per payload)
//   GET /cert/:payload/card.png— dynamic certificate card (PRD-CREDENTIALS §4 v2)
//   GET /api/share/config      — { sharing } — false hides client affordances
//                                 (deploys without a real BADGE_SIGNING_SECRET
//                                 can't attest anything, so they don't invite
//                                 shares — the honest degrade)
import { resolve } from "path";
import { decodeShare } from "../public/js/engine/sharecard.js";
import { decodeCert } from "../public/js/engine/certificate.js";
import {
  cardsAvailable, renderCardPng,
  streakCardSvg, readinessCardSvg, certCardSvg,
} from "./share-cards.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// PRD-COMMUNITY §4.1 — the standard footer, verbatim, on every share page.
export const SHARE_FOOTER =
  "Automatos Academy is independent training. Not affiliated with or endorsed by any certification body.";

// "<payload>~<sig>" → parts ("~" can't appear in base64url, "." or hex).
const splitSig = (raw) => {
  const i = (raw || "").indexOf("~");
  return i === -1 ? { payload: raw || "", sig: "" } : { payload: raw.slice(0, i), sig: raw.slice(i + 1) };
};

/** Track names + summary + shape from the content index (never from disk). */
export function shareTrackMeta(index, vendorId, trackId) {
  const fallback = { trackName: trackId, code: (trackId || "").toUpperCase(), summary: "", isExam: true, known: false };
  try {
    const entry = index.tracks.get(`${vendorId}/${trackId}`);
    const manifest = index.manifest.data;
    const vend = (manifest.vendors || []).find((v) => v.id === vendorId);
    const mt = vend && (vend.tracks || []).find((t) => t.trackId === trackId);
    const track = entry ? entry.track.data : null;
    if (!track && !mt) return fallback;
    const name = (track && track.name) || (mt && mt.name) || trackId;
    return {
      trackName: name,
      code: (track && track.code) || (mt && mt.code) || (trackId || "").toUpperCase(),
      summary: (track && track.summary) || (mt && mt.summary) || "",
      isExam: track ? !!(track.exam && track.exam.questionCount) : true,
      known: true,
    };
  } catch (_) {
    return fallback;
  }
}

// ── page copy (exported so tests can hold the honesty rules to it) ──────
export function shareCopy(share, meta) {
  if (share.kind === "streak") {
    return {
      title: `${share.n}-day study streak · Automatos Academy`,
      desc: `A ${share.n}-day study streak at Automatos Academy — free, honest AI training, independent of any certification body.`,
      headline: `${share.n}-day study streak`,
      sub: "Counted from daily study activity.",
      ctaHref: "/#/start", ctaLabel: "Find your track →",
    };
  }
  const noun = meta.isExam ? "readiness" : "complete";
  const on = meta.isExam ? `on the ${meta.trackName} prep track` : `of the ${meta.trackName} track`;
  return {
    title: `${share.n}% ${noun} — ${meta.trackName} · Automatos Academy`,
    desc: `${share.n}% ${noun} ${on} at Automatos Academy (${share.date}). The Academy's own ${meta.isExam ? "readiness score — preparation, not a pass prediction" : "completion measure"}. Free, honest AI training.`,
    headline: `${share.n}% ${noun}`,
    sub: meta.isExam
      ? `The Academy's readiness score for the ${meta.trackName} prep track — not a pass prediction.`
      : `Lesson-by-lesson completion of the ${meta.trackName} track.`,
    ctaHref: `/#/t/${share.vendorId}/${share.trackId}`, ctaLabel: "Start this track →",
  };
}

/** The server-rendered share page — OG tags + a no-JS periwinkle render. */
export function sharePageHtml({ share, meta, pageUrl, imageUrl, signed }) {
  const c = shareCopy(share, meta);
  const kickerRight = share.kind === "streak" ? share.date : `${meta.code} · ${share.date}`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Automatos Academy">
<meta property="og:title" content="${esc(c.title)}"><meta property="og:description" content="${esc(c.desc)}">
<meta property="og:url" content="${esc(pageUrl)}"><meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/academy.css">
</head><body data-mood="mist" style="display:block">
<main style="max-width:820px;margin:0 auto;padding:64px 22px">
  <div class="cert-card">
    <div style="display:flex;justify-content:space-between"><span class="mono-label">Automatos Academy</span><span class="mono-label">${esc(kickerRight)}</span></div>
    <h1 class="serif-i" style="font-size:clamp(38px,7vw,64px);margin:34px 0 0">${esc(c.headline)}</h1>
    <p style="margin-top:14px;font-size:18px;max-width:60ch">${esc(c.sub)}</p>
    ${share.name ? `<p class="mono-label" style="margin-top:18px">Shared by ${esc(share.name)}</p>` : ""}
    ${meta.summary ? `<p style="margin-top:18px;font-size:15px;max-width:66ch;border-top:1px dashed var(--rule);padding-top:16px">${esc(meta.summary)}</p>` : ""}
    ${signed ? '<p class="mono-label" style="margin-top:14px">✓ Signed by the Academy</p>' : ""}
  </div>
  <p style="margin-top:22px"><a class="ac-btn ac-btn-solid" href="${esc(c.ctaHref)}">${esc(c.ctaLabel)}</a>
  <a class="ac-btn" href="/">Browse all tracks</a></p>
  <p class="mono-label" style="margin-top:18px;max-width:70ch">${esc(SHARE_FOOTER)}</p>
</main></body></html>`;
}

// ── mounting ─────────────────────────────────────────────────────────────
/**
 * @param {import("express").Express} app
 * @param {{ getIndex: () => object,
 *           sigMatches: (payload:string, sig:string) => boolean,
 *           sharingEnabled: () => boolean,
 *           publicDir: string }} deps
 */
export function mountShareRoutes(app, { getIndex, sigMatches, sharingEnabled, publicDir }) {
  const notFound = (res) => {
    res.status(404);
    return res.sendFile(resolve(publicDir, "index.html"));
  };

  const pngHeaders = (res) => {
    res.setHeader("Content-Type", "image/png");
    // A card image is immutable per payload (the sig is part of the URL).
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  };

  // Tiny in-memory LRU: cards are immutable per URL and crawlers fetch the
  // same og:image several times per unfurl — cache the PNG, not the work.
  // Bounded and ephemeral (resets on deploy), like the sign rate limiter.
  const CACHE_MAX = 200;
  const pngCache = new Map(); // url → Buffer, Map order = recency
  const cacheGet = (key) => {
    const hit = pngCache.get(key);
    if (hit) { pngCache.delete(key); pngCache.set(key, hit); } // refresh recency
    return hit;
  };
  const cachePut = (key, buf) => {
    pngCache.set(key, buf);
    if (pngCache.size > CACHE_MAX) pngCache.delete(pngCache.keys().next().value);
  };

  const sendCard = (res, cacheKey, buildSvg) => {
    if (!cardsAvailable()) return res.redirect(302, "/og-academy.png?v=2");
    const cached = cacheGet(cacheKey);
    if (cached) {
      pngHeaders(res);
      return res.send(cached);
    }
    try {
      const png = Buffer.from(renderCardPng(buildSvg()));
      cachePut(cacheKey, png);
      pngHeaders(res);
      return res.send(png);
    } catch (e) {
      console.error("[share] card render failed:", e.message);
      return res.redirect(302, "/og-academy.png?v=2");
    }
  };

  // Client affordance gate — see the header note.
  app.get("/api/share/config", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ sharing: sharingEnabled() });
  });

  app.get("/s/:payload", (req, res) => {
    const raw = req.params.payload;
    const { payload, sig } = splitSig(raw);
    const share = decodeShare(payload);
    if (!share) return notFound(res);
    const signed = !!sig && sigMatches(payload, sig);
    const meta = share.kind === "readiness"
      ? shareTrackMeta(getIndex(), share.vendorId, share.trackId)
      : { trackName: "", code: "", summary: "", isExam: false, known: false };
    const base = `${req.protocol}://${req.get("host")}`;
    const imageUrl = cardsAvailable() ? `${base}/s/${raw}/card.png` : `${base}/og-academy.png?v=2`;
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(sharePageHtml({ share, meta, pageUrl: `${base}/s/${raw}`, imageUrl, signed }));
  });

  app.get("/s/:payload/card.png", (req, res) => {
    const raw = req.params.payload;
    const { payload, sig } = splitSig(raw);
    const share = decodeShare(payload);
    if (!share) return res.status(404).end();
    const signed = !!sig && sigMatches(payload, sig);
    return sendCard(res, `s:${raw}`, () => {
      if (share.kind === "streak") {
        return streakCardSvg({ n: share.n, date: share.date, name: share.name, signed });
      }
      const meta = shareTrackMeta(getIndex(), share.vendorId, share.trackId);
      return readinessCardSvg({
        n: share.n, code: meta.code, trackName: meta.trackName, isExam: meta.isExam,
        date: share.date, name: share.name, signed,
      });
    });
  });

  // Dynamic certificate card — /cert/:payload's og:image points here (S1a).
  app.get("/cert/:payload/card.png", (req, res) => {
    const raw = req.params.payload;
    const { payload, sig } = splitSig(raw);
    const cert = decodeCert(payload);
    if (!cert) return res.status(404).end();
    const signed = !!sig && sigMatches(payload, sig);
    return sendCard(res, `cert:${raw}`, () => {
      const meta = shareTrackMeta(getIndex(), cert.vendorId, cert.trackId);
      return certCardSvg({
        name: cert.name, trackName: meta.trackName, date: cert.date, certId: cert.certId, signed,
      });
    });
  });
}
