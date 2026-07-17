// Profile (#/profile — PRD-U2 S4, decision D-U4a: REAL DATA ONLY). One page,
// four stories: who you are (Clerk identity + member-since), what your whole
// learning life adds up to (the hero strip — time invested, lessons covered,
// questions answered, the server-derived streak), how ready you are
// (per-track readiness reusing readiness.js/certificate.js over the local
// store — the SAME math and the same store the rest of the SPA reads, zero
// forked computation; reconcile keeps that store in step with other devices),
// and your rights over your data (export / delete, §4.4 — typed in-page
// confirmations, no window.confirm, wipes routed through the queue's clearAll
// seam; since the account menu slimmed down, this section is the ONLY home
// of export/delete).
//
// "Time invested" is an estimate and says so (the ≈ and the caption):
//   Σ estMinutes over completed lessons
//   + 45 s per recorded answer (every q.seen is one attempt)
//   + mocks sat × the track's exam.durationMinutes.
// Every number derives from the store the learner can export — no invented
// telemetry (D-U4a). Signed out, the numbers are this device's numbers.
//
// The mastery + coverage bars ride the .fillbar reveal system and the hero
// numbers ride the [data-count] count-up (anim.js): both animate on first
// view and render instantly under prefers-reduced-motion.
//
// Signed out this page is a local-only mirror plus a quiet sign-in nudge —
// never a wall (PRD-U2 goal 2). Cold start (no progress anywhere) gets an
// invitation in the hero's own voice, not a wall of zeros.
import { el, ring, seal } from "../ui.js";
import { url } from "../router.js";
import { loadCatalog, loadTrack } from "../content.js";
import { Store } from "../store.js";
import { verdict, domainStats } from "../engine/readiness.js";
import { isSkillsTrack, completion } from "../engine/certificate.js";
import { isConfigured, user, openSignIn } from "../auth.js";
import { syncStatus, syncNow } from "../sync/syncer.js";
import { maybeOfferBackfill } from "../sync/backfill.js";
import { exportMyData, deleteMyData, deleteMyAccount } from "../sync/account.js";
import { getExamDate, examDateLabel } from "../exam-date.js";

const signedIn = () => isConfigured() && !!user();
const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

const hasData = (s) =>
  Object.keys(s.q || {}).length > 0 || (s.exams || []).length > 0 ||
  Object.keys(s.scenarios || {}).length > 0 || Object.keys(s.lessons || {}).length > 0;

// ── identity header ──────────────────────────────────────────────────────
function avatar(u) {
  if (u && u.imageUrl) return el("img", { class: "profile-avatar-img", src: u.imageUrl, alt: "", referrerpolicy: "no-referrer" });
  const letter = ((u && (u.name || u.email)) || "?").trim().charAt(0).toUpperCase() || "?";
  return el("span", { class: "profile-avatar-initial", "aria-hidden": "true", text: letter });
}

function identityHead(status) {
  const u = user();
  if (!u) {
    return el("div", { class: "profile-head" }, [
      el("div", { class: "profile-avatar" }, [avatar(null)]),
      el("div", {}, [
        el("span", { class: "mono-label", text: "Your profile" }),
        el("h1", { text: "This device's progress" }),
        el("p", { class: "muted", style: { maxWidth: "56ch", marginTop: "8px" }, text: "Everything below lives in this browser only. Sign in to keep one profile — progress, streak and mock history — across web and mobile." }),
        el("button", { class: "ac-btn ac-btn-solid", type: "button", style: { marginTop: "14px" }, onClick: () => openSignIn() }, ["Sign in"]),
      ]),
    ]);
  }
  const p = status.profile || {};
  const memberSince = p.user && p.user.createdAt ? new Date(p.user.createdAt) : null;
  return el("div", { class: "profile-head" }, [
    el("div", { class: "profile-avatar" }, [avatar(u)]),
    el("div", {}, [
      el("span", { class: "mono-label", text: "Your profile" }),
      el("h1", { text: u.name || u.email || "Learner" }),
      el("p", { class: "muted", style: { marginTop: "6px" }, text: [
        u.email,
        memberSince ? `member since ${memberSince.toLocaleDateString(undefined, { year: "numeric", month: "long" })}` : null,
      ].filter(Boolean).join(" · ") }),
    ]),
  ]);
}

// ── hero stats — the whole learning life in four count-up tiles ──────────
// The old standalone streak panel folded into tile 4: current streak is the
// number, best streak moves to the caption, and "last synced" already lives
// in the "Your data" section — nothing was lost, one panel was.
const ATTEMPT_SECONDS = 45; // honest flat cost per recorded answer (see header)

function heroTotals(entries) {
  let minutes = 0, lessonsDone = 0, lessonsTotal = 0, qDistinct = 0, qAttempts = 0;
  for (const { track, store } of entries) {
    for (const d of track.domains) {
      for (const l of d.lessons || []) {
        lessonsTotal++;
        if (store.lessonDone(l.id)) { lessonsDone++; minutes += l.estMinutes || 0; }
      }
    }
    // raw store, not tree-gated: they DID answer these, even if content moved
    for (const r of Object.values(store.s.q || {})) { qDistinct++; qAttempts += r.seen || 0; }
    minutes += (store.s.exams || []).length * ((track.exam && track.exam.durationMinutes) || 0);
  }
  minutes += (qAttempts * ATTEMPT_SECONDS) / 60;
  return { minutes: Math.round(minutes), lessonsDone, lessonsTotal, qDistinct, qAttempts };
}

// anim.js tweens [data-count] the first time it scrolls into view (and just
// prints the final value under prefers-reduced-motion).
const countTo = (n, attrs = {}) => el("span", { "data-count": String(n), ...attrs });

// "≈ 12h 40m" as two count-up spans (the tween only animates one number, so
// hours and minutes each get their own).
function timeValue(mins) {
  if (mins < 60) return el("b", {}, [countTo(mins, { "data-prefix": "≈ ", "data-suffix": "m" })]);
  const h = Math.floor(mins / 60), m = mins % 60;
  return el("b", {}, [
    countTo(h, { "data-prefix": "≈ ", "data-suffix": "h" }),
    m ? " " : null,
    m ? countTo(m, { "data-suffix": "m" }) : null,
  ]);
}

function statTile(value, label, caption) {
  return el("div", { class: "profile-stat" }, [
    value,
    el("span", { class: "mono-label", text: label }),
    caption ? el("p", { class: "cap", text: caption }) : null,
  ]);
}

function heroStats(entries, status) {
  const t = heroTotals(entries);
  const streak = signedIn() && status.profile ? status.profile.streak : null;
  const n = entries.length;

  const lessons = el("b", {}, [countTo(t.lessonsDone), el("span", { class: "of", text: ` / ${t.lessonsTotal}` })]);
  const streakVal = streak ? el("b", {}, [countTo(streak.current)]) : el("b", { text: "—" });
  const streakCap = streak
    ? `best ${streak.best} · counted in UTC, across your devices`
    : (signedIn() ? "appears after your first sync" : "sign in to keep a streak across devices");

  return el("div", { class: "profile-stats" }, [
    statTile(timeValue(t.minutes), "Time invested", "estimated from lessons, reviews and mock exams"),
    statTile(lessons, "Lessons completed", `across ${n} started track${n === 1 ? "" : "s"}`),
    statTile(el("b", {}, [countTo(t.qDistinct)]), "Questions answered", `${t.qAttempts.toLocaleString()} attempt${t.qAttempts === 1 ? "" : "s"} in total`),
    statTile(streakVal, "Day streak", streakCap),
  ]);
}

// ── per-track readiness (readiness.js math over the local store) ─────────
// grade → its band colour token (same buckets as ui.js sealClass — tolerant
// of the ± grades verdict() can produce, unlike an exact-match ternary)
const gradeTone = (g) => {
  const U = (g || "").toUpperCase();
  const key = U === "A+" ? "aplus" : U.startsWith("A") ? "a" : U.startsWith("B") ? "b" : U === "C" ? "c" : U === "D" ? "d" : "f";
  return `var(--grade-${key})`;
};

// Coverage — "what have I actually covered?" — lessons and distinct
// questions over the track totals, aggregated from the SAME domainStats the
// mastery bars use (tree-gated, so x can never exceed y).
function coverageLines(track, store) {
  let lDone = 0, lTot = 0, qDone = 0, qTot = 0;
  for (const d of track.domains) {
    const st = domainStats(d, store);
    lDone += st.lessonsDone; lTot += st.lessonsTotal;
    qDone += st.distinct;    qTot += st.poolSize;
  }
  if (!lTot && !qTot) return null;
  const row = (label, done, total) => {
    const bar = el("div", { class: "fillbar" }, [el("i")]);
    bar.style.setProperty("--fill", Math.round((done / total) * 100) + "%");
    return el("div", { class: "profile-cover-row" }, [
      el("span", { class: "mono-label", text: label }),
      el("span", { class: "profile-cover-count", text: `${done}/${total}` }),
      bar,
    ]);
  };
  return el("div", { class: "profile-cover" }, [
    lTot ? row("Lessons", lDone, lTot) : null,
    qTot ? row("Questions practised", qDone, qTot) : null,
  ]);
}

function masteryBars(track, store) {
  return el("div", { class: "profile-bars" }, track.domains.map((d) => {
    const st = domainStats(d, store);
    const pct = Math.round((isSkillsTrack(track) ? st.coverage : st.mastery) * 100);
    // custom properties need setProperty (style-object indexing is not
    // portable for --vars) — anim.js then reveals the bar to var(--fill)
    const bar = el("div", { class: "fillbar" }, [el("i")]);
    bar.style.setProperty("--fill", pct + "%");
    return el("div", { class: "profile-bar-row" }, [
      el("span", { class: "mono-label", text: d.code || d.name }),
      el("span", { class: "profile-bar-pct", text: pct + "%" }),
      bar,
    ]);
  }));
}

function mockHistory(store) {
  const exams = (store.s.exams || []).slice(-5).reverse();
  if (!exams.length) return el("p", { class: "muted", style: { fontSize: "13px" }, text: "No mock exams sat yet." });
  return el("div", { class: "profile-mocks" }, exams.map((e) =>
    el("div", { class: "profile-mock-row" }, [
      el("b", { text: String(e.scaled) }),
      el("span", { class: "mono-label", text: e.passed ? "passed" : "not passed" }),
      el("span", { class: "mono-label", text: e.at ? fmtDate(e.at) : "" }),
    ])
  ));
}

function credentialLine(track, comp) {
  // No local claim registry exists (certificate.js stores only the claim
  // name) — so this is the claim ENTRY POINT, never an invented history.
  if (!comp.complete) return null;
  return el("p", { class: "profile-cred" }, [
    el("span", { class: "mono-label", text: "Badge earned — " }),
    el("a", { href: "#" + url.readiness(track.vendorId, track.trackId), text: "claim your certificate →" }),
  ]);
}

function trackPanel(track, store) {
  const skills = isSkillsTrack(track);
  const comp = completion(track, store, verdict);
  const scnTotal = track.domains.reduce((n, d) => n + (d.scenarios || []).length, 0);
  const scnDone = Object.keys(store.s.scenarios || {}).length;

  let ringPct, ringGrade = null, gradeSeal = null, headline;
  if (skills) {
    ringPct = Math.round(comp.pct * 100); // no exam → the ring keeps its %
    headline = `${comp.done} of ${comp.total} lessons done`;
  } else {
    const v = comp.verdict;
    ringPct = Math.round(v.overall.mastery * 100);
    ringGrade = v.grade;
    // the seal is EARNED — it appears once a full mock is passed. Until then
    // the ring's grade letter tells the story (no F stamped on day one; the
    // headline already says "not yet qualified" in words).
    if (store.bestPassedMock()) gradeSeal = seal(v.grade, v.qualified ? "Qualified" : "Readiness", "sm");
    headline = v.headline;
  }

  const readinessRing = ring(ringPct);
  readinessRing.style.setProperty("--p", String(Math.max(0, Math.min(100, Math.round(ringPct))))); // custom props need setProperty — style-object indexing is not portable
  if (ringGrade) {
    // readiness fill stays the %, the centred label becomes the grade letter
    const label = readinessRing.querySelector("span");
    label.textContent = ringGrade;
    label.style.color = gradeTone(ringGrade);
    readinessRing.setAttribute("role", "img");
    readinessRing.setAttribute("aria-label", `${ringPct}% readiness — grade ${ringGrade}`);
  }

  // PRD-WEB-LOOP §4.1: the exam date is SET on the readiness view; here it
  // mirrors read-only (skills tracks have no exam to date).
  const examIso = skills ? null : getExamDate(track.vendorId, track.trackId);

  return el("div", { class: "panel profile-track" }, [
    el("div", { class: "profile-track-head" }, [
      readinessRing,
      el("div", { class: "profile-track-title" }, [
        el("span", { class: "mono-label", text: `${track.vendorName || track.vendorId} · ${track.code || track.trackId}` }),
        el("h3", {}, [el("a", { href: "#" + url.track(track.vendorId, track.trackId), text: track.name })]),
        el("p", { class: "muted", style: { fontSize: "13px" }, text: headline }),
        examIso ? el("p", { class: "muted", style: { fontSize: "12.5px", marginTop: "2px" } }, [
          `Exam date: ${examDateLabel(examIso, { long: true })} · `,
          el("a", { href: "#" + url.readiness(track.vendorId, track.trackId), text: "change on readiness" }),
        ]) : null,
      ]),
      gradeSeal,
    ]),
    coverageLines(track, store),
    el("div", { class: "profile-mastery" }, [
      el("span", { class: "mono-label", text: skills ? "Progress by module group" : "Mastery by domain" }),
      masteryBars(track, store),
    ]),
    el("div", { class: "profile-track-cols" }, [
      el("div", {}, [
        el("span", { class: "mono-label", text: "Mock exams" }),
        mockHistory(store),
      ]),
      el("div", {}, [
        el("span", { class: "mono-label", text: "Scenarios" }),
        el("p", { class: "muted", style: { fontSize: "13px" }, text: scnTotal ? `${Math.min(scnDone, scnTotal)} of ${scnTotal} scenario${scnTotal === 1 ? "" : "s"} run` : (scnDone ? `${scnDone} run` : "None run yet") }),
      ]),
    ]),
    credentialLine(track, comp),
  ]);
}

// One walk over the catalog: every STARTED track (local data present) gets
// its full tree loaded once, and that single list feeds the hero totals and
// the per-track panels alike — the same numbers, computed from the same trees.
async function gatherStarted() {
  const cat = await loadCatalog(); // throws → caller renders the honest error
  const entries = [];
  for (const vend of cat.vendors || []) {
    for (const t of vend.tracks || []) {
      // Cheap local check first; only tracks with data fetch their full tree.
      const store = new Store(vend.id, t.trackId);
      if (!hasData(store.s)) continue;
      try {
        entries.push({ track: await loadTrack(vend.id, t.trackId), store });
      } catch (_) { /* content unavailable — skip, the data stays local */ }
    }
  }
  return entries;
}

// ── cold start — an invitation, not a wall of zeros ──────────────────────
// The same brain as the landing hero (already-cached /img/brain.png), radially
// masked into the periwinkle by CSS — zero new assets, no motion to gate.
function emptyState() {
  return el("div", { class: "panel profile-empty" }, [
    el("img", { class: "profile-empty-brain", src: "/img/brain.png", alt: "", loading: "lazy", "aria-hidden": "true" }),
    el("span", { class: "mono-label", text: "No study history yet" }),
    el("h2", { text: "Your journey starts here" }),
    el("p", { class: "muted", text: "Pick a track and this page starts keeping score — hours invested, lessons covered, questions practised, readiness by domain. All of it stays yours to export, any time." }),
    signedIn()
      ? el("p", { class: "muted", style: { fontSize: "13px" }, text: "Studied on another device? Its progress appears here after that device syncs." })
      : null,
    el("div", { class: "row", style: { gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "20px" } }, [
      el("a", { class: "ac-btn ac-btn-solid", href: "#/start" }, ["Find your track →"]),
      el("a", { class: "ac-btn", href: "#" + url.catalog() }, ["Browse all tracks"]),
    ]),
  ]);
}

// ── "Your data" — GDPR self-service (§4.4) ───────────────────────────────
// Typed confirmation: the destructive button arms an in-page panel that only
// enables once the learner types DELETE. House primitives, no window.confirm.
function confirmPanel({ title, body, confirmLabel, onConfirm }) {
  const input = el("input", { class: "claim-input", type: "text", placeholder: 'Type DELETE to confirm', "aria-label": "Type DELETE to confirm" });
  const go = el("button", { class: "ac-btn profile-danger-btn", type: "button", disabled: true }, [confirmLabel]);
  const msg = el("p", { class: "mono-label", style: { marginTop: "10px" } });
  input.addEventListener("input", () => { go.disabled = input.value.trim() !== "DELETE"; });
  go.addEventListener("click", async () => {
    go.disabled = true;
    input.disabled = true;
    msg.textContent = "Working…";
    const r = await onConfirm();
    if (!r.ok) {
      msg.textContent = `That didn't complete (${r.error}). Nothing was changed — try again.`;
      input.disabled = false;
      input.value = "";
    } else {
      msg.textContent = r.message || "Done.";
    }
  });
  const panel = el("div", { class: "profile-confirm", hidden: true }, [
    el("b", { text: title }),
    el("p", { class: "muted", style: { fontSize: "13px", margin: "6px 0 12px" }, text: body }),
    el("div", { class: "row", style: { gap: "10px", flexWrap: "wrap" } }, [input, go]),
    msg,
  ]);
  return panel;
}

function dataSection(status) {
  const kicker = el("span", { class: "mono-label", text: "Your data" });
  if (!signedIn()) {
    return el("div", { class: "panel", style: { marginTop: "34px" } }, [
      kicker,
      el("p", { class: "muted", style: { margin: "10px 0 0", maxWidth: "62ch", fontSize: "14px" }, text: "Signed out, nothing leaves this browser — progress lives in localStorage only, and the file backup on each track's readiness page is yours to keep. Sign in to add server sync, and with it the right to export or erase your account data in one click." }),
      el("button", { class: "ac-btn", type: "button", style: { marginTop: "14px" }, onClick: () => openSignIn() }, ["Sign in"]),
    ]);
  }

  const q = status.queue;
  const syncLine = el("p", { class: "muted", style: { fontSize: "13px", marginTop: "10px" }, text: [
    status.lastSyncedAt ? `Last synced ${fmtDate(status.lastSyncedAt)}.` : "Not synced yet.",
    q.count ? `${q.count} change${q.count === 1 ? "" : "s"} waiting to sync.` : "Everything is synced.",
    q.quarantinedCount ? `${q.quarantinedCount} rejected event${q.quarantinedCount === 1 ? "" : "s"} parked.` : null,
  ].filter(Boolean).join(" ") });

  const syncBtn = el("button", { class: "ac-btn", type: "button" }, ["Sync now"]);
  syncBtn.addEventListener("click", async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = "Syncing…";
    await syncNow("manual");
    rerender();
  });

  const exportBtn = el("button", { class: "ac-btn", type: "button" }, ["Export my data"]);
  const exportMsg = el("span", { class: "mono-label", style: { alignSelf: "center" } });
  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportMsg.textContent = "Exporting…";
    const r = await exportMyData();
    exportMsg.textContent = r.ok ? "Downloaded ✓" : `Export failed (${r.error}).`;
    exportBtn.disabled = false;
  });

  const dataConfirm = confirmPanel({
    title: "Delete my data",
    body: "Erases your synced progress, telemetry, mock and scenario history from our servers, and this browser's local copy with it. Your sign-in stays; other signed-in devices empty on their next sync. This cannot be undone.",
    confirmLabel: "Delete my data",
    onConfirm: async () => {
      const r = await deleteMyData();
      if (r.ok) setTimeout(rerender, 1200);
      return { ...r, message: "Deleted. Server and this device are clean — you're starting fresh." };
    },
  });
  const acctConfirm = confirmPanel({
    title: "Delete my account",
    body: "Everything above, PLUS your sign-in identity itself — web and mobile. You'll be signed out everywhere. This cannot be undone.",
    confirmLabel: "Delete my account",
    onConfirm: async () => {
      const r = await deleteMyAccount();
      if (r.ok) setTimeout(() => { location.hash = "#" + url.catalog(); }, 1400);
      if (r.ok && !r.clerkDeleted) return { ok: true, message: "Your data is deleted and you're signed out. Removing the sign-in identity itself hit an error — it will be retried; your data is already gone." };
      return { ...r, message: "Account deleted. Thanks for studying with us." };
    },
  });
  const toggle = (panel) => { const hid = panel.hasAttribute("hidden"); if (hid) panel.removeAttribute("hidden"); else panel.setAttribute("hidden", ""); };

  return el("div", { class: "panel", style: { marginTop: "34px" } }, [
    kicker,
    el("p", { class: "muted", style: { margin: "10px 0 0", maxWidth: "66ch", fontSize: "14px" }, text: "Signed in, the Spine stores your answer history (item, correct, timing), spaced-repetition state, mock and scenario results, and PII-minimised study telemetry — keyed to your account, never sold, never shared. You can take all of it with you or erase it, any time, right here." }),
    syncLine,
    el("div", { class: "row", style: { gap: "10px", marginTop: "14px", flexWrap: "wrap" } }, [
      syncBtn,
      el("button", { class: "ac-btn", type: "button", onClick: () => maybeOfferBackfill(true) }, ["Sync this device"]),
      exportBtn,
      exportMsg,
    ]),
    el("div", { class: "row", style: { gap: "10px", marginTop: "18px", flexWrap: "wrap" } }, [
      el("button", { class: "ac-btn profile-danger-btn", type: "button", onClick: () => toggle(dataConfirm) }, ["Delete my data…"]),
      el("button", { class: "ac-btn profile-danger-btn", type: "button", onClick: () => toggle(acctConfirm) }, ["Delete my account…"]),
    ]),
    dataConfirm,
    acctConfirm,
  ]);
}

// ── the view ─────────────────────────────────────────────────────────────
export async function profileView() {
  const status = syncStatus();
  let entries = null; // null = catalog unreachable, [] = genuinely no history
  try { entries = await gatherStarted(); } catch (_) {}

  const body = [];
  if (!entries) {
    body.push(el("div", { class: "panel", style: { marginTop: "26px" } }, [
      el("p", { class: "muted", text: "Couldn't load the catalog — your progress is safe; try again shortly." }),
    ]));
  } else if (!entries.length) {
    body.push(emptyState());
  } else {
    body.push(heroStats(entries, status));
    body.push(el("h2", { class: "serif-i", style: { fontSize: "26px", margin: "40px 0 14px" }, text: "Readiness, per track" }));
    body.push(el("div", { class: "profile-tracks" }, entries.map((e) => trackPanel(e.track, e.store))));
  }

  return el("div", { class: "section" }, [el("div", { class: "wrap", style: { maxWidth: "880px" } }, [
    identityHead(status),
    ...body,
    dataSection(status),
  ])]);
}
