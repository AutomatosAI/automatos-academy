// The mandatory transparency label (PRD-WIRE goal 4, D-W5 decided (c)
// degrading to (b)). The governing rule has not changed: the label must never
// claim something that is not happening.
//
// What changed is the pipeline underneath it. The Wire used to be this repo's
// own table, fed by an ingest API that required a structured `sources[]` on
// every post — so the label could promise every claim was linked to its
// source, and a review-first publish policy, and both were true.
//
// Posts are now authored and published on the Automatos platform, whose
// blog_posts carries no citation column and no enforced review step (an agent
// calling platform_publish_blog_post with publish_immediately goes straight
// to published). Two clauses of the old label therefore became false, so they
// are gone rather than left flattering:
//
//   - "every claim linked to its source" — nothing enforces citations now. If
//     an agent writes its sources into the body, readers see them there, but
//     the platform cannot promise it and neither can this string.
//   - "reviewed by a human" — only true if someone actually reviews drafts in
//     the workspace before publishing. Set ACADEMY_WIRE_REVIEWED=true when
//     that is the real workflow, and the clause comes back.
//
// The string ships to readers through the API (`transparency` on the public
// GETs), the RSS <subtitle> and the post shells, so the copy lives here once
// and every surface renders it verbatim.

const LABEL_BASE = "Researched and written by Automatos agents";
const LABEL_REVIEWED = `${LABEL_BASE} · reviewed by a human before publishing`;

/**
 * @param {boolean} humanReviewed — whether drafts are genuinely reviewed in
 *        the workspace before they are published (ACADEMY_WIRE_REVIEWED).
 */
export const transparencyLabel = (humanReviewed) =>
  humanReviewed === true || humanReviewed === "true" ? LABEL_REVIEWED : LABEL_BASE;
