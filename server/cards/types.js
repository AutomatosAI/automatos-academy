// The card contract (PRD-WAVE-LIVING-ACADEMY LA-1) — one typed shape so any
// client can render a mixed feed, and so new content TYPES can ship without an
// app release. New RENDERERS still need a release; forward-compatible skipping
// (FR-1) is what makes that safe: an old build drops a card type it doesn't
// know instead of erroring, so shipping a `minivideo` never breaks a learner
// still on last month's binary.
//
//   card { id, type, scope{}, conceptKeys[], locale, payload, media?{slotId}, source{} }
//
// `scope` is stamped by the BUILDER from the card's position in the content
// tree — never read from the card body. A draft card cannot lie about which
// track it belongs to, because the document it arrived in already answered
// that. It carries {vendorId, trackId, domainId} because that + `id` is
// exactly the key `progress` rows use, so a graded card writes SM-2 state with
// no lookup (LA-3).
//
// Locale rides EVERY card from birth (§7.1): content documents key as
// (docPath, locale), media bindings as (slotId, locale), cards carry `locale`.
// Resolution is requested-locale → "en" (FR-6). Getting this in now costs
// nothing; retrofitting it costs a wave.
//
// Pure validation, no I/O — the same judge runs in the content validator
// (pre-merge), the card builder (serve time), and the tests.

import { conceptKey, conceptKeysForItem, normalizeConceptKeys, CONCEPT_KEY_MAX } from "../concepts/keys.js";

/** The types this wave defines. A client MUST skip an unknown type (FR-1). */
export const CARD_TYPES = Object.freeze([
  "quiz",        // an existing question / knowledge check, mapped (LA-1)
  "flashcard",   // front/back recall, binary graded (LA-5, factory LA-7)
  "infographic", // rendered portrait image in a media slot (LA-9)
  "minivideo",   // rendered 20–40s vertical clip in a media slot (LA-14)
  "explainback", // "explain X in your own words" + rubric (LA-10)
  "changelog",   // "what changed" freshness entry (LA-11)
]);
const TYPE_SET = new Set(CARD_TYPES);

/** Types whose payload is rendered media living in a `media_bindings` slot —
 *  Lane 2 (§3). Everything else is Lane 1 structured payload. */
export const MEDIA_CARD_TYPES = Object.freeze(["infographic", "minivideo"]);
const MEDIA_SET = new Set(MEDIA_CARD_TYPES);

export const DEFAULT_LOCALE = "en";

/** BCP-47-ish: `en`, `pt-BR`, `es-419`, `ar`. Deliberately permissive on the
 *  subtag, strict on shape — we store what we're given, we don't invent a
 *  registry. Compared case-insensitively everywhere (locales are not ids). */
const LOCALE_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i;
const ID_RE = /^[a-z0-9][a-z0-9._:-]*$/i;

const MAX_ID = 200;
const MAX_SLOT = 120;
const MAX_PAYLOAD_BYTES = 65_536; // one card, not one document

export const isCardType = (v) => TYPE_SET.has(v);
export const isMediaCardType = (v) => MEDIA_SET.has(v);

/** Normalise a locale tag, or null. Language subtag lowercased, region upper —
 *  so `PT-br` and `pt-BR` are one locale, never two half-populated ones. */
export function normalizeLocale(value) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  if (!LOCALE_RE.test(s)) return null;
  const [lang, region] = s.split("-");
  return region ? `${lang.toLowerCase()}-${region.toUpperCase()}` : lang.toLowerCase();
}

/** FR-6 resolution: an exact tag match, or the same base language. */
export const localeMatches = (cardLocale, wanted) =>
  cardLocale === wanted || cardLocale.split("-")[0] === wanted.split("-")[0];

/** A card's position in the content tree — {vendorId, trackId, domainId?}. */
function normalizeScope(scope) {
  if (!scope || typeof scope !== "object") return null;
  const vendorId = typeof scope.vendorId === "string" ? scope.vendorId.trim() : "";
  const trackId = typeof scope.trackId === "string" ? scope.trackId.trim() : "";
  if (!vendorId || !trackId) return null;
  const domainId = typeof scope.domainId === "string" && scope.domainId.trim() ? scope.domainId.trim() : null;
  return { vendorId, trackId, domainId };
}

/**
 * Validate ONE card against the scope it was found in. Returns a normalised
 * card (never the input object — callers may hold the source document) or a
 * coded error.
 *
 * `source` is required and carries the citation FR-2 promises. `lessonRef` is
 * NULLABLE because a standalone domain question genuinely belongs to no lesson
 * — the honest answer is null, not a fabricated ref. `chunkRef` is what the
 * factory's fact-checker cites (cite-or-die, LA-7); `refs[]` carries the
 * resource ids existing content already uses (`sourceRefs`).
 *
 * conceptKeys default to the card's own position (lesson concept when it has a
 * lessonRef, then its domain concept) so hand-authored cards never have to
 * restate what the tree already knows. Declared keys are honoured as given —
 * that is the seam a KG-extracted enrichment playbook writes into later (D-LA3).
 *
 * @param {object} card
 * @param {{scope: {vendorId, trackId, domainId?}}} ctx
 * @returns {{ok: true, card}} | {{ok: false, error, note?}}
 */
export function validateCard(card, { scope } = {}) {
  const where = normalizeScope(scope);
  if (!where) return { ok: false, error: "bad_scope", note: "cards need {vendorId, trackId}" };

  if (!card || typeof card !== "object" || Array.isArray(card)) return { ok: false, error: "card_not_object" };

  const id = typeof card.id === "string" ? card.id.trim() : "";
  if (!id || id.length > MAX_ID || !ID_RE.test(id)) return { ok: false, error: "bad_card_id", note: String(card.id) };

  const type = typeof card.type === "string" ? card.type.trim() : "";
  if (!isCardType(type)) return { ok: false, error: "unknown_card_type", note: `${id}: ${type}` };

  // An explicit-but-unusable locale is an authoring error worth surfacing; an
  // ABSENT locale is the overwhelmingly common case and defaults to "en".
  const locale = card.locale === undefined ? DEFAULT_LOCALE : normalizeLocale(card.locale);
  if (!locale) return { ok: false, error: "bad_locale", note: `${id}: ${card.locale}` };

  const src = card.source;
  if (!src || typeof src !== "object" || Array.isArray(src)) return { ok: false, error: "source_required", note: id };
  const lessonRef = src.lessonRef === undefined || src.lessonRef === null ? null : String(src.lessonRef).slice(0, MAX_ID);
  const chunkRef = src.chunkRef === undefined || src.chunkRef === null ? null : String(src.chunkRef).slice(0, MAX_ID);
  const refs = Array.isArray(src.refs)
    ? [...new Set(src.refs.filter((r) => typeof r === "string" && r).map((r) => r.slice(0, MAX_ID)))].slice(0, 16)
    : [];

  // Concept keys are how the scheduler reasons about topics. A card with none
  // is invisible to the brain, so we always land at least the tree's own keys.
  const declared = normalizeConceptKeys(card.conceptKeys);
  const conceptKeys = declared.length
    ? declared
    : conceptKeysForItem({ ...where, lessonRef });
  if (conceptKeys.length === 0) {
    return { ok: false, error: "no_concept_keys", note: `${id}: needs ≥1 key of the form vendor/track/domain[/lesson] (≤${CONCEPT_KEY_MAX} chars)` };
  }

  const payload = card.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "payload_not_object", note: id };
  }
  let payloadBytes;
  try {
    payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  } catch {
    return { ok: false, error: "payload_not_serialisable", note: id };
  }
  if (payloadBytes > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: "payload_too_large", note: `${id}: ${payloadBytes} > ${MAX_PAYLOAD_BYTES} bytes` };
  }

  // media{slotId} — required for the Lane 2 types (their pixels live in a
  // media_bindings slot; without a slot there is nothing to render), rejected
  // for the rest so a structured card can never smuggle in a media path.
  let media = null;
  if (card.media !== undefined && card.media !== null) {
    if (typeof card.media !== "object" || Array.isArray(card.media)) return { ok: false, error: "media_not_object", note: id };
    const slotId = typeof card.media.slotId === "string" ? card.media.slotId.trim() : "";
    if (!slotId || slotId.length > MAX_SLOT || !ID_RE.test(slotId)) return { ok: false, error: "bad_media_slot", note: `${id}: ${card.media.slotId}` };
    media = { slotId };
  }
  if (isMediaCardType(type) && !media) return { ok: false, error: "media_slot_required", note: `${id}: ${type} needs media.slotId` };
  if (!isMediaCardType(type) && media) return { ok: false, error: "media_slot_not_allowed", note: `${id}: ${type} carries no media` };

  return {
    ok: true,
    card: {
      // `id` is the ITEM id, verbatim — `progress` rows key on
      // (user_id, vendor_id, track_id, item_id), so a graded card writes SM-2
      // state with no translation. `uid` is the globally unique handle: item
      // ids are only unique WITHIN a track (827 of the catalog's 864 ids
      // repeat across tracks — `q-m00-1` exists in several), so anything that
      // dedupes, keys a list, or indexes a registry must use `uid`, never `id`.
      uid: `${where.vendorId}/${where.trackId}/${id}`,
      id, type,
      scope: where,
      conceptKeys, locale, payload,
      ...(media ? { media } : {}),
      source: { lessonRef, chunkRef, refs },
    },
  };
}

/**
 * Validate a `cards[]` array from one content document. Collects EVERY error
 * (the content validator reports them all in one run, not one per re-run) and
 * returns the cards that passed. Duplicate ids within one document are an
 * error — the first wins, so a partial document still serves.
 */
export function validateCards(cards, { scope, where = "cards" } = {}) {
  if (cards === undefined || cards === null) return { cards: [], errors: [] };
  if (!Array.isArray(cards)) return { cards: [], errors: [`${where}: cards must be an array`] };
  const errors = [];
  const seen = new Set();
  const out = [];
  for (let i = 0; i < cards.length; i++) {
    const r = validateCard(cards[i], { scope });
    if (!r.ok) { errors.push(`${where}[${i}]: ${r.error}${r.note ? ` (${r.note})` : ""}`); continue; }
    if (seen.has(r.card.id)) { errors.push(`${where}[${i}]: duplicate card id ${r.card.id}`); continue; }
    seen.add(r.card.id);
    out.push(r.card);
  }
  return { cards: out, errors };
}

/** The domain-level concept key for a scope — handy for callers building
 *  filters ("everything under d3") without importing the key module. */
export const scopeConceptKey = (scope) => {
  const where = normalizeScope(scope);
  return where ? conceptKey(where) : null;
};
