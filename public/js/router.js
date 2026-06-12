// Minimal hash router. Patterns use /:name segments. Robust for a no-build
// static SPA: deep links and refreshes always work (no server route needed).

const routes = [];

export function route(pattern, view) {
  const keys = [];
  const rx = new RegExp(
    "^" + pattern.replace(/\//g, "\\/").replace(/:([^\\/]+)/g, (_, k) => { keys.push(k); return "([^\\/]+)"; }) + "\\/?$"
  );
  routes.push({ rx, keys, view });
}

export function parse() {
  let h = location.hash.replace(/^#/, "") || "/";
  if (!h.startsWith("/")) h = "/" + h;
  h = h.split("?")[0];
  for (const { rx, keys, view } of routes) {
    const m = h.match(rx);
    if (m) {
      const params = {};
      keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { view, params, path: h };
    }
  }
  return null;
}

export function navigate(to) {
  if (location.hash === "#" + to) { window.dispatchEvent(new HashChangeEvent("hashchange")); }
  else location.hash = to;
}

export function start(onChange) {
  window.addEventListener("hashchange", () => onChange(parse()));
  onChange(parse());
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
};
