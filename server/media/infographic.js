// Infographic payload → render parameters (PRD-WAVE-LIVING-ACADEMY LA-9).
//
// Lane 2's pure half. The renderer is a browser screenshotting an HTML page,
// which is untestable without a browser — so everything that can be decided
// WITHOUT one is decided here, where a node test can reach it: what the slot
// is called, what text survives, and whether a payload can be drawn at all.
//
// FR-5 says renderers are deterministic (same payload → same output). That
// only holds if the payload is normalised the same way every time, so this
// module is pure, sorts nothing by chance, and never reads a clock.
//
// The ceilings below are the "stats grid blowout" lesson from the social
// templates: a card whose text does not fit does not fail, it renders WRONG,
// and a wrong card is worse than a missing one because it still gets served.
// So an over-long payload is REJECTED here rather than clipped at draw time.

/** portrait card — the same 4:5 the social plane calls ig_post */
export const INFOGRAPHIC_SIZE = { w: 1080, h: 1350 };

export const INFOGRAPHIC_LIMITS = {
  titleMax: 68,
  eyebrowMax: 24,
  pointMax: 88,
  minPoints: 2,
  maxPoints: 5,
  sourceMax: 72,
};

const clean = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();

/**
 * The slot an infographic binds to: `ig-<domainId>-<n>`, 1-based.
 *
 * Domain ids are already slugs in the catalog, so this needs no escaping —
 * but it is asserted rather than assumed, because a slot id with a slash in
 * it would escape the `academy/<vendor>/<track>/` key prefix that the presign
 * path locks writes to.
 */
export function infographicSlotId(domainId, index) {
  const id = clean(domainId);
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) return null;
  const n = Number(index);
  if (!Number.isInteger(n) || n < 1 || n > 99) return null;
  return `ig-${id}-${n}`;
}

/**
 * Normalise a verified draft payload into render parameters.
 *
 * @returns { ok:true, params } | { ok:false, error, note? }
 */
export function toRenderParams(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "bad_payload" };
  }
  const L = INFOGRAPHIC_LIMITS;

  const title = clean(payload.title);
  if (!title) return { ok: false, error: "title_required" };
  if (title.length > L.titleMax) {
    return { ok: false, error: "title_too_long", note: `${title.length} > ${L.titleMax}` };
  }

  const rawPoints = Array.isArray(payload.points) ? payload.points : [];
  const points = rawPoints.map(clean).filter((p) => p.length > 0);
  if (points.length < L.minPoints) {
    return { ok: false, error: "too_few_points", note: `${points.length} < ${L.minPoints}` };
  }
  if (points.length > L.maxPoints) {
    return { ok: false, error: "too_many_points", note: `${points.length} > ${L.maxPoints}` };
  }
  const over = points.find((p) => p.length > L.pointMax);
  if (over) return { ok: false, error: "point_too_long", note: `"${over.slice(0, 40)}…"` };

  // Eyebrow and source are optional chrome. An infographic with no cited
  // source still renders — the CARD's provenance strip is what carries the
  // grounding claim, and duplicating it into the pixels would let the two
  // disagree after an approved revision.
  const eyebrow = clean(payload.eyebrow).slice(0, L.eyebrowMax);
  const source = clean(payload.source).slice(0, L.sourceMax);

  return { ok: true, params: { title, points, eyebrow, source, ...INFOGRAPHIC_SIZE } };
}

/** render params → the renderer's URL query. Key order is fixed so the same
 *  payload always produces the same URL, and therefore the same PNG. */
export function toRenderQuery(params) {
  const q = new URLSearchParams();
  q.set("title", params.title);
  q.set("points", JSON.stringify(params.points));
  if (params.eyebrow) q.set("eyebrow", params.eyebrow);
  if (params.source) q.set("source", params.source);
  return q.toString();
}
