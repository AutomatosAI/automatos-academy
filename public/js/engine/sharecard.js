// Share-card payload codec (PRD-COMMUNITY S1) — streak + readiness cards.
//
// Pure module — no DOM, no fetch — so server.js imports it too (the /s share
// page and its OG card image decode the SAME payload the client encoded,
// exactly the certificate.js precedent). Cards are SOCIAL PROOF: the checksum
// only deters casual URL editing. A server HMAC signature ("~sig" suffix,
// server/signing.js) is added ONLY when the Spine can attest the number —
// the copy for that state is "Signed by the Academy", never "verified".
//
// Certificate cards do NOT ride this codec — they keep the certificate.js
// payload and the /cert/:payload page; this module covers the two new kinds.

// Milestone tiers (aligned with PRD-MT-12's celebration tiers — reference
// only; MT-12 owns the celebration surface). The web affordance appears from
// the first milestone; the card renders the real current number.
export const STREAK_MILESTONES = [7, 30, 100, 365];

/** Largest milestone reached at `n` days, or null below the first. */
export function streakMilestone(n) {
  let hit = null;
  for (const m of STREAK_MILESTONES) if (n >= m) hit = m;
  return hit;
}

// ── payload codec: base64url(JSON) + "." + checksum ─────────────────────
// Same construction as certificate.js with its OWN salt, so neither codec
// ever accepts the other's payloads. Fields stay one-letter for short URLs.
const SALT = "automatos-academy-share-v1";

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const b64encode = (s) => {
  const utf8 = typeof Buffer !== "undefined"
    ? Buffer.from(s, "utf8").toString("base64")
    : btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  return utf8.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64decode = (s) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
};

// Bounds the server render trusts (decodeShare is the ONLY gate between a
// URL and the SVG/HTML templates — never loosen these without re-checking
// the templates). Name is opt-in and capped; control chars are refused.
const KINDS = { s: "streak", r: "readiness" };
const MAX_STREAK_DAYS = 9999;
const MAX_NAME_LEN = 60;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL_RE = /[\u0000-\u001F\u007F]/;

const validName = (m) =>
  m === undefined || m === "" ||
  (typeof m === "string" && m.trim() === m && m.length <= MAX_NAME_LEN && !CONTROL_RE.test(m));

/**
 * @param {{kind:"streak"|"readiness", n:number, vendorId?:string,
 *          trackId?:string, date:string, name?:string}} card
 * @returns {string} payload — or throws on out-of-contract input (callers
 *          build from their own UI state; a throw is a programming error)
 */
export function encodeShare({ kind, n, vendorId, trackId, date, name }) {
  const k = kind === "streak" ? "s" : kind === "readiness" ? "r" : null;
  if (!k) throw new Error(`unknown share kind: ${kind}`);
  const o = { k, n, d: date };
  if (k === "r") { o.v = vendorId; o.t = trackId; }
  if (name) o.m = name;
  const body = b64encode(JSON.stringify(o));
  const payload = `${body}.${djb2(SALT + body)}`;
  if (!decodeShare(payload)) throw new Error("share payload failed its own validation");
  return payload;
}

/**
 * Strict decode + validation — null on ANY malformation. The server renders
 * nothing that didn't pass this (the decodeCert-before-render rule).
 */
export function decodeShare(payload) {
  const dot = (payload || "").lastIndexOf(".");
  if (dot < 1) return null;
  const body = payload.slice(0, dot), sum = payload.slice(dot + 1);
  if (djb2(SALT + body) !== sum) return null;
  try {
    const o = JSON.parse(b64decode(body));
    const kind = KINDS[o.k];
    if (!kind) return null;
    if (!Number.isInteger(o.n)) return null;
    if (kind === "streak" && (o.n < 1 || o.n > MAX_STREAK_DAYS)) return null;
    if (kind === "readiness" && (o.n < 0 || o.n > 100)) return null;
    if (typeof o.d !== "string" || !DATE_RE.test(o.d)) return null;
    if (kind === "readiness" && (!ID_RE.test(o.v || "") || !ID_RE.test(o.t || ""))) return null;
    if (!validName(o.m)) return null;
    return {
      kind, n: o.n, date: o.d,
      vendorId: kind === "readiness" ? o.v : "",
      trackId: kind === "readiness" ? o.t : "",
      name: o.m || "",
      cardId: sum,
    };
  } catch (_) {
    return null;
  }
}
