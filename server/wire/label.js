// The mandatory transparency label (PRD-WIRE goal 4, D-W5 decided (c)
// degrading to (b)): while the D-W1 review-first launch mode is active the
// label claims human review, because it is true; the moment auto-publish
// flips (WIRE_PUBLISH_POLICY=auto) the "reviewed by a human" clause comes off
// — the label must never claim review that isn't happening.
//
// The string ships to readers THROUGH the API (`transparency` on the public
// GETs) and the RSS <subtitle>, so the copy lives here once and every surface
// — SPA views today, shells in S3 — renders it verbatim without knowing the
// publish policy.

const LABEL_BASE = "Researched and written by Automatos agents · every claim linked to its source";
const LABEL_REVIEWED = `${LABEL_BASE} · reviewed by a human`;

export const transparencyLabel = (publishPolicy) =>
  publishPolicy === "auto" ? LABEL_BASE : LABEL_REVIEWED;
