// Automatos Academy — application entry. Wires the router to the views,
// loads track content + the local progress store per route, manages the
// theme toggle and the top progress bar, and guards renders with an error
// boundary.
import { route, parse, start, navigate, url } from "./router.js";
import { loadTrack } from "./content.js";
import { Store } from "./store.js";
import { el, clear } from "./ui.js";
import { catalog, method } from "./views/home.js";
import { trackHome, domainView } from "./views/track.js";
import { lessonView } from "./views/lesson.js";
import { quizView } from "./views/quiz.js";
import { examView } from "./views/exam.js";
import { scenariosIndex, scenarioRun } from "./views/scenario.js";
import { readinessView } from "./views/readiness.js";
import { libraryView, videosView } from "./views/library.js";
import { certificateView } from "./views/certificate.js";
import { pathFinderView } from "./views/pathfinder.js";
import { tutorPageView, mountTutor } from "./tutor.js";
import { track as tkEvent, mountCtaTracking } from "./analytics.js";

const appEl = document.getElementById("app");
const progressEl = document.getElementById("ac-progress");

function setProgress(p) {
  if (!progressEl) return;
  if (p <= 0) { progressEl.style.opacity = "0"; progressEl.style.width = "0"; return; }
  progressEl.style.opacity = "1";
  progressEl.style.width = p + "%";
  if (p >= 100) setTimeout(() => { progressEl.style.opacity = "0"; progressEl.style.width = "0"; }, 320);
}

function mount(node) {
  clear(appEl);
  appEl.appendChild(node);
  appEl.focus({ preventScroll: true });
}

const shell = (kicker, title, msg) => el("div", { class: "section" }, [el("div", { class: "wrap" }, [
  el("span", { class: "mono-label", text: kicker }),
  el("h1", { class: "serif-i", style: { fontSize: "40px", marginTop: "10px" }, text: title }),
  msg ? el("p", { class: "muted", style: { marginTop: "8px" }, text: msg }) : null,
  el("a", { class: "ac-btn", href: "#" + url.catalog(), style: { marginTop: "18px" } }, ["← Back to the Academy"]),
])]);

// ── routes ───────────────────────────────────────────────────────────
route("/", catalog);
route("/method", method);
route("/t/:vendor/:track", trackHome);
route("/t/:vendor/:track/domain/:domain", domainView);
route("/t/:vendor/:track/lesson/:domain/:lesson", lessonView);
route("/t/:vendor/:track/library", libraryView);
route("/t/:vendor/:track/videos", videosView);
route("/t/:vendor/:track/scenarios", scenariosIndex);
route("/t/:vendor/:track/scenario/:scenario", scenarioRun);
route("/t/:vendor/:track/quiz/:domain", quizView);
route("/t/:vendor/:track/exam", examView);
route("/t/:vendor/:track/readiness", readinessView);
route("/tutor", tutorPageView);
route("/start", pathFinderView);
route("/cert/:payload", certificateView);

async function handle(match) {
  setProgress(18);
  try {
    if (!match) { mount(shell("404", "Off the map.", "That route doesn't exist.")); setProgress(100); return; }
    const { view, params } = match;
    let track = null, store = null;
    if (params.vendor && params.track) {
      track = await loadTrack(params.vendor, params.track);
      store = new Store(params.vendor, params.track);
    }
    setProgress(68);
    const node = await view({ params, track, store, navigate, setProgress });
    mount(node);
    setProgress(100);
    syncTopnav(match.path);
    tkEvent("page_view");
  } catch (e) {
    console.error("[route]", e);
    mount(shell("Error", "Something broke.", String((e && e.message) || e)));
    setProgress(100);
  }
}

function syncTopnav(path) {
  document.querySelectorAll(".ac-topnav a[data-nav]").forEach((a) => {
    const k = a.getAttribute("data-nav");
    const on = (k === "catalog" && path === "/") || (k === "method" && path === "/method") || (k === "tutor" && path === "/tutor") || (k === "start" && path === "/start");
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

// ── theme toggle (shared 'automatos-mood' key with the main site) ─────
(function theme() {
  const btn = document.getElementById("ac-mood");
  const label = btn && btn.querySelector(".ac-mood-label");
  const cur = () => document.documentElement.getAttribute("data-mood") || "mist";
  const apply = (m) => {
    document.documentElement.setAttribute("data-mood", m);
    try { localStorage.setItem("automatos-mood", m); } catch (_) {}
    if (label) label.textContent = m === "night" ? "Night" : "Mist";
  };
  apply(cur());
  if (btn) btn.addEventListener("click", () => apply(cur() === "night" ? "mist" : "night"));
})();

start(handle);
mountTutor();
mountCtaTracking();
