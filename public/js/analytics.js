// Privacy-clean event beacon (PRD-GROWTH §3). No cookies, no identifiers, no
// pageview vendor script — named events only, so the academy→platform funnel
// is measurable. Endpoint comes from chat-config.js hydration; when it's
// empty every call is a silent no-op (local dev, or analytics not chosen yet).
//
// Events (keep this the single vocabulary): page_view · track_start ·
// module_complete · mock_start · mock_score · readiness_a_plus · badge_claim
// · badge_view · cta_automatos_click · footer_family_click (props: href,
// from — a click in the footer's Automatos AI family row) · notify_me ·
// tutor_message (props:
// ctx? — "sent"|"held"|"off" context presence, only present when the
// progress-context feature is offered; PRD-TUTOR-LIVE D-T4) ·
// tutor_error (props: kind, status? — counts only, never message text;
// PRD-TUTOR-LIVE D-T4) · tutor_consent (props: granted — consent flips,
// a boolean only, never the shared numbers) · tutor_deep_link ·
// path_finder · pace_line_shown
// (props: verdict, surface) · exam_date_set (props: track, action) ·
// account_ask_shown · account_ask_clicked · account_ask_dismissed (props:
// surface — PRD-WEB-LOOP §4.2)

// LX-5: same-origin first-party default — the configured endpoint still
// wins (an external choice overrides), but unset no longer means "no-op":
// /api/events answers on Spine deploys and is a harmless 404/501 elsewhere.
const endpoint = () => ((window.ACADEMY_CHAT || {}).analyticsEndpoint || "").trim() || "/api/events";

// per-pageload session id — within-visit drop-off, never a person across
// visits (the identity-free stance in this file's header is unchanged)
const SESSION = Math.random().toString(36).slice(2, 12);

const ONCE_KEY = "automatos-academy:v1:events-once";

export function track(event, props = {}) {
  const url = endpoint();
  if (!url) return;
  const body = JSON.stringify({
    event,
    props,
    path: (location.hash.startsWith("#/") ? location.hash.slice(1) : location.pathname) || "/",
    session: SESSION,
    ref: document.referrer || undefined,
    at: Date.now(),
  });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))) return;
    fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch (_) { /* analytics must never break the app */ }
}

// Fire an event at most once per browser (e.g. track_start, readiness_a_plus).
export function trackOnce(key, event, props = {}) {
  try {
    const seen = JSON.parse(localStorage.getItem(ONCE_KEY) || "{}");
    if (seen[key]) return;
    localStorage.setItem(ONCE_KEY, JSON.stringify({ ...seen, [key]: Date.now() }));
  } catch (_) { /* storage unavailable → fire anyway */ }
  track(event, props);
}

// Which event a click on a link sends, or null. Only links out to another
// automatos.app host count: the Academy's own links are navigation, and in
// production their hostname (academy.automatos.app) matches automatos.app
// too, so the page's own host and the Academy host never count.
// The footer counts only what it marks: a link with data-cta (the Next step
// link into Studio) is the loop's conversion, the family row is
// footer_family_click, and every other footer link (the Powered by pill, the
// Legal column's Terms, Cookies and EU AI Act) sends nothing. Outside the
// footer every such link is an explicit call to action: the lessons' "Apply
// it in Automatos" and "Do it now" links, the tutor's and the home page's
// Studio waitlist links, the Wire's agent link.
export const AUTOMATOS_HOST = /(^|\.)automatos\.app$/;
export const ACADEMY_HOST = "academy.automatos.app";
export const FOOTER = ".ac-footer";
export const FAMILY_ROW = ".ac-family";
export const FOOTER_CTA = "[data-cta]";
// The company contact form (linked from /support and /privacy) is a help
// route, not the loop's conversion: a click on it sends nothing.
export const CONTACT_FORM_HOST = "automatos.app";
export const CONTACT_FORM_PATH = "/contact";

export function ctaEvent(a, pageHost) {
  const host = a.hostname || "";
  if (!AUTOMATOS_HOST.test(host) || host === pageHost || host === ACADEMY_HOST) return null;
  if (host === CONTACT_FORM_HOST && (a.pathname || "").replace(/\/+$/, "") === CONTACT_FORM_PATH) return null;
  if (!a.closest(FOOTER)) return "cta_automatos_click";
  if (a.closest(FAMILY_ROW)) return "footer_family_click";
  return a.matches(FOOTER_CTA) ? "cta_automatos_click" : null;
}

// Delegated listener for every link on the page; ctaEvent decides.
export function mountCtaTracking() {
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const event = ctaEvent(a, location.hostname);
    if (event) track(event, { href: a.href, from: location.pathname + (location.hash || "") });
  }, { capture: true });
}
