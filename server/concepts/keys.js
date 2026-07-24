// Concept keys (PRD-WAVE-LIVING-ACADEMY LA-2, D-LA3) — the language-neutral
// ids everything topic-shaped hangs off: card `conceptKeys[]`, the Spine's
// `user_concept_state` rollups, and (later) the factory's coverage planning.
//
// Format: `vendor/track/domain[/lessonRef]` — exactly what the corpus tags and
// `sourceRef` already give us today. Finer KG-extracted concepts are a later
// enrichment playbook (D-LA3): when they land they become a FOURTH segment
// under the lesson, so nothing built on these keys has to move.
//
// Two rules that must never be broken (§7.2):
//   1. Keys are LANGUAGE-NEUTRAL. Labels localize; keys never do. A learner who
//      switches to pt-BR keeps every ounce of mastery because the key that
//      carries it never mentioned a language.
//   2. Keys are content ids, not display text — lowercase, slug-safe, stable.
//      A renamed domain TITLE must not orphan a learner's state; a renamed
//      domain ID is a content migration, and is meant to be.
//
// Pure — no I/O, no config. Both the catalog (cards) and the Spine (rollups)
// import this one definition so a key minted on one side always parses on the
// other.

/** Guard rail for the DB column and the sync boundary alike. */
export const CONCEPT_KEY_MAX = 200;

/** Segment charset: what content ids actually use today (slug + dots for
 *  versioned lesson refs). Deliberately strict — a key that can contain "/"
 *  in a segment would make parsing ambiguous. */
const SEGMENT_RE = /^[a-z0-9][a-z0-9._-]*$/;

/** Depth names, coarsest → finest. Index === segment count − 1. */
export const CONCEPT_LEVELS = ["vendor", "track", "domain", "lesson"];

/** Normalise one id into a key segment, or null if it can't be one. */
export function toSegment(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toLowerCase();
  return s && SEGMENT_RE.test(s) ? s : null;
}

/**
 * Build a concept key from content ids. Returns null (never throws, never a
 * half-key) when a required segment is missing or unusable — callers treat
 * null as "this item has no concept", which is always safe: it just doesn't
 * roll up.
 *
 * @param {{vendorId?, trackId?, domainId?, lessonRef?}} ids
 */
export function conceptKey({ vendorId, trackId, domainId, lessonRef } = {}) {
  const vendor = toSegment(vendorId);
  const track = toSegment(trackId);
  if (!vendor || !track) return null;
  const parts = [vendor, track];
  const domain = toSegment(domainId);
  if (domain) {
    parts.push(domain);
    const lesson = toSegment(lessonRef);
    if (lesson) parts.push(lesson);
  }
  const key = parts.join("/");
  return key.length <= CONCEPT_KEY_MAX ? key : null;
}

/** `vendor/track/domain/lesson` → {vendorId, trackId, domainId, lessonRef, level}
 *  or null when the string isn't a well-formed key. */
export function parseConceptKey(key) {
  if (typeof key !== "string" || key.length > CONCEPT_KEY_MAX) return null;
  const parts = key.split("/");
  if (parts.length < 2 || parts.length > 4) return null;
  if (!parts.every((p) => SEGMENT_RE.test(p))) return null;
  const [vendorId, trackId, domainId = null, lessonRef = null] = parts;
  return { vendorId, trackId, domainId, lessonRef, level: CONCEPT_LEVELS[parts.length - 1] };
}

export const isConceptKey = (v) => parseConceptKey(v) !== null;

/**
 * Every key at or above `key`, finest → coarsest:
 *   a/b/c/d → ["a/b/c/d", "a/b/c", "a/b"]
 * A miss on a lesson concept is also evidence about its domain, so the
 * rollups walk this list. Returns [] for a malformed key.
 */
export function conceptAncestors(key) {
  if (!isConceptKey(key)) return [];
  const parts = key.split("/");
  const out = [];
  for (let n = parts.length; n >= 2; n--) out.push(parts.slice(0, n).join("/"));
  return out;
}

/** The domain-level key an item belongs to (drops any lesson segment). */
export function domainConceptKey(key) {
  const parsed = parseConceptKey(key);
  return parsed && parsed.domainId
    ? conceptKey({ vendorId: parsed.vendorId, trackId: parsed.trackId, domainId: parsed.domainId })
    : null;
}

/** Track prefix for a key — `vendor/track`, the Spine's scoping unit. */
export function trackKeyOf(key) {
  const parsed = parseConceptKey(key);
  return parsed ? `${parsed.vendorId}/${parsed.trackId}` : null;
}

/**
 * Normalise, validate and de-duplicate a `conceptKeys[]` list from untrusted
 * input (a draft, a sync event) while preserving first-seen order. Silently
 * drops what can't be a key — a bad key is never worth failing a whole card
 * or a whole sync batch over, and the dropped key simply doesn't roll up.
 * @param {unknown} keys
 * @param {{max?: number}} [opts]
 */
export function normalizeConceptKeys(keys, { max = 16 } = {}) {
  if (!Array.isArray(keys)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of keys) {
    if (typeof raw !== "string") continue;
    const key = raw.trim().toLowerCase();
    if (!isConceptKey(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * The concept keys a content item sits under, finest-first: its lesson concept
 * (when it belongs to a lesson) then its domain concept. This is the ONE place
 * that decides an item's concepts, so cards minted by the catalog and rollups
 * derived by the Spine agree by construction.
 */
export function conceptKeysForItem({ vendorId, trackId, domainId, lessonRef }) {
  const lesson = lessonRef ? conceptKey({ vendorId, trackId, domainId, lessonRef }) : null;
  const domain = conceptKey({ vendorId, trackId, domainId });
  return [lesson, domain].filter(Boolean);
}
