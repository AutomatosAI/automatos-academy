// Platform home (track catalog, two doors) + the "learning model" explainer.
import { el, ring } from "../ui.js";
import { loadCatalog } from "../content.js";
import { url } from "../router.js";
import { track as tk } from "../analytics.js";
import { continueData, heroReadiness, heroPace } from "./continue.js";
import { wireTeaserData, wireTeaser } from "./wire.js";
import { paceLine } from "./pace-line.js";
import { loadLane, laneSort } from "../lane.js";

// ── real hero numbers (GET /api/catalog/stats) ─────────────────────────
// One fetch per session (module-level cached promise; the route is
// max-age=300 anyway), raced against a short timeout so a hung request can
// never hold the hero hostage. Resolves to the stats object or null — NEVER
// rejects. On null every widget keeps its launch-era hardcoded copy: the
// page must not look broken because an endpoint had a bad day.
let statsPromise = null;
function fetchHeroStats() {
  if (!statsPromise) {
    statsPromise = fetch("/api/catalog/stats")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return Promise.race([statsPromise, new Promise((res) => setTimeout(() => res(null), 1500))]);
}
// a stat is usable only as a positive finite number — anything else falls back
const posNum = (x) => (typeof x === "number" && isFinite(x) && x > 0 ? x : null);

const SPINE = [
  ["01", "Learn", "Tutorials that teach the why, not just the what — grounded in primary sources."],
  ["02", "Build", "Hands-on labs against the real API. The exam rewards people who have actually shipped."],
  ["03", "Decide", "Scenario drills: make the architectural calls, get graded on your reasoning."],
  ["04", "Prove", "Full-length, timed mock exams that mirror the real format. No shortcuts."],
  ["05", "Ready", "An honest, graded readiness score. A+ — or not yet. We don't flatter you."],
];

function spine() {
  return el("div", { class: "spine" }, SPINE.map(([n, h, p]) =>
    el("div", { class: "step" }, [el("div", { class: "n", text: n }), el("h3", { text: h }), el("p", { text: p })])
  ));
}

// "Notify me" on coming-soon cards — the highest-intent demand signal we can
// capture (PRD-GROWTH §4.2). POSTs to /api/notify; unconfigured server → 503
// and we fall back to pointing at the platform site.
function notifyForm(t) {
  const input = el("input", { class: "claim-input", type: "email", placeholder: "you@company.com", "aria-label": `Email me when ${t.name} launches` });
  const btn = el("button", { class: "ac-btn", type: "button" }, ["Notify me"]);
  const row = el("div", { class: "row notify-form", style: { gap: "8px" } }, [input, btn]);
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { input.focus(); return; }
    btn.disabled = true; btn.textContent = "…";
    try {
      const r = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, trackId: t.trackId }) });
      if (!r.ok) throw new Error(String(r.status));
      tk("notify_me", { track: t.trackId });
      row.replaceChildren(el("span", { class: "mono-label", style: { color: "var(--accent)" }, text: "✓ You're on the list" }));
    } catch (_) {
      row.replaceChildren(el("a", { class: "mono-label", href: "https://automatos.app", target: "_blank", rel: "noopener", text: "Sign-ups open soon — meanwhile: automatos.app ↗" }));
    }
  });
  return row;
}

function trackCard(t) {
  const live = t.status === "live";
  const attrs = { class: "track-card" + (live ? "" : " is-soon") };
  if (live) attrs.href = "#" + url.track(t.vendorId, t.trackId);
  return el(live ? "a" : "div", attrs, [
    el("div", { class: "vendor" }, [
      el("span", { class: "mono-label", text: t.vendorName }),
      el("div", { class: "row", style: { gap: "6px" } }, [
        t.flagship ? el("span", { class: "badge flagship", text: "Flagship" }) : null,
        el("span", { class: "badge" + (live ? " live" : ""), text: live ? "Live" : "Soon" }),
      ]),
    ]),
    el("h3", { text: t.name }),
    t.code ? el("span", { class: "mono-label", text: t.code }) : null,
    el("p", { class: "meta", text: t.summary || "" }),
    el("div", { class: "foot" }, [
      el("span", { class: "stat", text: live ? `${t.domains} domains${t.exam ? " · " + t.exam.questionCount + "Q exam" : ""}` : "In development" }),
      live ? el("span", { class: "arr serif-i", text: "→" }) : null,
    ]),
    live ? null : notifyForm(t),
  ]);
}

// The on-ramp strip (PRD-B0 §6): the Foundations-lane track sits BELOW both
// doors — for the visitor who doesn't know the words yet. Data-driven from
// manifest lane; renders a link when live, an honest "coming soon" until then.
function onRamp(tracks) {
  const t = tracks.find((x) => (x.lane || "") === "foundations");
  if (!t) return null;
  const live = t.status === "live";
  const inner = [
    el("span", { class: "mono-label", text: "Never touched AI?" }),
    el("span", { class: "serif-i", style: { fontSize: "18px" }, text: `Start here — ${t.name}` }),
    el("span", { class: "mono-label", style: { marginLeft: "auto", color: live ? "var(--accent)" : "var(--muted)" }, text: live ? "Start free →" : "Coming soon — notify me below" }),
  ];
  const attrs = { class: "onramp" + (live ? "" : " is-soon"), style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", border: "1px solid var(--rule)", borderLeft: "3px solid var(--accent)", padding: "12px 16px", marginTop: "26px" } };
  if (live) { attrs.href = "#" + url.track(t.vendorId, t.trackId); return el("a", attrs, inner); }
  return el("div", attrs, inner);
}

// Two doors, one academy (PRD-GROWTH §5): the operator who wants AI running
// their business, and the practitioner chasing a credential. Lane comes from
// manifest data (track.lane) — the engine stays vendor-agnostic.
// PRD-WEB-LOOP §4.3: a persisted pathfinder walk (lane.js) puts the learner's
// lane door first — with a resume voice while they have no real progress
// (once continueData is non-null the personal hero leads and only the
// ordering remains). Foundations-lane learners keep the on-ramp as their
// lead, so their doors stay in the default order.
function doors(tracks, laneRec, resumeVoice) {
  const lane = (laneRec && laneRec.lane) || null;
  const rec0 = (laneRec && Array.isArray(laneRec.recs) && laneRec.recs[0]) || null;
  const firstLive = (laneKey, fallbackLane) => {
    const inLane = tracks.filter((t) => (t.lane || "practitioner") === laneKey);
    // the learner's own recommendation wins its lane's door when it's live
    const pref = rec0 && laneKey === lane && inLane.find((t) => t.trackId === rec0.trackId && t.status === "live");
    return pref || inLane.find((t) => t.status === "live") || inLane[0] ||
      tracks.filter((t) => (t.lane || "practitioner") === fallbackLane).find((t) => t.status === "live");
  };
  const operator = firstLive("operator", "practitioner");
  // flagship stays the practitioner default; the learner's own live
  // practitioner recommendation outranks it, nothing else does
  const practitioner =
    (lane === "practitioner" && rec0 && tracks.find((t) => t.trackId === rec0.trackId && (t.lane || "practitioner") === "practitioner" && t.status === "live")) ||
    tracks.find((t) => t.flagship && t.status === "live") ||
    firstLive("practitioner", "operator");
  const door = (kicker, title, body, t, doorLane) => {
    const live = t && t.status === "live";
    // the voice only speaks on the door that actually leads to rec[0] —
    // never on a stand-in track it doesn't name
    const voiced = resumeVoice && rec0 && lane === doorLane && live && t.trackId === rec0.trackId;
    return el(live ? "a" : "div", { class: "door" + (live ? "" : " is-soon"), href: live ? "#" + url.track(t.vendorId, t.trackId) : null }, [
      el("span", { class: "mono-label", text: kicker }),
      el("h3", { class: "serif-i", text: title }),
      el("p", { class: "muted", text: body }),
      el("span", { class: "mono-label", style: { marginTop: "auto" }, text: t
        ? (voiced ? `Pick up where the path finder left off: ${rec0.name} →`
          : live ? `Start: ${t.name} →` : `First track in development: ${t.name}`)
        : "" }),
    ]);
  };
  const pair = [
    door("For operators", "Run your business with AI.", "Plain English, no exam — you leave with one real automation running in your business.", operator, "operator"),
    door("For practitioners", "Get certified in AI.", "Exam-grade prep, weighted to real blueprints, gated by an honest A+ readiness score.", practitioner, "practitioner"),
  ];
  if (lane === "practitioner") pair.reverse(); // operator already leads by default
  return el("div", { class: "door-grid" }, pair);
}

// ── Periwinkle landing hero (design mock 1a): the glowing-brain hero with
// floating glass widgets and a "YOUR MIND UPGRADED" corner. Pure DOM via
// el(); count-up + float come from js/anim.js (reduced-motion aware).
// Two audiences, one hero:
//   • new visitors — REAL platform numbers from /api/catalog/stats (see
//     fetchHeroStats above; the mock's placeholder figures survive only as
//     the no-stats fallback), plus the live-learner card when /stats can
//     honestly vouch for one.
//   • returning learners (continueData != null) — the primary CTA becomes
//     "Continue ⟨track⟩ →", "Start Learning" steps down to the ghost slot,
//     and a chip row resumes reviews/mocks. Signed in, the widgets go
//     personal too: streak flame, readiness ring, reviews due. ──
const HERO_BRAIN_SVG = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.142 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>';
const HERO_CHEVRON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
const HERO_PLAY_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
// Drop a SHORT (<2MB, ~2–5s) seamless brand loop at public/media/hero-loop.mp4
// and it will play muted-loop in the hero panel. Until then this 404s and the
// panel shows the brain poster — deliberately NOT a course video.
const HERO_VIDEO_SRC = "/media/hero-loop.mp4";
// lucide "flame" — the streak widget's mark, tinted with the brain's coral
const HERO_FLAME_SVG = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';

function heroAvatars(ids) {
  return el("div", { class: "ac-hero__avatars" }, ids.map((i) =>
    el("img", { src: `/img/avatar-${i}.png`, alt: "", loading: "lazy" })));
}

// floating glass widgets — `pos` is the absolute placement for the slide.
// Cold-start honesty: until the Academy has a three-digit learner count we
// don't dress a small one up — we show the practice-question count instead,
// a number that is impressive today AND real. The moment `learners` crosses
// 100 the widget flips to people, automatically, with no copy change needed.
function glassLearners(pos, stats) {
  const learners = stats && posNum(stats.learners);
  const questions = stats && posNum(stats.questions);
  const spec = learners && learners >= 100
    ? { ds: { count: String(learners), suffix: "+" }, label: "Active learners" }
    : questions
      ? { ds: { count: String(questions) }, label: "Practice questions" }
      : { ds: { count: "544", suffix: "+" }, label: "Active learners" }; // stats down → launch copy
  return el("div", { class: "ac-glass anim-float", style: Object.assign({ padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px" }, pos) }, [
    heroAvatars([1, 3, 5]),
    el("div", {}, [
      el("div", { style: { fontFamily: "var(--display)", fontWeight: "700", fontSize: "21px", color: "#fff" }, dataset: spec.ds, text: "0" + (spec.ds.suffix || "") }),
      el("div", { style: { fontSize: "13px", color: "rgba(255,255,255,0.85)" }, text: spec.label }),
    ]),
  ]);
}
// the hero stat stack (mock 1a) — real catalog numbers when /stats answers
// (lessons big; tracks + guided hours mini), the launch mock copy otherwise.
// Hours round DOWN (never promise more than we ship). Same nodes, same
// classes, same count-up wiring — only numbers and labels change.
function heroStats(pos, stats) {
  const lessons = stats && posNum(stats.lessons);
  const tracks = stats && posNum(stats.liveTracks);
  const hours = stats && posNum(Math.floor((posNum(stats.learningMinutes) || 0) / 60));
  const spec = lessons && tracks && hours
    ? { big: { count: String(lessons) }, cap: "Guided lessons",
        mini: [[{ count: String(tracks) }, "expert tracks"], [{ count: String(hours), suffix: "h" }, "guided learning"]] }
    : { big: { count: "345" }, cap: "Sessions tracked",
        mini: [[{ count: "24", suffix: "K" }, "data points"], [{ count: "1.33", dec: "2" }, "avg score"]] };
  return el("div", { class: "ac-hero__stats anim-float2", style: pos }, [
    el("div", { class: "big", dataset: spec.big, text: "0" }),
    el("div", { class: "cap", text: spec.cap }),
    el("div", { class: "mini" }, spec.mini.map(([ds, label]) =>
      el("div", {}, [el("b", { dataset: ds, text: "0" }), el("span", { text: label })]))),
  ]);
}

// the third card, signed out — replaces the retired "Neural Insights"
// placeholder waveform with something REAL: the live-learner count, but only
// when /stats can honestly vouch for one (below the floor a true-but-tiny
// number reads worse than no card, so the card hides entirely — no fakes).
const HERO_ACTIVE_FLOOR = 5;
function heroActive(pos, stats) {
  const active = stats && posNum(stats.activeThisWeek);
  if (!active || active < HERO_ACTIVE_FLOOR) return null;
  return el("div", { class: "ac-hero__insights anim-float", style: pos }, [
    el("div", { class: "k1", text: "Learners" }),
    el("div", { class: "k2" }, [el("span", { dataset: { count: String(active) }, text: "0" }), " active this week"]),
  ]);
}

// ── personal widgets (signed-in returning learners) ─────────────────────
// Same glass shells, float loops and count-up wiring as the public stat
// widgets — only the numbers become the learner's own. Each renders only
// when its number is real: no streak → no flame, nothing due → no card.

// (a) flame + "⟨n⟩-day streak" — the server-computed streak, read through the
// same selector chain the profile page uses (continueData → syncStatus()).
function streakWidget(pos, streak) {
  if (!streak) return null;
  return el("div", { class: "ac-glass anim-float", style: Object.assign({ padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px" }, pos) }, [
    el("span", { class: "anim-flame", "aria-hidden": "true", style: { display: "inline-flex", color: "var(--coral)" }, html: HERO_FLAME_SVG }),
    el("div", {}, [
      el("div", { style: { fontFamily: "var(--display)", fontWeight: "700", fontSize: "21px", color: "#fff" }, dataset: { count: String(streak) }, text: "0" }),
      el("div", { style: { fontSize: "13px", color: "rgba(255,255,255,0.85)" }, text: "day streak" }),
    ]),
  ]);
}

// (b) conic ring + "⟨pct⟩% ready · ⟨code⟩" for the most-advanced track —
// pct from heroReadiness (the profile page's completion/verdict math).
function readyWidget(pos, ready) {
  if (!ready) return null;
  const r = ring(ready.pct);
  // custom properties need setProperty (style-object indexing is not
  // portable for --vars) — same guard profile.js applies to its rings
  r.style.setProperty("--p", String(Math.max(0, Math.min(100, ready.pct))));
  r.setAttribute("aria-hidden", "true"); // decorative — the text carries the number
  const label = r.querySelector("span");
  if (label) label.textContent = "";
  return el("div", { class: "ac-hero__stats is-ready anim-float2", style: pos }, [
    r,
    el("div", {}, [
      el("div", { class: "big" }, [
        el("span", { dataset: { count: String(ready.pct), suffix: "%" }, text: "0%" }),
        ready.skills ? " done" : " ready", // skills tracks have no exam to be "ready" for
      ]),
      el("div", { class: "cap", text: ready.code }),
    ]),
  ]);
}

// (c) "⟨n⟩ due today" — tappable, the same quick-practice link as the chip row
function reviewsWidget(pos, reviews) {
  if (!reviews) return null;
  return el("a", { class: "ac-hero__insights anim-float", href: reviews.href, "aria-label": `${reviews.count} review${reviews.count === 1 ? "" : "s"} due — quick practice`, style: pos }, [
    el("div", { class: "k1", text: "Reviews" }),
    el("div", { class: "k2" }, [
      el("span", { dataset: { count: String(reviews.count) }, text: "0" }),
      " due today",
      el("span", { style: { marginLeft: "6px" }, "aria-hidden": "true", text: "→" }),
    ]),
  ]);
}

// pulsing play button on the brain — jumps to the video slide
function heroPlay(pos) {
  return el("button", { class: "ac-hero__playbtn anim-play", type: "button", "aria-label": "Play the tour", style: pos }, [
    el("i", { html: HERO_PLAY_SVG }),
  ]);
}

// looping, muted, inline hero video (mock 1b). Lazy: preload="none" and it only
// starts when the video slide becomes active (mountHeroCarousel's show() calls
// play()), so slide 1 — the default view — never downloads it. muted is set as a
// PROPERTY (not just the attribute) so muted autoplay is permitted on Safari/iOS.
function heroVideo(src) {
  const v = el("video", { class: "vmedia", poster: "/img/brain.png", loop: true, playsinline: true, preload: "none", "aria-hidden": "true" });
  v.muted = true; v.defaultMuted = true;
  v.setAttribute("muted", ""); v.setAttribute("webkit-playsinline", "");
  if (src) v.src = src;
  return v;
}

// the animated brain loop (extracted from Automatos-Academy.fig) as the hero
// centrepiece — autoplays muted-loop; the .ac-hero__brain radial mask fades its
// rectangular edges (and the corner watermark) into the periwinkle. poster is
// the still brain.png, shown until the 8s loop arrives.
function heroBrainVideo() {
  const v = el("video", { class: "ac-hero__brain", poster: "/img/brain.png", src: HERO_VIDEO_SRC, loop: true, playsinline: true, preload: "auto", "aria-hidden": "true" });
  v.muted = true; v.defaultMuted = true; v.autoplay = true;
  v.setAttribute("muted", ""); v.setAttribute("autoplay", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
  const kick = () => { const p = v.play && v.play(); if (p && p.catch) p.catch(() => {}); };
  if (document.readyState === "complete") kick(); else window.addEventListener("load", kick, { once: true });
  return v;
}

// pager click + auto-advance cross-fade; self-cleans when the hero leaves the DOM
function mountHeroCarousel(hero, slides, pager) {
  const curEl = pager.querySelector(".cur");
  const nxEl = pager.querySelector(".nx");
  let idx = 0;
  const show = (i) => {
    idx = ((i % slides.length) + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === idx));
    if (curEl) curEl.textContent = String(idx + 1).padStart(2, "0");
    if (nxEl) nxEl.textContent = String(((idx + 1) % slides.length) + 1).padStart(2, "0");
    const vid = slides[idx].querySelector("video");
    if (vid && vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); }
  };
  pager.addEventListener("click", () => show(idx + 1));
  const play = hero.querySelector(".ac-hero__playbtn");
  if (play) play.addEventListener("click", (e) => { e.preventDefault(); show(1); });
  show(0);
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    const timer = setInterval(() => {
      if (!document.body.contains(hero)) { clearInterval(timer); return; }
      show(idx + 1);
    }, 7000);
  }
}

function periwinkleHero(flagship, stats, personal) {
  const startHref = flagship ? "#" + url.track(flagship.vendorId, flagship.trackId) : "#/start";

  // CTA block — the returning learner's primary action is CONTINUING, in the
  // same orb pill; "Start Learning" steps down to the ghost slot beside it.
  const cta = (href, label) => el("a", { class: "ac-hero__cta", href }, [
    el("span", { class: "orb", html: HERO_BRAIN_SVG }),
    el("span", { class: "lbl" }, label),
    el("span", { style: { color: "var(--fg)", display: "inline-flex" }, html: HERO_CHEVRON_SVG }),
  ]);
  const actions = el("div", { class: "ac-hero__actions" }, personal
    ? [cta(personal.latest.href, ["Continue ", personal.latest.name]), el("a", { class: "ac-btn", href: startHref }, ["Start Learning"])]
    : [cta(startHref, ["Start Learning"])]);

  // resume chips — the welcome-back strip's actions, folded into the hero:
  // reviews only when something is actually due, mock only when a started
  // track carries an exam block (continueData enforces both).
  const chips = personal && (personal.reviews || personal.mock)
    ? el("div", { class: "ac-hero__chips" }, [
        personal.reviews ? el("a", { class: "continue-pill", href: personal.reviews.href }, [
          el("b", { text: String(personal.reviews.count) }), ` review${personal.reviews.count === 1 ? "" : "s"} due · Quick practice`,
        ]) : null,
        personal.mock ? el("a", { class: "continue-pill", href: personal.mock.href }, ["Take a mock"]) : null,
      ])
    : null;

  // Web Today (PRD-WEB-LOOP §4.1, D-WL2): the due-count + pacing line under
  // the chips row — any returning learner, signed in or out. No exam date ⇒
  // no verdict, just the count and a quiet set-your-date link.
  const pacer = personal && personal.pace ? paceLine(personal.pace, { surface: "hero", hero: true }) : null;

  // widgets — personal for the signed-in returning learner (real streak /
  // readiness / due counts only; slots with nothing true to say stay empty),
  // the platform's real catalog numbers for everyone else. If no personal
  // number is showable at all, fall back to the public set — never a bare hero.
  let widgets = null;
  if (personal && personal.signedIn) {
    const w = [
      streakWidget({ left: "60%", top: "12%" }, personal.streak),
      readyWidget({ right: "3%", top: "31%" }, personal.ready),
      // left 48% ≥ the inner col's min(48%, 660px) width at every viewport —
      // the tappable card can never sit over the CTA row or the chips
      reviewsWidget({ left: "48%", top: "68%" }, personal.reviews),
    ].filter(Boolean);
    if (w.length) widgets = w;
  }
  if (!widgets) {
    widgets = [
      glassLearners({ left: "60%", top: "12%" }, stats),
      heroStats({ right: "3%", top: "31%" }, stats),
      heroActive({ left: "33%", top: "57%" }, stats),
    ].filter(Boolean);
  }

  const slide1 = el("div", { class: "ac-hero__slide is-active" }, [
    el("div", { class: "ac-hero__watermark", "aria-hidden": "true", text: "ACADEMY" }),
    heroBrainVideo(),
    el("div", { class: "ac-hero__inner" }, [el("div", { class: "col" }, [
      personal ? el("span", { class: "ac-hero__kicker", text: personal.first ? `Welcome back, ${personal.first}` : "Welcome back" }) : null,
      el("h1", {}, ["TRAIN YOUR ", el("span", { class: "coral", text: "AI" }), " MIND"]),
      el("p", { text: "The Academy for building AI agents. Learn by doing, adapt in real time, and unlock measurable skills you can put to work." }),
      actions,
      chips,
      pacer,
    ])]),
    ...widgets,
  ]);

  const corner = el("div", { class: "ac-hero__corner", "aria-hidden": "true", html: "YOUR<br/>MIND<br/>UPGRADED" });
  // single brain-video hero — no carousel, no second slide, no flip
  return el("section", { class: "ac-hero", "aria-label": "Automatos Academy" }, [slide1, corner]);
}

export async function catalog() {
  const statsReady = fetchHeroStats(); // in flight while the catalog loads — adds ~zero latency
  // "From the Wire" teaser (PRD-WIRE S3, D-W3): resolves the 3 newest posts
  // or null (Wire off / fewer than 3 / fetch slow) — raced against the same
  // 1.5 s cap as /stats so home never waits on a dead endpoint. Null → the
  // strip simply isn't in the tree: no reserved space, zero layout shift.
  const teaserReady = Promise.race([wireTeaserData(), new Promise((res) => setTimeout(() => res(null), 1500))]);
  const cat = await loadCatalog();
  const cont = continueData(cat); // null for new visitors — their hero is unchanged
  // the readiness widget's one tree fetch (signed-in returning learners only),
  // raced against the same 1.5s cap as /stats — the hero never waits on a
  // slow fetch, it just skips the widget.
  const readyP = cont && cont.signedIn
    ? Promise.race([heroReadiness(cont), new Promise((res) => setTimeout(() => res(null), 1500))])
    : Promise.resolve(null);
  // the Today/pacing line (PRD-WEB-LOOP §4.1) — any returning learner; it
  // rides the same cached tree load and the same 1.5s cap, or resolves
  // instantly when no exam date is set (no fetch at all).
  const paceP = cont
    ? Promise.race([heroPace(cont), new Promise((res) => setTimeout(() => res(null), 1500))])
    : Promise.resolve(null);
  const stats = await statsReady;
  const teaserPosts = await teaserReady;
  const personal = cont ? { ...cont, ready: await readyP, pace: await paceP } : null;
  const laneRec = loadLane(); // PRD-WEB-LOOP §4.3 — the persisted pathfinder walk (90-day TTL)
  const tracks = cat.vendors.flatMap((v) => v.tracks.map((t) => ({ ...t, vendorId: v.id, vendorName: v.name })));
  const flagship = tracks.find((t) => t.flagship && t.status === "live") || tracks.find((t) => t.status === "live");

  const heroVisual = periwinkleHero(flagship, stats, personal);
  const intro = el("section", { class: "hero" }, [el("div", { class: "wrap" }, [
    el("div", { class: "eyebrow", style: { marginBottom: "20px" } }, [el("span", { class: "mono-label", text: "The Automatos learning model" })]),
    el("h2", { style: { fontSize: "clamp(28px,4vw,44px)", maxWidth: "22ch" } }, ["Learn AI architecture. ", el("em", { class: "serif-i", text: "Prove it." })]),
    el("p", { class: "lede" }, [
      "One loop, every track — ",
      el("b", { class: "serif-i", text: "Learn → Build → Decide → Prove → Ready" }),
      ". Demanding preparation for people who intend to be in the top percentile, because A+ is the only grade that qualifies.",
    ]),
    el("div", { class: "cta-row" }, [
      flagship ? el("a", { class: "ac-btn ac-btn-solid", href: "#" + url.track(flagship.vendorId, flagship.trackId) }, ["Start the flagship track ", el("span", { class: "arr", text: "→" })]) : null,
      el("a", { class: "ac-btn", href: "#/start" }, ["Which track is mine?"]),
      el("a", { class: "ac-btn", href: "#" + url.method() }, ["See the model"]),
    ]),
    onRamp(tracks),
    // the lane door leads; the resume voice only speaks while there is no
    // real progress (the personal hero always outranks the recommendation)
    doors(tracks, laneRec, !cont),
    spine(),
  ])]);

  const cards = el("section", { class: "section" }, [el("div", { class: "wrap" }, [
    el("div", { class: "eyebrow", style: { marginBottom: "20px" } }, [el("span", { class: "mono-label", text: "Tracks" })]),
    el("div", { class: "grid-tracks" }, laneSort(tracks, laneRec && laneRec.lane).map(trackCard)),
    el("p", { class: "muted", style: { marginTop: "20px", fontSize: "13px" } }, [
      "Same engine, every track. Adding a vendor is a content task, not an engineering one — see ",
      el("a", { href: "https://github.com/AutomatosAI", target: "_blank", rel: "noopener", style: { color: "var(--accent)" }, text: "the authoring guide" }), ".",
    ]),
  ])]);

  // Teaser sits straight under the hero — the daily-return habit starts where
  // the returning eye lands first. Absent (null) it contributes nothing.
  return el("div", {}, [heroVisual, teaserPosts ? wireTeaser(teaserPosts) : null, intro, cards]);
}

export async function method() {
  const blocks = [
    ["The model", "Automatos teaches one way, everywhere.", "Every track runs the same loop — Learn, Build, Decide, Prove, Ready. It's a deliberately demanding pedagogy: read the primary source, build the thing, defend the architecture, sit the full exam under time, and face an honest verdict. The loop is the product; the subject is interchangeable."],
    ["The standard", "A+ — or not yet.", "Most prep flatters you with a green checkmark for clicking through slides. We don't. Your readiness is a letter grade computed from proven mastery and a real, full-length mock passed with margin. A+ is the only grade that means qualified. Everything below it tells you exactly what's missing and where."],
    ["The proof", "Readiness you can trust.", "Per-domain mastery is weighted to the exam blueprint and gated by how much of the question bank you've actually attempted — so one lucky answer can't fake competence. A spaced-repetition queue keeps what you've learned from decaying. The score is the same whether or not it's flattering."],
    ["The method", "Built for people who ship.", "The flagship credential rewards roughly six months of real hands-on time. So the Academy is hands-on: labs run against the live API, scenarios put you in the architect's chair, and every answer explains the why with a link to the source. Memorising dumps won't get you to A+. Understanding will."],
  ];
  return el("div", {}, [
    el("section", { class: "hero" }, [el("div", { class: "wrap" }, [
      el("div", { class: "eyebrow", style: { marginBottom: "22px" } }, [el("span", { class: "mono-label", text: "The Automatos learning model" })]),
      el("h1", {}, ["How we make ", el("em", {}, ["A+ people."])]),
      spine(),
    ])]),
    el("section", { class: "section" }, [el("div", { class: "wrap", style: { display: "grid", gap: "1px", background: "var(--rule)", border: "1px solid var(--rule)" } },
      blocks.map(([k, h, p]) => el("div", { style: { background: "var(--bg)", padding: "30px 28px" } }, [
        el("span", { class: "mono-label", text: k }),
        el("h2", { class: "serif-i", style: { fontSize: "30px", margin: "12px 0 12px" }, text: h }),
        el("p", { class: "muted", style: { maxWidth: "70ch", margin: 0 }, text: p }),
      ]))
    )]),
  ]);
}
