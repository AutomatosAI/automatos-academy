// Card collection over the served content index (PRD-WAVE-LIVING-ACADEMY LA-1).
//
// Cards are a VIEW, recomputed per request from the same bytes the catalog
// serves — including the approved-draft overlay (server/content/overlay.js)
// and the media-bindings overlay (server/media/overlay.js). There is no card
// store to keep in sync, and an approved draft changes the feed the instant it
// changes the document. Same posture as /track and /domain: compute, ETag,
// `Cache-Control: public, max-age=300`, 304 on revalidation.
//
// Locale resolution is FR-6: requested locale → exact tag → same base language
// → "en". Resolution happens per CARD ID, so a partially translated track
// serves its translated cards translated and the rest in English, rather than
// falling back wholesale.

import { createHash } from "crypto";
import { applyContentOverride } from "../content/overlay.js";
import { cardsFromDomain, cardsFromTrack } from "./map.js";
import { CARD_TYPES, DEFAULT_LOCALE, isCardType, localeMatches, normalizeLocale } from "./types.js";

const shortHash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

/** media_bindings `kind` per media card type. `image` arrives with LA-9's
 *  infographic slots; until then an infographic card serves its slotId with
 *  `media.url` null — the contract is stable, the pixels are simply not bound
 *  yet, and a client renders the placeholder it already renders for videos. */
const MEDIA_KIND_BY_TYPE = Object.freeze({ infographic: "image", minivideo: "video" });

/** Parse the `type` query param into a validated filter set, or null for "all".
 *  An unknown type is dropped rather than erroring — a newer client asking for
 *  a type this deploy doesn't know should get the types it DOES know, not a
 *  400 (the same forward-compatibility rule clients owe us, owed back). */
export function parseTypeFilter(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const wanted = value.split(",").map((t) => t.trim()).filter((t) => isCardType(t));
  return wanted.length ? new Set(wanted) : new Set();
}

/**
 * Pick one card per UID under FR-6 resolution. Preference, best first:
 *   1. exact locale tag        (pt-BR asked, pt-BR card)
 *   2. same base language      (pt-BR asked, pt card)
 *   3. the default locale "en" (the guaranteed fallback)
 * Serve order follows the FIRST appearance of each uid, so switching locale
 * never reshuffles the feed.
 *
 * Keyed on `uid`, NEVER `id`: item ids are unique only within a track, so a
 * whole-catalog pull deduped by `id` would silently discard most of the
 * catalog (`q-m00-1` exists in several tracks).
 */
export function resolveLocale(cards, wanted) {
  const target = normalizeLocale(wanted) || DEFAULT_LOCALE;
  const rank = (card) => {
    if (card.locale === target) return 0;
    if (localeMatches(card.locale, target)) return 1;
    if (card.locale === DEFAULT_LOCALE) return 2;
    return 3;
  };
  const best = new Map(); // uid → {card, rank}
  const order = [];
  for (const card of cards) {
    const r = rank(card);
    const prev = best.get(card.uid);
    if (!prev) { best.set(card.uid, { card, rank: r }); order.push(card.uid); continue; }
    if (r < prev.rank) best.set(card.uid, { card, rank: r });
  }
  // rank 3 = a locale neither asked for nor the fallback. Keep it ONLY when
  // it's all that exists for that uid: dropping the card would be worse than
  // serving it in the wrong language, and the card states its own locale.
  return order.map((uid) => best.get(uid).card);
}

/** Attach the CDN url for a media card whose slot is bound. Immutable — the
 *  index is shared and cached, so never mutate a card in place. */
function resolveMedia(card, bySlot) {
  if (!card.media || !bySlot) return card;
  const kind = MEDIA_KIND_BY_TYPE[card.type];
  const b = kind ? bySlot.get(`${card.media.slotId}:${kind}`) : null;
  if (!b) return card;
  return { ...card, media: { ...card.media, kind, url: b.url, contentType: b.contentType || null } };
}

/**
 * Collect every card in scope.
 *
 * @param idx    buildContentIndex() result
 * @param opts.vendorId/trackId/domainId  optional narrowing (domain needs both others)
 * @param opts.locale   requested locale (FR-6); defaults to "en"
 * @param opts.types    Set of card types to keep, or null for all
 * @param opts.getOverride  (scopeKind, vendor, track, domain) → {canonical, sha256} | null
 * @param opts.getBindings  (vendor, track) → {bySlot, version} | null
 * @returns {{cards, count, locale, invalidCards, errors, hash}}
 */
export function collectCards(idx, opts = {}) {
  const { vendorId = null, trackId = null, domainId = null, locale, types = null } = opts;
  const getOverride = typeof opts.getOverride === "function" ? opts.getOverride : () => null;
  const getBindings = typeof opts.getBindings === "function" ? opts.getBindings : () => null;

  const resolved = normalizeLocale(locale) || DEFAULT_LOCALE;
  const collected = [];
  const errors = [];
  const parts = []; // ETag basis: the document hashes this answer was built from

  for (const [key, entry] of idx.tracks) {
    const [vId, tId] = key.split("/");
    if (vendorId && vId !== vendorId) continue;
    if (trackId && tId !== trackId) continue;

    // Track-scope cards (LA-11's changelog seam) — skipped when the caller
    // narrowed to one domain, since they belong to no domain.
    if (!domainId) {
      const co = applyContentOverride(entry.track.data, entry.track.hash, getOverride("track", vId, tId, null));
      const r = cardsFromTrack(co.body, { vendorId: vId, trackId: tId });
      collected.push(...r.cards);
      errors.push(...r.errors);
      parts.push(`${key}/track:${co.hash}`);
    }

    for (const [dId, d] of entry.domains) {
      if (domainId && dId !== domainId) continue;
      const co = applyContentOverride(d.data, d.hash, getOverride("domain", vId, tId, dId));
      const r = cardsFromDomain(co.body, { vendorId: vId, trackId: tId, domainId: dId });
      collected.push(...r.cards);
      errors.push(...r.errors);
      parts.push(`${key}/${dId}:${co.hash}`);
    }

    const b = getBindings(vId, tId);
    if (b) parts.push(`${key}/media:${b.version}`);
  }

  const localized = resolveLocale(collected, resolved);
  const filtered = types ? localized.filter((c) => types.has(c.type)) : localized;

  // Media resolution last: bindings are per track, and only the cards that
  // survived filtering need a lookup.
  const bindingsCache = new Map();
  const cards = filtered.map((c) => {
    const key = `${c.scope.vendorId}/${c.scope.trackId}`;
    if (!bindingsCache.has(key)) bindingsCache.set(key, getBindings(c.scope.vendorId, c.scope.trackId));
    const b = bindingsCache.get(key);
    return resolveMedia(c, b && b.bySlot);
  });

  const typeKey = types ? [...types].sort().join(",") : "*";
  return {
    cards,
    count: cards.length,
    locale: resolved,
    // Honest, non-leaking signal that some authored card failed validation
    // after merge (an approved draft can introduce one; the pre-merge
    // validator catches the rest). The messages stay server-side.
    invalidCards: errors.length,
    errors,
    hash: shortHash(`${parts.sort().join("|")}|locale=${resolved}|types=${typeKey}`),
  };
}

export { CARD_TYPES, DEFAULT_LOCALE };
