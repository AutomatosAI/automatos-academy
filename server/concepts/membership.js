// Concept membership (PRD-WAVE-LIVING-ACADEMY LA-2) — which content items sit
// under which concept key, derived from the served content index.
//
// This is the bridge between "what the catalog serves" and "what the Spine
// rolls up": the same index `server/catalog.js` builds, walked once into a
// map the rollup can hit per user without re-walking the tree. Pure over the
// index, cached by index identity (a WeakMap — the db loader swaps the whole
// index object on refresh, so a new index simply gets a new entry and the old
// one is collected).
//
// Membership rules, stated once:
//   • A LESSON concept holds the lesson id (coverage) plus its knowledge-check
//     ids (knowledge). Those checks are real progress items — the app records
//     them into the same spaced-repetition bank as standalone questions.
//   • A DOMAIN concept holds every lesson, every knowledge check, and every
//     standalone question beneath it.
//   • A TRACK concept holds the union of its domains.
// Every concept therefore contains its descendants, so a rollup is a single
// pass and a lesson miss shows up in its domain's numbers too.

import { conceptKey } from "./keys.js";

const CACHE = new WeakMap(); // index → Map(conceptKey → member)

const emptyMember = (key, trackKey, level) => ({
  conceptKey: key, trackKey, level,
  lessonIds: [], questionIds: [],
});

/**
 * Build the whole membership map for a content index.
 * @returns {Map<string, {conceptKey, trackKey, level, lessonIds, questionIds}>}
 */
export function buildMembership(index) {
  const cached = CACHE.get(index);
  if (cached) return cached;

  const map = new Map();
  const member = (key, trackKey, level) => {
    let m = map.get(key);
    if (!m) { m = emptyMember(key, trackKey, level); map.set(key, m); }
    return m;
  };

  for (const [trackKey, entry] of index.tracks) {
    const [vendorId, trackId] = trackKey.split("/");
    const trackConcept = conceptKey({ vendorId, trackId });
    if (!trackConcept) continue;
    const track = member(trackConcept, trackKey, "track");

    for (const [domainId, d] of entry.domains) {
      const domainConcept = conceptKey({ vendorId, trackId, domainId });
      if (!domainConcept) continue;
      const domain = member(domainConcept, trackKey, "domain");

      for (const lesson of d.data.lessons || []) {
        if (!lesson || typeof lesson.id !== "string") continue;
        const lessonConcept = conceptKey({ vendorId, trackId, domainId, lessonRef: lesson.id });
        const targets = lessonConcept ? [member(lessonConcept, trackKey, "lesson"), domain, track] : [domain, track];
        for (const t of targets) t.lessonIds.push(lesson.id);
        for (const kc of lesson.knowledgeCheck || []) {
          if (!kc || typeof kc.id !== "string") continue;
          for (const t of targets) t.questionIds.push(kc.id);
        }
      }

      for (const q of d.data.questions || []) {
        if (!q || typeof q.id !== "string") continue;
        domain.questionIds.push(q.id);
        track.questionIds.push(q.id);
      }
    }
  }

  CACHE.set(index, map);
  return map;
}

/** Every concept belonging to one track, as `Map(conceptKey → member)`. */
export function membershipForTrack(index, trackKey) {
  const all = buildMembership(index);
  const out = new Map();
  for (const [key, m] of all) if (m.trackKey === trackKey) out.set(key, m);
  return out;
}

/** Every item id a concept contains — the set a rollup needs rows for. */
export const memberItemIds = (m) => [...m.lessonIds, ...m.questionIds];
