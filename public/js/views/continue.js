// "Welcome back" continue strip — the returning learner's front door on home.
// Signing in used to feel like starting over: home greeted a six-week regular
// exactly like a first-time visitor. This strip reads the SAME local-first
// progress the rest of the SPA keeps (store.js namespaces — reconcile mirrors
// server state into those keys for signed-in learners, so cross-device
// progress appears here with zero extra requests) and offers the actions that
// resume a learning loop: continue the last track, clear due reviews, sit a
// mock.
//
// Deliberately CHEAP (home renders on every visit): one localStorage read per
// catalog track (~13), no track-tree fetches. The "Continue" pill lands on
// the track page, whose own Resume button already derives the exact next
// lesson from the full tree — deriving it here would cost a fetch per domain
// file for a one-click saving. The quiz pill deep-links the most-loaded
// domain when the local q-state knows it; reconciled rows don't carry
// domainId (the wire drops it), so a fresh device falls back to the track
// page rather than inventing a review mode the engine doesn't have.
//
// Returns null for new visitors (home unchanged) and null on ANY internal
// error — a greeting must never be the reason home fails to render.
import { el } from "../ui.js";
import { url } from "../router.js";
import { Store } from "../store.js";
import { isConfigured, user } from "../auth.js";
import { syncStatus } from "../sync/syncer.js";

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
  // "most advanced" exam track = most distinct questions answered — cheap,
  // and monotone with real progress (mastery would need the full trees)
  const mockTrack = started.filter((t) => t.hasExam).sort((a, b) => b.answered - a.answered)[0] || null;

  // pills — Continue always; reviews only when something is actually due;
  // mock only when a started track carries an exam block
  const pills = [
    el("a", { class: "continue-pill is-primary", href: "#" + url.track(latest.vendorId, latest.trackId) }, [
      "Continue ", el("span", { class: "tname", text: latest.name }), " →",
    ]),
  ];
  if (dueTotal > 0) {
    const href = mostDue.dueDomainId
      ? url.quiz(mostDue.vendorId, mostDue.trackId, mostDue.dueDomainId)
      : url.track(mostDue.vendorId, mostDue.trackId);
    pills.push(el("a", { class: "continue-pill", href: "#" + href }, [
      el("b", { text: String(dueTotal) }), ` review${dueTotal === 1 ? "" : "s"} due · Quick practice`,
    ]));
  }
  if (mockTrack) {
    pills.push(el("a", { class: "continue-pill", href: "#" + url.exam(mockTrack.vendorId, mockTrack.trackId) }, ["Take a mock"]));
  }

  const u = isConfigured() ? user() : null;
  const first = u && u.name ? u.name.trim().split(/\s+/)[0] : "";
  const streak = streakDays();

  return el("section", { class: "continue-band", "aria-label": "Pick up where you left off" }, [
    el("div", { class: "wrap" }, [el("div", { class: "continue-strip" }, [
      el("div", { class: "continue-hello" }, [
        el("span", { class: "serif-i", text: first ? `Welcome back, ${first}.` : "Welcome back." }),
        streak ? el("span", { class: "continue-chip", text: `${streak}-day streak` }) : null,
      ]),
      el("div", { class: "continue-actions" }, pills),
    ])]),
  ]);
}

/** The strip, or null (no progress / any internal error). Never throws. */
export function continueStrip(cat) {
  try {
    return build(cat);
  } catch (e) {
    console.warn("[continue] strip skipped:", (e && e.message) || e);
    return null;
  }
}
