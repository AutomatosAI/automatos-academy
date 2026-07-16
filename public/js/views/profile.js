// Profile (#/profile — PRD-U2 S4, decision D-U4a: REAL DATA ONLY). One page,
// three stories: who you are (Clerk identity + member-since + the
// server-derived study streak), how ready you are (per-track readiness reusing
// readiness.js/certificate.js over the local store — the SAME math and the
// same store the rest of the SPA reads, zero forked computation; reconcile
// keeps that store in step with other devices), and your rights over your
// data (export / delete, §4.4 — typed in-page confirmations, no
// window.confirm, wipes routed through the queue's clearAll seam).
//
// The mastery bars are the first real consumer of the .fillbar reveal system
// (anim.js + academy.css shipped it unused): width animates to --fill on
// first view, instant under prefers-reduced-motion.
//
// Signed out this page is a local-only mirror plus a quiet sign-in nudge —
// never a wall (PRD-U2 goal 2).
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

function streakPanel(status) {
  const streak = status.profile && status.profile.streak;
  if (!signedIn() || !streak) return null;
  return el("div", { class: "panel", style: { marginTop: "26px" } }, [
    el("div", { class: "stat-row" }, [
      el("div", { class: "s" }, [el("b", { text: String(streak.current) }), el("span", { class: "mono-label", text: "Day streak" })]),
      el("div", { class: "s" }, [el("b", { text: String(streak.best) }), el("span", { class: "mono-label", text: "Best streak" })]),
      status.lastSyncedAt
        ? el("div", { class: "s" }, [el("b", { text: fmtDate(status.lastSyncedAt) }), el("span", { class: "mono-label", text: "Last synced" })])
        : null,
    ]),
    el("p", { class: "muted", style: { margin: "12px 0 0", fontSize: "12.5px" }, text: "Streak days are counted in UTC, across every device on your account." }),
  ]);
}

// ── per-track readiness (readiness.js math over the local store) ─────────
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

  let ringPct, gradeSeal, headline;
  if (skills) {
    ringPct = Math.round(comp.pct * 100);
    gradeSeal = null;
    headline = `${comp.done} of ${comp.total} lessons done`;
  } else {
    const v = comp.verdict;
    ringPct = Math.round(v.overall.mastery * 100);
    gradeSeal = seal(v.grade, v.qualified ? "Qualified" : "Readiness", "sm");
    headline = v.headline;
  }

  const readinessRing = ring(ringPct);
  readinessRing.style.setProperty("--p", String(Math.max(0, Math.min(100, Math.round(ringPct))))); // portable --var set

  return el("div", { class: "panel profile-track" }, [
    el("div", { class: "profile-track-head" }, [
      readinessRing,
      el("div", { class: "profile-track-title" }, [
        el("span", { class: "mono-label", text: `${track.vendorName || track.vendorId} · ${track.code || track.trackId}` }),
        el("h3", {}, [el("a", { href: "#" + url.track(track.vendorId, track.trackId), text: track.name })]),
        el("p", { class: "muted", style: { fontSize: "13px" }, text: headline }),
      ]),
      gradeSeal,
    ]),
    masteryBars(track, store),
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

async function tracksSection() {
  let cat;
  try { cat = await loadCatalog(); } catch (_) { return el("p", { class: "muted", text: "Couldn't load the catalog — your progress is safe; try again shortly." }); }
  const panels = [];
  for (const vend of cat.vendors || []) {
    for (const t of vend.tracks || []) {
      // Cheap local check first; only tracks with data fetch their full tree.
      const store = new Store(vend.id, t.trackId);
      if (!hasData(store.s)) continue;
      try {
        panels.push(trackPanel(await loadTrack(vend.id, t.trackId), store));
      } catch (_) { /* content unavailable — skip, the data stays local */ }
    }
  }
  if (!panels.length) {
    return el("div", { class: "panel" }, [
      el("p", { class: "muted", text: "No study history on this profile yet." }),
      el("a", { class: "ac-btn ac-btn-solid", href: "#" + url.catalog(), style: { marginTop: "12px" } }, ["Pick a track →"]),
    ]);
  }
  return el("div", { class: "profile-tracks" }, panels);
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
  const tracks = await tracksSection();
  return el("div", { class: "section" }, [el("div", { class: "wrap", style: { maxWidth: "880px" } }, [
    identityHead(status),
    streakPanel(status),
    el("h2", { class: "serif-i", style: { fontSize: "26px", margin: "40px 0 14px" }, text: "Readiness, per track" }),
    tracks,
    dataSection(status),
  ])]);
}
