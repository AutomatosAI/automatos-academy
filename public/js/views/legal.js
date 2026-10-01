// /privacy and /support — the public pages the App Store / Play listings and
// the mobile app's privacy screen point at. Copy lives in ../legal-copy.js
// (pure data, tested); this module only lays it out through the same
// hardened md() + .prose path as lessons.
import { el } from "../ui.js";
import { setTitle } from "../router.js";
import { md } from "../markdown.js";
import { PRIVACY_MD, SUPPORT_MD, SUPPORT_EMAIL } from "../legal-copy.js";

function page(kicker, title, body, actions) {
  return el("section", { class: "section" }, [el("div", { class: "wrap" }, [
    el("span", { class: "mono-label", text: kicker }),
    el("h1", { class: "serif-i", style: { fontSize: "clamp(34px,5vw,48px)", margin: "10px 0 22px" }, text: title }),
    el("div", { class: "prose", html: md(body) }),
    el("div", { style: { display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "26px" } }, actions),
  ])]);
}

export async function privacyView() {
  setTitle("Privacy policy");
  return page("Privacy", "Privacy policy", PRIVACY_MD, [
    el("a", { class: "ac-btn ac-btn-solid", href: `mailto:${SUPPORT_EMAIL}` }, ["Email us"]),
    el("a", { class: "ac-btn", href: "/support" }, ["Help & support"]),
  ]);
}

export async function supportView() {
  setTitle("Help & support");
  return page("Support", "Help & support", SUPPORT_MD, [
    el("a", { class: "ac-btn ac-btn-solid", href: `mailto:${SUPPORT_EMAIL}` }, [`Email ${SUPPORT_EMAIL}`]),
    el("a", { class: "ac-btn", href: "/privacy" }, ["Privacy policy"]),
  ]);
}
