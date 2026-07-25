// Media upload validation (PRD-WAVE-CONTENT-OPS C3) — pure guards shared by
// the presign + bind endpoints, unit-tested with no server. The presigned PUT
// is scoped by these: content-type + kind allowlist, and a key path locked to
// academy/<vendor>/<track>/ so a leaked presign can never write elsewhere in
// the bucket (least-privilege on the object key, not just the IAM policy).

export const MEDIA_KINDS = ["video", "audio", "transcript", "image"];

/** per-kind content-type allowlist + a soft size ceiling (bytes) */
export const MEDIA_RULES = {
  video: { types: ["video/mp4"], maxBytes: 500 * 1024 * 1024 },
  audio: { types: ["audio/mpeg", "audio/mp4", "audio/aac"], maxBytes: 60 * 1024 * 1024 },
  transcript: { types: ["application/json", "text/vtt"], maxBytes: 5 * 1024 * 1024 },
  // LA-9 — rendered infographics. A portrait card PNG is ~200–600KB; 10MB is
  // a runaway guard, not a target.
  image: { types: ["image/png", "image/webp"], maxBytes: 10 * 1024 * 1024 },
};

/**
 * LA-9 — the slot vocabulary, written down.
 *
 * Slot ids have always been free-form (`SLOT` below), which meant nothing
 * stopped a PNG being bound to a video slot: the player would then render a
 * <video> pointing at an image and a learner would get a dead card. The
 * prefix now declares what a slot HOLDS, and binding checks the two agree.
 *
 *   v-*   video   the existing convention (v-d1-2.mp4) — unchanged
 *   ig-*  image   infographic cards (ig-<domain>-<n>)
 *   mv-*  video   mini-videos (LA-14) — reserved now so LA-14 adds no vocabulary
 *   a-*   audio   narration/deep-dive audio
 *   t-*   transcript
 *
 * A slot with no known prefix is still accepted (legacy ids predate this, and
 * refusing them would strand live bindings) — it simply gets no extra check.
 */
export const SLOT_FAMILIES = {
  "v-": "video",
  "mv-": "video",
  "ig-": "image",
  "a-": "audio",
  "t-": "transcript",
};

/** the kind a slot id declares, or null when it uses no known prefix */
export function kindForSlot(slotId) {
  const id = String(slotId || "");
  // longest prefix first, so "mv-" is not read as an unknown "m" family
  const prefixes = Object.keys(SLOT_FAMILIES).sort((a, b) => b.length - a.length);
  for (const p of prefixes) if (id.startsWith(p)) return SLOT_FAMILIES[p];
  return null;
}

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
  // LA-9 — a slot that declares its family must be handed matching bytes. The
  // failure this prevents is silent: an image bound to a v-* slot renders as a
  // <video> with an unplayable source, i.e. a dead card, not an error.
  const declared = kindForSlot(slotId);
  if (declared && declared !== kind) {
    return { ok: false, status: 400, error: "slot_kind_mismatch", expected: declared, got: kind };
  }
  const rule = MEDIA_RULES[kind];
  if (!contentType || !rule.types.includes(contentType)) {
    return { ok: false, status: 400, error: "bad_content_type", allowed: rule.types };
  }
  const key = mediaKey({ vendorId: vendor, trackId: track, slotId, filename });
  return { ok: true, key, url: cdnUrl(cdnBase, key), rule };
}
