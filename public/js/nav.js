// Mobile nav drawer (burger, ≤900px). Chrome, not a view: mounted once by
// app.js exactly like auth-ui.js. The topnav hides under 900px — the same
// breakpoint where the landing hero goes one-screen, so "mobile" flips as one
// coherent switch — and the static #ac-burger button in index.html opens a
// glass drawer under the topbar: the same primary links on 48px tap rows, the
// external automatos.app link, and an Appearance (mood) row. The in-bar mood
// pill hides ≤560px where it crowds the brand; the drawer row exists at every
// drawer width so there is always exactly one obvious mood control on phones.
// The signed-in avatar / Sign-in pill deliberately STAYS in the bar — small,
// high-value, and auth-ui.js already owns its lifecycle.
//
// Behavior mirrors auth-ui.js's account menu: outside-click + Escape close
// (Escape returns focus to the burger), plus a single hashchange listener
// (hash router — any navigation closes the drawer) and a matchMedia guard
// that closes a stale-open drawer when the viewport grows past the
// breakpoint. Everything is torn down through a module-level dispose so a
// re-mount never leaks handlers.
import { el } from "./ui.js";

const BREAKPOINT = "(max-width: 900px)"; // keep in lockstep with academy.css

let dispose = null;

// Ordered to mirror .ac-topnav exactly — same links, same data-nav keys, so
// app.js's syncTopnav() highlights the current page in both places.
const LINKS = [
  { href: "#/start", nav: "start", label: "Start here" },
  { href: "#/", nav: "catalog", label: "Tracks" },
  { href: "#/method", nav: "method", label: "The model" },
  { href: "#/tutor", nav: "tutor", label: "Tutor" },
];

export function mountNav() {
  const bar = document.querySelector(".ac-topbar");
  const btn = document.getElementById("ac-burger");
  if (!bar || !btn) return;
  if (dispose) { dispose(); dispose = null; }

  let open = false;

  // Appearance row — delegates to the in-bar #ac-mood pill: app.js owns the
  // toggle + persistence, and .click() works even while the pill itself is
  // display:none (≤560px). We only re-read the applied mood for our label.
  const moodLabel = el("span", { class: "ac-drawer-mood-cur", text: "" });
  const moodBtn = el("button", { class: "ac-drawer-mood", type: "button", "aria-label": "Toggle light / dark" }, [
    el("span", { class: "ac-mood-dot", "aria-hidden": "true" }),
    moodLabel,
    el("span", { class: "mono-label", text: "Appearance" }),
  ]);
  const pill = document.getElementById("ac-mood");
  const syncMood = () => {
    const night = document.documentElement.getAttribute("data-mood") === "night";
    moodLabel.textContent = night ? "Night" : "Mist";
  };
  moodBtn.addEventListener("click", () => { if (pill) pill.click(); syncMood(); });
  if (pill) pill.addEventListener("click", syncMood); // in-bar toggles keep the row honest

  // Links close the drawer on tap; same-page taps don't fire hashchange, so
  // the onClick matters even with the hashchange listener below.
  const drawer = el("nav", { id: "ac-nav-drawer", class: "ac-nav-drawer", "aria-label": "Primary", hidden: true }, [
    ...LINKS.map((l) => el("a", { href: l.href, "data-nav": l.nav, onClick: () => setOpen(false) }, [l.label])),
    el("a", {
      class: "ac-ext", href: "https://automatos.app", target: "_blank", rel: "noopener",
      onClick: () => setOpen(false),
    }, ["automatos.app ↗"]),
    moodBtn,
  ]);
  bar.appendChild(drawer); // position:absolute — never becomes a topbar grid track
  btn.setAttribute("aria-controls", "ac-nav-drawer");

  function setOpen(v) {
    open = v;
    btn.setAttribute("aria-expanded", String(v));
    btn.classList.toggle("is-open", v);
    if (v) { syncMood(); drawer.removeAttribute("hidden"); }
    else drawer.setAttribute("hidden", "");
  }
  btn.addEventListener("click", () => setOpen(!open));

  // Close on outside click / Escape (focus back on the burger) / navigation /
  // growing past the breakpoint — all removed by dispose.
  const onDocClick = (e) => { if (open && !drawer.contains(e.target) && !btn.contains(e.target)) setOpen(false); };
  const onDocKey = (e) => { if (open && e.key === "Escape") { setOpen(false); btn.focus(); } };
  const onHash = () => { if (open) setOpen(false); };
  const mq = window.matchMedia ? window.matchMedia(BREAKPOINT) : null;
  const onMq = () => { if (mq && !mq.matches && open) setOpen(false); };
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onDocKey);
  window.addEventListener("hashchange", onHash);
  if (mq && mq.addEventListener) mq.addEventListener("change", onMq);

  dispose = () => {
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onDocKey);
    window.removeEventListener("hashchange", onHash);
    if (mq && mq.removeEventListener) mq.removeEventListener("change", onMq);
    if (pill) pill.removeEventListener("click", syncMood);
    drawer.remove();
  };
}
