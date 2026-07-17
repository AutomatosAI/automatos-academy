// The shared next-step selector (PRD-WEB-LOOP §4.4) — every completion
// surface (lesson · quiz · exam · scenario) asks the same question: what is
// the next SMALLEST step? Candidates come back ordered:
//   due reviews → next lesson in scope → weakest-domain drill → done-for-today
// Pure over (track, store) — no fetches, one pass over local state (the
// continueData discipline) — null-safe, and it never throws: permission to
// stop is always the last candidate, whatever breaks above it.
//
// The closing line is the only impure edge: it may read the SERVER streak
// (syncStatus — the same read continue.js and profile.js use). Signed out it
// is a plain "Done for today ✓" — never an invented streak (real numbers
// only, the WAVE-ENGAGEMENT invariant).

import { el } from "../ui.js";
import { url } from "../router.js";
import { verdict } from "../engine/readiness.js";
import { isSkillsTrack } from "../engine/certificate.js";
import { isConfigured, user } from "../auth.js";
import { syncStatus } from "../sync/syncer.js";

/** the profile page's honest flat cost per review — reused for "~N min" */
const ATTEMPT_SECONDS = 45;

/**
 * Due count + the single most-loaded domain over one track's raw q-state —
 * THE dueSummary math (continue.js imports this same function for the hero
 * chips, so the hero and the end-states can never disagree).
 */
export function dueSummary(s, now) {
  let due = 0;
  const byDomain = {};
  for (const r of Object.values((s && s.q) || {})) {
    if (!r || !r.due || r.due > now) continue;
    due += 1;
    if (r.domainId) byDomain[r.domainId] = (byDomain[r.domainId] || 0) + 1;
  }
  const top = Object.entries(byDomain).sort((a, b) => b[1] - a[1])[0];
  return { due, domainId: top ? top[0] : null };
}

/**
 * nextStep({ track, store, domainId?, now? }) → ordered candidates
 * [{kind, …}]. domainId narrows the next-lesson search to one domain (the
 * quiz surface's scope); without it the whole track is walked in order.
 * Always ends with {kind: "done"}.
 */
export function nextStep(ctx) {
  const out = [];
  try {
    const { track, store, domainId } = ctx || {};
    const now = (ctx && ctx.now) || Date.now();
    const v = track && track.vendorId, t = track && track.trackId;
    if (track && store && v && t) {
      // 1 · due reviews — the queue is the plan
      const { due, domainId: topDue } = dueSummary(store.s, now);
      if (due > 0) {
        out.push({
          kind: "due",
          count: due,
          minutes: Math.max(1, Math.round((due * ATTEMPT_SECONDS) / 60)),
          href: "#" + (topDue ? url.quiz(v, t, topDue) : url.track(v, t)),
        });
      }
      // 2 · next unstarted lesson in scope
      const scope = domainId
        ? (track.domains || []).filter((d) => d.id === domainId)
        : track.domains || [];
      for (const d of scope) {
        const l = (d.lessons || []).find((x) => !store.lessonDone(x.id));
        if (l) {
          out.push({ kind: "lesson", title: l.title, href: "#" + url.lesson(v, t, d.id, l.id), domainId: d.id });
          break;
        }
      }
      // 3 · weakest-domain drill — exam tracks only, readiness' own framing
      if (!isSkillsTrack(track)) {
        const w = verdict(track, store).weakest;
        if (w) out.push({ kind: "drill", name: w.name, href: "#" + url.quiz(v, t, w.id) });
      }
    }
  } catch (_) { /* a next step must never break a finish panel */ }
  out.push({ kind: "done" }); // permission to stop is always a candidate
  return out;
}

/** the closing line — a real server streak, or a plain ✓ (never invented) */
export function closingLine(streak) {
  return streak > 0 ? `Done for today — ${streak}-day streak safe.` : "Done for today ✓";
}

/**
 * Server-computed streak (0 signed-out / pre-first-sync / any trouble) —
 * exactly the read continue.js and profile.js already use.
 */
export function serverStreak() {
  try {
    if (!isConfigured() || !user()) return 0;
    const p = syncStatus().profile;
    return p && p.streak && p.streak.current > 0 ? p.streak.current : 0;
  } catch (_) {
    return 0;
  }
}

/** the closing line as a house end-note element */
export function doneLine() {
  return el("p", { class: "end-note", text: closingLine(serverStreak()) });
}

/**
 * The §4.4 composition point the lesson/exam surfaces share: one quiet line —
 * the due pull when something is due, else the closing line. Surfaces with
 * their own shape (quiz's lead button, scenario's closing-only debrief)
 * compose from nextStep/doneLine directly.
 */
export function endNote(cands) {
  const due = (cands || []).find((c) => c.kind === "due");
  if (due) {
    return el("p", { class: "end-note" }, [
      el("a", { href: due.href, text: `${due.count} review${due.count === 1 ? "" : "s"} due (~${due.minutes} min) →` }),
    ]);
  }
  return doneLine();
}
