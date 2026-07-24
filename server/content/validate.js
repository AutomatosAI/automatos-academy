// PRD-CONTENT-LIFECYCLE S1 — write-back validation (pure, no I/O, unit-tested).
// Turns an untrusted write-back body into a normalised draft row, or an error
// code. Byte-fidelity is the whole game (same rule as content_documents): the
// stored `canonical` is served verbatim as JSON.parse(canonical) and its sha256
// is the ETag, so we accept a raw JSON string (kept exactly) OR an object
// (stringified once, here) and ALWAYS confirm it round-trips as valid JSON.

import crypto from "node:crypto";

export const SCOPE_KINDS = new Set(["manifest", "track", "domain", "paths", "levels", "podcasts"]);
const SINGLETON = new Set(["manifest", "paths", "levels", "podcasts"]); // carry no ids

// A generous ceiling — the largest real domain files are ~80KB; 1MB stops a
// runaway/abusive body without ever clipping legitimate content.
export const MAX_DRAFT_BYTES = 1_048_576;

const sha256 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

/** The file this draft would become — informational (the overlay matches by
 *  scope tuple, not path), but stored so the console/publish can show it. */
export function deriveRelPath({ scopeKind, vendorId, trackId, domainId }) {
  switch (scopeKind) {
    case "manifest": return "manifest.json";
    case "paths": return "paths.json";
    case "levels": return "levels.json";
    case "podcasts": return "podcasts.json";
    case "track": return `${vendorId}/${trackId}/track.json`;
    case "domain": return `${vendorId}/${trackId}/${domainId}.json`;
    default: return "";
  }
}

/**
 * @param body {scopeKind, vendorId?, trackId?, domainId?, canonical, source?, note?}
 *        canonical: a JSON string (kept byte-for-byte) or a JSON-serialisable object.
 * @returns { ok:true, draft } | { ok:false, error, note? }
 */
export function validateDraft(body, { maxBytes = MAX_DRAFT_BYTES } = {}) {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_body" };

  const scopeKind = String(body.scopeKind || "");
  if (!SCOPE_KINDS.has(scopeKind)) return { ok: false, error: "bad_scope_kind" };

  // Normalise the scope ids to exactly what this kind may carry (extra ids are
  // an error, missing required ids are an error — mirrors the table CHECK).
  const vendorId = body.vendorId != null ? String(body.vendorId) : null;
  const trackId = body.trackId != null ? String(body.trackId) : null;
  const domainId = body.domainId != null ? String(body.domainId) : null;

  if (SINGLETON.has(scopeKind)) {
    if (vendorId || trackId || domainId) return { ok: false, error: "scope_shape", note: `${scopeKind} takes no ids` };
  } else if (scopeKind === "track") {
    if (!vendorId || !trackId) return { ok: false, error: "scope_shape", note: "track needs vendorId + trackId" };
    if (domainId) return { ok: false, error: "scope_shape", note: "track takes no domainId" };
  } else if (scopeKind === "domain") {
    if (!vendorId || !trackId || !domainId) return { ok: false, error: "scope_shape", note: "domain needs vendorId + trackId + domainId" };
  }

  // Byte-fidelity: keep a supplied string verbatim; stringify an object once.
  const { canonical } = body;
  let text, payload;
  if (typeof canonical === "string") {
    text = canonical;
    try { payload = JSON.parse(text); } catch { return { ok: false, error: "canonical_not_json" }; }
  } else if (canonical && typeof canonical === "object") {
    try { text = JSON.stringify(canonical); } catch { return { ok: false, error: "canonical_not_json" }; }
    payload = canonical;
  } else {
    return { ok: false, error: "canonical_required" };
  }

  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes === 0) return { ok: false, error: "canonical_empty" };
  if (bytes > maxBytes) return { ok: false, error: "too_large", note: `${bytes} > ${maxBytes} bytes` };
  // A content document is a JSON object — a bare array/scalar is never a valid
  // scope body (typeof [] is "object", so guard Array explicitly).
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "canonical_not_object" };
  }

  // Cheap authoring-mistake catch: a domain document is keyed by its id, so a
  // draft whose body.id disagrees with the target domainId is almost always a
  // paste error (it would overlay the wrong scope). Only enforced where the
  // convention is firm (domain); track.json shape varies, so it's advisory.
  if (scopeKind === "domain" && typeof payload.id === "string" && payload.id !== domainId) {
    return { ok: false, error: "id_mismatch", note: `document id "${payload.id}" != domainId "${domainId}"` };
  }

  const source = body.source != null ? String(body.source).slice(0, 64) : "admin";
  const note = body.note != null ? String(body.note).slice(0, 2000) : null;

  return {
    ok: true,
    draft: {
      scopeKind, vendorId, trackId, domainId,
      relPath: deriveRelPath({ scopeKind, vendorId, trackId, domainId }),
      canonical: text, payload, sha256: sha256(text), bytes, source, note,
    },
  };
}
