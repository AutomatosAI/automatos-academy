// History-API router (PRD-WAVE-LEARNER-UX LX-4, D-LX4: all now). Clean paths
// — /t/github/gh-500 — are real, rankable URLs; the server's SPA fallback
// already serves the shell on any non-asset path, so deep loads worked before
// this file did. Every pre-wave "#/…" link 301-equivalents client-side: on
// boot (and on any later hashchange) a "#/…" hash is replaceState'd to its
// clean twin, so nothing bookmarked ever breaks.

const routes = [];

export function route(pattern, view) {
  const keys = [];
  const rx = new RegExp(
    "^" + pattern.replace(/\//g, "\\/").replace(/:([^\\/]+)/g, (_, k) => { keys.push(k); return "([^\\/]+)"; }) + "\\/?$"
  );
  routes.push({ rx, keys, view });
}

/** "#/t/x/y" (legacy) → "/t/x/y"; no legacy hash → null */
function legacyHashPath() {
  const h = location.hash || "";
  return h.startsWith("#/") ? h.slice(1).split("?")[0] : null;
}

export function parse() {
  // legacy hash wins if present (then gets cleaned by start()'s redirect)
  let p = legacyHashPath() || location.pathname || "/";
  if (!p.startsWith("/")) p = "/" + p;
  p = p.split("?")[0];
  for (const { rx, keys, view } of routes) {
    const m = p.match(rx);
    if (m) {
      const params = {};
      keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { view, params, path: p };
    }
  }
  return null;
}

let notify = null;
const dispatch = () => { if (notify) notify(parse()); };

/** re-render the current route in place (the old HashChangeEvent trick) */
export function rerender() { dispatch(); }

export function navigate(to) {
  if (location.pathname === to) { dispatch(); return; }
  history.pushState({}, "", to);
  dispatch();
}

// ── document title (LX-4) ──────────────────────────────────────────────
// The router resets to the site default on every change; data-carrying views
// call setTitle() once their content is loaded.
const DEFAULT_TITLE = "Automatos Academy — Learn AI architecture. Prove it.";
export function setTitle(t) {
  document.title = t ? `${t} · Automatos Academy` : DEFAULT_TITLE;
}

function cleanLegacyHash() {
  const p = legacyHashPath();
  if (p !== null) history.replaceState({}, "", p + location.search);
}

export function start(onChange) {
  notify = (r) => { setTitle(null); onChange(r); };
  cleanLegacyHash();
  window.addEventListener("popstate", dispatch);
  // legacy in-page "#/…" links (or old bookmarks applied while loaded):
  // normalise instead of letting the hash sit in the address bar
  window.addEventListener("hashchange", () => { cleanLegacyHash(); dispatch(); });
  // same-origin clean-path links route client-side — no full reload
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#/")) { e.preventDefault(); navigate(href.slice(1)); return; }
    if (!href.startsWith("/") || href.startsWith("//")) return;
    // real files and non-SPA server routes pass through untouched
    if (/^\/(api\/|wire\/rss|wire\/sitemap|sitemap\.xml|robots\.txt|s\/|cert\/.+\/card\.png)/.test(href)) return;
    if (/\.[a-zA-Z0-9]+$/.test(href)) return;
    e.preventDefault();
    navigate(href);
  });
  dispatch();
}

// route-builder helpers (keep URL construction in one place)
export const url = {
  catalog: () => "/",
  method: () => "/method",
  track: (v, t) => `/t/${v}/${t}`,
  domain: (v, t, d) => `/t/${v}/${t}/domain/${d}`,
  lesson: (v, t, d, l) => `/t/${v}/${t}/lesson/${d}/${l}`,
  library: (v, t) => `/t/${v}/${t}/library`,
  videos: (v, t) => `/t/${v}/${t}/videos`,
  scenarios: (v, t) => `/t/${v}/${t}/scenarios`,
  scenario: (v, t, s) => `/t/${v}/${t}/scenario/${s}`,
  quiz: (v, t, d) => `/t/${v}/${t}/quiz/${d}`,
  exam: (v, t) => `/t/${v}/${t}/exam`,
  readiness: (v, t) => `/t/${v}/${t}/readiness`,
  profile: () => "/profile",
  admin: () => "/admin",
  wire: () => "/wire",
  wirePost: (slug) => `/wire/${slug}`,
};
