// The Today/pacing line (PRD-WEB-LOOP §4.1, D-WL2) — one line, two homes:
// under the personal hero's chips row (.ac-hero__pace) and under the
// readiness verdict, mirrored beside where the date is set. The line is a
// verdict, not decoration — NOT a floating widget. Data arrives normalized
// (views/continue.js heroPace or views/readiness.js build it):
//   { verdict, dueTotal, requiredPerDay?, dateLabel?, setHref? }
// No exam date ⇒ no verdict, ever — just the due count and (when the caller
// passes setHref) a quiet "Set your exam date →" link to readiness.

import { el } from "../ui.js";
import { paceLineCopy } from "../engine/pace.js";
import { track as tk } from "../analytics.js";

export function paceLine(data, { surface, hero } = {}) {
  if (!data || !data.verdict) return null;
  const copy = paceLineCopy(data.verdict, data.dueTotal, data.requiredPerDay, data.dateLabel);
  const kids = [el("b", { text: copy.count })];
  if (copy.verdict) kids.push(` · ${copy.verdict}`);
  else if (data.setHref) kids.push(" · ", el("a", { href: data.setHref, text: "Set your exam date →" }));
  tk("pace_line_shown", { verdict: data.verdict, surface });
  return el("p", { class: "pace-line" + (hero ? " ac-hero__pace" : "") }, kids);
}
