// Returning-learner selectors — the data behind home's personal hero.
// Signing in used to feel like starting over: home greeted a six-week regular
// exactly like a first-time visitor. PR #28 answered with a "welcome back"
// strip ABOVE the hero — which read as a second topbar. The strip is gone;
// its data now personalises the hero itself (js/views/home.js renders the
// variant), and this module keeps ONLY selectors — no DOM.
//
// continueData reads the SAME local-first progress the rest of the SPA keeps
// (store.js namespaces — reconcile mirrors server state into those keys for
// signed-in learners, so cross-device progress appears here with zero extra
// requests) and derives the actions that resume a learning loop: continue
// the last track, clear due reviews, sit a mock.
//
// Deliberately CHEAP (home renders on every visit): one localStorage read per
// catalog track (~13), no track-tree fetches. The "Continue" link lands on
// the track page, whose own Resume button already derives the exact next
// lesson from the full tree — deriving it here would cost a fetch per domain
// file for a one-click saving. The reviews link deep-links the most-loaded
// domain when the local q-state knows it; reconciled rows don't carry
// domainId (the wire drops it), so a fresh device falls back to the track
// page rather than inventing a review mode the engine doesn't have.
//
// heroReadiness is the one deliberate exception: the signed-in readiness
// widget needs real mastery, which needs a full tree — so it loads ONE track
// (the most advanced; content.js caches it for the track page the learner is
// about to open anyway) and reuses the profile page's exact math
// (completion + verdict), so home and profile can never disagree. Async —
// home races it against a timeout, the hero never waits on a slow fetch.
//
// Both selectors return null for new visitors and null on ANY internal
// error — a greeting must never be the reason home fails to render.
import { url } from "../router.js";
import { Store } from "../store.js";
import { loadTrack } from "../content.js";
import { isConfigured, user } from "../auth.js";
import { syncStatus } from "../sync/syncer.js";
import { verdict } from "../engine/readiness.js";
import { completion } from "../engine/certificate.js";

// newest activity timestamp in one track's raw state — lessons store bare
// completedAt millis; questions/exams/scenarios store records with `at`
function lastActiveAt(s) {
  let t = 0;
  for (const at of Object.values(s.lessons || {})) t = Math.max(t, at || 0);
  for (const r of Object.values(s.q || {})) t = Math.max(t, (r && r.at) || 0);
  for (const e of s.exams || []) t = Math.max(t, (e && e.at) || 0);
  for (const r of Object.values(s.scenarios || {})) t = Math.max(t, (r && r.at) || 0);
  return t;
}

// due-review count + the single most-loaded domain (for the quiz deep link)
function dueSummary(s, now) {
  let due = 0;
  const byDomain = {};
  for (const r of Object.values(s.q || {})) {
    if (!r || !r.due || r.due > now) continue;
    due += 1;
    if (r.domainId) byDomain[r.domainId] = (byDomain[r.domainId] || 0) + 1;
  }
  const top = Object.entries(byDomain).sort((a, b) => b[1] - a[1])[0];
  return { due, domainId: top ? top[0] : null };
}

// server-computed streak, read exactly the way profile.js reads it — no local
// reinvention. Signed out (or before the first sync) there is none: skip.
function streakDays() {
  try {
    if (!isConfigured() || !user()) return 0;
    const p = syncStatus().profile;
    return p && p.streak && p.streak.current > 0 ? p.streak.current : 0;
  } catch (_) {
    return 0;
  }
}

function gatherStarted(cat, now) {
  const started = [];
  for (const vend of (cat && cat.vendors) || []) {
    for (const t of vend.tracks || []) {
      const s = new Store(vend.id, t.trackId).s; // one localStorage read
      const at = lastActiveAt(s);
      if (!at) continue; // untouched track
      const { due, domainId } = dueSummary(s, now);
      started.push({
        vendorId: vend.id,
        trackId: t.trackId,
        name: t.name,
        code: t.code || null,
        at,
        due,
        dueDomainId: domainId,
        answered: Object.keys(s.q || {}).length,
        hasExam: !!(t.exam && t.exam.questionCount),
      });
    }
  }
  return started;
}

function build(cat) {
  const now = Date.now();
  const started = gatherStarted(cat, now);
  if (!started.length) return null; // new visitor — home stays exactly as it was

  const latest = started.reduce((a, b) => (b.at > a.at ? b : a));
  const dueTotal = started.reduce((n, t) => n + t.due, 0);
  const mostDue = started.reduce((a, b) => (b.due > a.due ? b : a));
  // "most advanced" track = most distinct questions answered — cheap, and
  // monotone with real progress (mastery would need the full trees)
  const byAnswered = started.slice().sort((a, b) => b.answered - a.answered);
  const mockTrack = byAnswered.find((t) => t.hasExam) || null;

  const u = isConfigured() ? user() : null;

  // Continue always; reviews only when something is actually due; mock only
  // when a started track carries an exam block. Hrefs are final hash targets.
  return {
    signedIn: !!u,
    first: u && u.name ? u.name.trim().split(/\s+/)[0] : "",
    streak: streakDays(),
    latest: { name: latest.name, href: "#" + url.track(latest.vendorId, latest.trackId) },
    reviews: dueTotal > 0
      ? {
          count: dueTotal,
          href: "#" + (mostDue.dueDomainId
            ? url.quiz(mostDue.vendorId, mostDue.trackId, mostDue.dueDomainId)
            : url.track(mostDue.vendorId, mostDue.trackId)),
        }
      : null,
    mock: mockTrack ? { href: "#" + url.exam(mockTrack.vendorId, mockTrack.trackId) } : null,
    top: byAnswered[0], // most-advanced started track (readiness widget)
  };
}

/** Returning-learner data, or null (no progress / any internal error). Never throws. */
export function continueData(cat) {
  try {
    return build(cat);
  } catch (e) {
    console.warn("[continue] selectors skipped:", (e && e.message) || e);
    return null;
  }
}

/**
 * Readiness of the most-advanced started track — { pct, code, skills } or
 * null. One (session-cached) tree fetch; the profile page's exact
 * completion/verdict math. Never throws.
 */
export async function heroReadiness(cont) {
  try {
    const top = cont && cont.top;
    if (!top) return null;
    const track = await loadTrack(top.vendorId, top.trackId);
    const store = new Store(top.vendorId, top.trackId);
    const comp = completion(track, store, verdict);
    const skills = comp.kind === "skills";
    const pct = Math.round((skills ? comp.pct : comp.verdict.overall.mastery) * 100);
    return { pct, code: track.code || top.code || top.trackId, skills };
  } catch (e) {
    console.warn("[continue] readiness widget skipped:", (e && e.message) || e);
    return null;
  }
}
