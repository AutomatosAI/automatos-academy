// Question → `quiz` card mapping (PRD-WAVE-LIVING-ACADEMY LA-1).
//
// A PURE projection: today's questions and in-lesson knowledge checks become
// typed cards with NO content duplication anywhere — nothing is copied into a
// new store, nothing has to be kept in sync. The domain document stays the one
// source of truth and cards are a view over it, recomputed per request from
// the same (possibly overlaid) bytes the catalog serves.
//
// That is why an approved draft "adds or replaces cards" for free (LA-1 AC3):
// the overlay swaps the whole domain document, and the cards derived from it
// change with it. A draft can also carry an explicit `cards[]` array — those
// merge over the derived ones by id, in place, so replacing one card's payload
// never reshuffles a learner's feed order.
//
// Item ids are preserved VERBATIM as card ids. `progress` rows key on
// (user_id, vendor_id, track_id, item_id), so a graded quiz card writes SM-2
// state through the existing path with no translation layer (LA-3).

import { validateCard, validateCards, DEFAULT_LOCALE } from "./types.js";

/** Options minus the answer key, plus the answer key stated once. Mirrors the
 *  app's QuestionFeedCard field-for-field so it consumes cards with no
 *  adapter — the same discipline the podcast contract follows. */
function quizPayload(q) {
  const options = (q.options || [])
    .filter((o) => o && typeof o.id === "string")
    .map((o) => ({ id: o.id, text: typeof o.text === "string" ? o.text : "" }));
  const correctOptionIds = (q.options || []).filter((o) => o && o.correct).map((o) => o.id);
  return {
    stem: typeof q.stem === "string" ? q.stem : "",
    options,
    correctOptionIds,
    // `multi` is derived from the answer key, not the declared type: content
    // that says "single" but marks two correct answers is multi in practice,
    // and the validator already warns about the disagreement.
    multi: q.type === "multi" || correctOptionIds.length > 1,
    explanation: typeof q.explanation === "string" ? q.explanation : "",
    ...(typeof q.difficulty === "number" ? { difficulty: q.difficulty } : {}),
  };
}

/**
 * One question/knowledge-check → one `quiz` card, or null when it can't be a
 * card (no id, no answerable options). Never throws: a single malformed item
 * must not take a whole domain's feed down with it.
 *
 * @param q      the question or knowledgeCheck object
 * @param scope  {vendorId, trackId, domainId}
 * @param lessonRef  the owning lesson id, or null for a standalone question
 */
export function quizCardFromQuestion(q, scope, lessonRef = null) {
  if (!q || typeof q !== "object" || typeof q.id !== "string") return null;
  const payload = quizPayload(q);
  if (payload.options.length < 2 || payload.correctOptionIds.length === 0) return null;
  const r = validateCard({
    id: q.id,
    type: "quiz",
    locale: q.locale,
    payload,
    source: {
      lessonRef,
      chunkRef: null,
      refs: Array.isArray(q.sourceRefs) ? q.sourceRefs : [],
    },
  }, { scope });
  return r.ok ? r.card : null;
}

/**
 * Every card a domain document yields, in stable serve order:
 *   1. each lesson's knowledge checks, in lesson order  (the "check" beat)
 *   2. the domain's standalone questions                (the "apply" beat)
 *   3. any explicit `cards[]` the document carries      (the factory's output)
 *
 * Explicit cards REPLACE a derived card of the same id in place (order is
 * preserved) and otherwise append. Errors are collected, never thrown — the
 * catalog must keep serving even if one authored card is malformed, and the
 * content validator surfaces the same list pre-merge.
 *
 * @param doc    the domain document (already overlaid, if an override applies)
 * @param scope  {vendorId, trackId, domainId}
 * @returns {{cards: Array, errors: string[]}}
 */
export function cardsFromDomain(doc, scope) {
  if (!doc || typeof doc !== "object") return { cards: [], errors: [] };
  const derived = [];
  for (const lesson of doc.lessons || []) {
    const lessonRef = lesson && typeof lesson.id === "string" ? lesson.id : null;
    for (const kc of (lesson && lesson.knowledgeCheck) || []) {
      const card = quizCardFromQuestion(kc, scope, lessonRef);
      if (card) derived.push(card);
    }
  }
  for (const q of doc.questions || []) {
    const card = quizCardFromQuestion(q, scope, null);
    if (card) derived.push(card);
  }

  const { cards: authored, errors } = validateCards(doc.cards, {
    scope,
    where: `${scope.vendorId}/${scope.trackId}/${scope.domainId}: cards`,
  });

  const byId = new Map();
  for (const c of derived) byId.set(c.id, c); // last derived duplicate wins
  for (const c of authored) byId.set(c.id, c); // authored beats derived
  return { cards: [...byId.values()], errors };
}

/**
 * Track-level cards — the `changelog` / track-wide surfaces a draft can attach
 * to track.json. No derivation here (nothing in track.json is an item today);
 * this is purely the authored seam, kept so LA-11's changelog card has a home
 * that is not a domain.
 */
export function cardsFromTrack(doc, scope) {
  if (!doc || typeof doc !== "object") return { cards: [], errors: [] };
  return validateCards(doc.cards, {
    scope: { vendorId: scope.vendorId, trackId: scope.trackId, domainId: null },
    where: `${scope.vendorId}/${scope.trackId}: cards`,
  });
}

export { DEFAULT_LOCALE };
