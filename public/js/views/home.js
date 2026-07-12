// Platform home (track catalog, two doors) + the "learning model" explainer.
import { el } from "../ui.js";
import { loadCatalog } from "../content.js";
import { url } from "../router.js";
import { track as tk } from "../analytics.js";

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
  const attrs = { class: "onramp" + (live ? "" : " is-soon"), style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", border: "1px solid var(--rule-c)", borderLeft: "3px solid var(--accent)", padding: "12px 16px", marginTop: "26px" } };
  if (live) { attrs.href = "#" + url.track(t.vendorId, t.trackId); return el("a", attrs, inner); }
  return el("div", attrs, inner);
}

// Two doors, one academy (PRD-GROWTH §5): the operator who wants AI running
// their business, and the practitioner chasing a credential. Lane comes from
// manifest data (track.lane) — the engine stays vendor-agnostic.
function doors(tracks) {
  const firstLive = (lane, fallbackLane) => {
    const inLane = tracks.filter((t) => (t.lane || "practitioner") === lane);
    return inLane.find((t) => t.status === "live") || inLane[0] ||
      tracks.filter((t) => (t.lane || "practitioner") === fallbackLane).find((t) => t.status === "live");
  };
  const operator = firstLive("operator", "practitioner");
  const practitioner = tracks.find((t) => t.flagship && t.status === "live") || firstLive("practitioner", "operator");
  const door = (kicker, title, body, t) => {
    const live = t && t.status === "live";
    return el(live ? "a" : "div", { class: "door" + (live ? "" : " is-soon"), href: live ? "#" + url.track(t.vendorId, t.trackId) : null }, [
      el("span", { class: "mono-label", text: kicker }),
      el("h3", { class: "serif-i", text: title }),
      el("p", { class: "muted", text: body }),
      el("span", { class: "mono-label", style: { marginTop: "auto" }, text: t ? (live ? `Start: ${t.name} →` : `First track in development: ${t.name}`) : "" }),
    ]);
  };
  return el("div", { class: "door-grid" }, [
    door("For operators", "Run your business with AI.", "Plain English, no exam — you leave with one real automation running in your business.", operator),
    door("For practitioners", "Get certified in AI.", "Exam-grade prep, weighted to real blueprints, gated by an honest A+ readiness score.", practitioner),
  ]);
}

// ── Periwinkle landing hero (design mock 1a + 1b): a full-bleed two-slide
// carousel — slide 1 the glowing-brain image hero, slide 2 the video hero — with
// floating glass stat widgets (count-up + avatar cluster), a shared numbered
// pager that advances the slides, and a "YOUR MIND UPGRADED" corner. Pure DOM
// via el(); count-up + float/shimmer come from js/anim.js (reduced-motion aware),
// and the carousel auto-advances unless the OS asks for reduced motion. ──────────
const HERO_BRAIN_SVG = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.142 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>';
const HERO_CHEVRON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
const HERO_PLAY_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
// Drop a SHORT (<2MB, ~2–5s) seamless brand loop at public/media/hero-loop.mp4
// and it will play muted-loop in the hero panel. Until then this 404s and the
// panel shows the brain poster — deliberately NOT a course video.
const HERO_VIDEO_SRC = "/media/hero-loop.mp4";
const HERO_INSIGHTS_SVG = '<svg viewBox="0 0 236 90" preserveAspectRatio="none"><path d="M0 60 C 40 30, 70 78, 118 52 C 160 30, 190 66, 236 40 L236 90 L0 90 Z" fill="rgba(255,255,255,0.16)"/><path d="M0 60 C 40 30, 70 78, 118 52 C 160 30, 190 66, 236 40" fill="none" stroke="#fff" stroke-width="2" opacity="0.85"/></svg>';

function heroAvatars(ids) {
  return el("div", { class: "ac-hero__avatars" }, ids.map((i) =>
    el("img", { src: `/img/avatar-${i}.png`, alt: "", loading: "lazy" })));
}

// floating glass widgets — `pos` is the absolute placement for the slide
function glassLearners(pos) {
  return el("div", { class: "ac-glass anim-float", style: Object.assign({ padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px" }, pos) }, [
    heroAvatars([1, 3, 5]),
    el("div", {}, [
      el("div", { style: { fontFamily: "var(--display)", fontWeight: "700", fontSize: "21px", color: "#fff" }, dataset: { count: "544", suffix: "+" }, text: "0+" }),
      el("div", { style: { fontSize: "13px", color: "rgba(255,255,255,0.85)" }, text: "Active learners" }),
    ]),
  ]);
}
// the "345 sessions tracked" stat stack (mock 1a)
function heroStats(pos) {
  return el("div", { class: "ac-hero__stats anim-float2", style: pos }, [
    el("div", { class: "big", dataset: { count: "345" }, text: "0" }),
    el("div", { class: "cap", text: "Sessions tracked" }),
    el("div", { class: "mini" }, [
      el("div", {}, [el("b", { dataset: { count: "24", suffix: "K" }, text: "0" }), el("span", { text: "data points" })]),
      el("div", {}, [el("b", { dataset: { count: "1.33", dec: "2" }, text: "0" }), el("span", { text: "avg score" })]),
    ]),
  ]);
}

// "Neural Insights" waveform card with a shimmer sweep (mock 1a)
function heroInsights(pos) {
  return el("div", { class: "ac-hero__insights shimmer", style: pos }, [
    el("div", { class: "k1", text: "Neural" }),
    el("div", { class: "k2", text: "Insights" }),
    el("div", { html: HERO_INSIGHTS_SVG }),
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

function periwinkleHero(flagship) {
  const startHref = flagship ? "#" + url.track(flagship.vendorId, flagship.trackId) : "#/start";
  const videoHref = flagship ? "#" + url.videos(flagship.vendorId, flagship.trackId) : "#" + url.method();

  // slide 1 — image hero
  const slide1 = el("div", { class: "ac-hero__slide is-active" }, [
    el("div", { class: "ac-hero__watermark", "aria-hidden": "true", text: "ACADEMY" }),
    heroBrainVideo(),
    el("div", { class: "ac-hero__inner" }, [el("div", { class: "col" }, [
      el("h1", {}, ["TRAIN YOUR ", el("span", { class: "lite", text: "AI" }), " MIND"]),
      el("p", { text: "The Academy for building AI agents. Learn by doing, adapt in real time, and unlock measurable skills you can put to work." }),
      el("a", { class: "ac-hero__cta", href: startHref }, [
        el("span", { class: "orb", html: HERO_BRAIN_SVG }),
        el("span", { class: "lbl", text: "Start Learning" }),
        el("span", { style: { color: "var(--fg)", display: "inline-flex" }, html: HERO_CHEVRON_SVG }),
      ]),
    ])]),
    glassLearners({ left: "60%", top: "12%" }),
    heroStats({ right: "3%", top: "31%" }),
    heroInsights({ left: "33%", top: "57%" }),
    heroPlay({ left: "55%", top: "45%" }),
  ]);

  const corner = el("div", { class: "ac-hero__corner", "aria-hidden": "true", html: "YOUR<br/>MIND<br/>UPGRADED" });
  // single brain-video hero — no carousel, no second slide, no flip
  return el("section", { class: "ac-hero", "aria-label": "Automatos Academy" }, [slide1, corner]);
}

export async function catalog() {
  const cat = await loadCatalog();
  const tracks = cat.vendors.flatMap((v) => v.tracks.map((t) => ({ ...t, vendorId: v.id, vendorName: v.name })));
  const flagship = tracks.find((t) => t.flagship && t.status === "live") || tracks.find((t) => t.status === "live");

  const heroVisual = periwinkleHero(flagship);
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
    doors(tracks),
    spine(),
  ])]);

  const cards = el("section", { class: "section" }, [el("div", { class: "wrap" }, [
    el("div", { class: "eyebrow", style: { marginBottom: "20px" } }, [el("span", { class: "mono-label", text: "Tracks" })]),
    el("div", { class: "grid-tracks" }, tracks.map(trackCard)),
    el("p", { class: "muted", style: { marginTop: "20px", fontSize: "13px" } }, [
      "Same engine, every track. Adding a vendor is a content task, not an engineering one — see ",
      el("a", { href: "https://github.com/AutomatosAI", target: "_blank", rel: "noopener", style: { color: "var(--accent)" }, text: "the authoring guide" }), ".",
    ]),
  ])]);

  return el("div", {}, [heroVisual, intro, cards]);
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
    el("section", { class: "section" }, [el("div", { class: "wrap", style: { display: "grid", gap: "1px", background: "var(--rule-c)", border: "1px solid var(--rule-c)" } },
      blocks.map(([k, h, p]) => el("div", { style: { background: "var(--bg)", padding: "30px 28px" } }, [
        el("span", { class: "mono-label", text: k }),
        el("h2", { class: "serif-i", style: { fontSize: "30px", margin: "12px 0 12px" }, text: h }),
        el("p", { class: "muted", style: { maxWidth: "70ch", margin: 0 }, text: p }),
      ]))
    )]),
  ]);
}
