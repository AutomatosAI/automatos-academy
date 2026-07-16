// Privacy-clean event beacon (PRD-GROWTH §3). No cookies, no identifiers, no
// pageview vendor script — named events only, so the academy→platform funnel
// is measurable. Endpoint comes from chat-config.js hydration; when it's
// empty every call is a silent no-op (local dev, or analytics not chosen yet).
//
// Events (keep this the single vocabulary): page_view · track_start ·
// module_complete · mock_start · mock_score · readiness_a_plus · badge_claim
// · badge_view · cta_automatos_click · notify_me · tutor_message ·
// tutor_error (props: kind, status? — counts only, never message text;
// PRD-TUTOR-LIVE D-T4) · tutor_deep_link · path_finder

const endpoint = () => ((window.ACADEMY_CHAT || {}).analyticsEndpoint || "").trim();

const ONCE_KEY = "automatos-academy:v1:events-once";

export function track(event, props = {}) {
  const url = endpoint();
  if (!url) return;
  const body = JSON.stringify({
    event,
    props,
    path: location.hash.replace(/^#/, "") || "/",
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

// Delegated listener: any link out to the Automatos platform is the loop's
// conversion click ("Apply it in Automatos" boxes, header link, tutor label).
export function mountCtaTracking() {
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    if (/(^|\.)automatos\.app/.test((a.hostname || ""))) {
      track("cta_automatos_click", { href: a.href, from: location.hash || "#/" });
    }
  }, { capture: true });
}
