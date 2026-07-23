// Media upload validation (PRD-WAVE-CONTENT-OPS C3) — pure guards shared by
// the presign + bind endpoints, unit-tested with no server. The presigned PUT
// is scoped by these: content-type + kind allowlist, and a key path locked to
// academy/<vendor>/<track>/ so a leaked presign can never write elsewhere in
// the bucket (least-privilege on the object key, not just the IAM policy).

export const MEDIA_KINDS = ["video", "audio", "transcript"];

/** per-kind content-type allowlist + a soft size ceiling (bytes) */
export const MEDIA_RULES = {
  video: { types: ["video/mp4"], maxBytes: 500 * 1024 * 1024 },
  audio: { types: ["audio/mpeg", "audio/mp4", "audio/aac"], maxBytes: 60 * 1024 * 1024 },
  transcript: { types: ["application/json", "text/vtt"], maxBytes: 5 * 1024 * 1024 },
};

const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const SLOT = /^[a-z0-9][a-z0-9._-]*$/i;

/** collapse a filename to a safe basename (the presign path is otherwise
 *  locked, but the filename is caller-supplied) */
export function sanitizeFilename(name) {
  return String(name || "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "")
    .slice(0, 120) || "file";
}

/** the S3 object key — content lives under academy/<vendor>/<track>/ only */
export function mediaKey({ vendorId, trackId, slotId, filename }) {
  return `academy/${vendorId}/${trackId}/${slotId}-${sanitizeFilename(filename)}`;
}

/** the CDN url for a key (base has no trailing slash) */
export function cdnUrl(base, key) {
  return `${String(base).replace(/\/+$/, "")}/${key}`;
}

/** validate a presign request. Returns {ok:true, key, url, rule} or {ok:false, status, error}. */
export function validatePresign(body, { cdnBase }) {
  const { vendor, track, slotId, kind, filename, contentType } = body || {};
  if (!MEDIA_KINDS.includes(kind)) {
    return { ok: false, status: 400, error: "bad_kind" };
  }
  if (!SLUG.test(vendor || "") || !SLUG.test(track || "") || !SLOT.test(slotId || "")) {
    return { ok: false, status: 400, error: "bad_slot_ref" };
  }
  const rule = MEDIA_RULES[kind];
  if (!contentType || !rule.types.includes(contentType)) {
    return { ok: false, status: 400, error: "bad_content_type", allowed: rule.types };
  }
  const key = mediaKey({ vendorId: vendor, trackId: track, slotId, filename });
  return { ok: true, key, url: cdnUrl(cdnBase, key), rule };
}
