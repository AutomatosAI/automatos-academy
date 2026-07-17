// Share affordances (PRD-COMMUNITY S1) — the client half of share cards.
//
// One component, three surfaces (profile streak tile, profile track panels,
// readiness page). Renders NOTHING until /api/share/config says this deploy
// shares (a deploy without a real BADGE_SIGNING_SECRET can't attest numbers,
// so it doesn't invite shares — existing /s links still render everywhere).
//
// Honesty posture, same as certificates: no name on the card unless the
// learner adds one at share time (D-C4); the name travels in the link itself
// and nothing is stored server-side; signing is progressive — a signed-in,
// synced learner gets a server-attested "Signed by the Academy" link, anyone
// else ships the honest unsigned one. The word "verified" never appears.
import { el } from "./ui.js";
import { getToken, user as authUser } from "./auth.js";
import { encodeShare } from "./engine/sharecard.js";
import { track as tk } from "./analytics.js";

// Same key the certificate claim panel saves — one remembered name.
const NAME_KEY = "automatos-academy:v1:claim-name";

let configPromise = null;
/** Once per session: does this deploy invite sharing? Failure → false. */
function shareEnabled() {
  if (!configPromise) {
    configPromise = fetch("/api/share/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !!(j && j.sharing === true))
      .catch(() => false);
  }
  return configPromise;
}

// Ask the server to co-sign. Any refusal (signed out, no Spine, number not
// attestable, offline, 501) resolves "" and the unsigned link ships silently.
async function signShare(payload) {
  try {
    const token = await getToken();
    const r = await fetch("/api/badge/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ payload }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return typeof j.sig === "string" ? j.sig : "";
  } catch (_) { return ""; }
}

const shareUrl = (payload, sig) => `${location.origin}/s/${payload}${sig ? `~${sig}` : ""}`;

/**
 * A "Share" button + in-page panel (house style: no window.confirm, no
 * popups). Returns an empty container immediately and populates it only if
 * the deploy shares — callers just append it.
 *
 * @param {{ kind: "streak"|"readiness",
 *           label?: string,
 *           title: string,                      // navigator.share sheet title
 *           buildCard: () => object }} spec     // encodeShare fields sans date/name
 */
export function shareAffordance({ kind, label = "Share", title, buildCard }) {
  const root = el("div", { class: "share-aff" });

  shareEnabled().then((enabled) => {
    if (!enabled) return;

    const open = el("button", { class: "ac-btn share-open", type: "button" }, [label]);
    const nameCheck = el("input", { type: "checkbox", "aria-label": "Add my name to the card" });
    let savedName = "";
    try { savedName = localStorage.getItem(NAME_KEY) || ""; } catch (_) {}
    // Cards cap names at 60 chars (sharecard.js MAX_NAME_LEN) — enforce at
    // the input AND slice the prefill (the shared claim-name key is uncapped).
    const nameInput = el("input", {
      class: "claim-input share-name", type: "text", hidden: true, maxlength: "60",
      placeholder: "Your name, as it should appear",
      value: (savedName || ((authUser() && authUser().name) || "")).slice(0, 60),
      "aria-label": "Your name for the card",
    });
    nameCheck.addEventListener("change", () => {
      if (nameCheck.checked) { nameInput.removeAttribute("hidden"); nameInput.focus(); }
      else nameInput.setAttribute("hidden", "");
    });

    const status = el("span", { class: "mono-label", style: { alignSelf: "center" } });
    const canNative = typeof navigator !== "undefined" && !!navigator.share;

    const buildUrl = async () => {
      const name = nameCheck.checked ? nameInput.value.trim() : "";
      if (nameCheck.checked && !name) { nameInput.focus(); return null; }
      if (name) { try { localStorage.setItem(NAME_KEY, name); } catch (_) {} }
      let payload;
      try {
        payload = encodeShare({ ...buildCard(), kind, date: new Date().toISOString().slice(0, 10), name });
      } catch (_) {
        // encodeShare self-validates and throws on out-of-contract input
        // (e.g. a pasted name the codec refuses) — say so, don't go dead.
        status.textContent = name ? "That name doesn't fit on a card — 60 plain characters max." : "Couldn't build the card link.";
        return null;
      }
      const sig = await signShare(payload);
      return { url: shareUrl(payload, sig), signed: !!sig };
    };

    const finish = (built, method, note) => {
      status.textContent = note + (built.signed ? " · Signed by the Academy" : "");
      tk("share_card", { kind, signed: built.signed, method });
    };

    const copyBtn = el("button", { class: "ac-btn", type: "button" }, ["Copy link"]);
    copyBtn.addEventListener("click", async () => {
      const built = await buildUrl();
      if (!built) return;
      try { await navigator.clipboard.writeText(built.url); finish(built, "copy", "Link copied ✓"); }
      catch (_) { status.textContent = built.url; }
    });

    const actions = [copyBtn];
    if (canNative) {
      const shareBtn = el("button", { class: "ac-btn ac-btn-solid", type: "button" }, ["Share card →"]);
      shareBtn.addEventListener("click", async () => {
        const built = await buildUrl();
        if (!built) return;
        try { await navigator.share({ title, url: built.url }); finish(built, "native", "Shared ✓"); }
        catch (_) { /* learner closed the sheet — not an error */ }
      });
      actions.unshift(shareBtn);
    }

    const pop = el("div", { class: "share-pop", hidden: true }, [
      el("span", { class: "mono-label", text: "Share as a card" }),
      el("p", { class: "muted", style: { fontSize: "13.5px", margin: "8px 0 0" }, text:
        kind === "streak"
          ? "One designed card — your streak and the Academy. No name on it unless you add one."
          : "One designed card — the number, the track and the Academy. No name on it unless you add one." }),
      el("label", { class: "share-check" }, [nameCheck, "Add my name to the card"]),
      nameInput,
      el("div", { class: "row", style: { gap: "10px", marginTop: "12px", flexWrap: "wrap" } }, [...actions, status]),
      el("p", { class: "cap", style: { marginTop: "10px" }, text:
        "Anything on the card travels in the link itself — nothing is stored on our servers. The Academy adds its signature only when it can attest the number from your synced progress." }),
    ]);

    open.addEventListener("click", () => {
      const hidden = pop.hasAttribute("hidden");
      if (hidden) { pop.removeAttribute("hidden"); tk("share_open", { kind }); }
      else pop.setAttribute("hidden", "");
    });

    root.appendChild(open);
    root.appendChild(pop);
  });

  return root;
}

/**
 * Native-share button for pages whose link already exists (certificate view).
 * Returns null where the Web Share API is unavailable — the existing copy
 * button covers that path.
 */
export function nativeShareButton({ title, url }) {
  if (typeof navigator === "undefined" || !navigator.share) return null;
  const btn = el("button", { class: "ac-btn", type: "button" }, ["Share ↗"]);
  btn.addEventListener("click", async () => {
    try { await navigator.share({ title, url }); tk("share_card", { kind: "certificate", method: "native" }); }
    catch (_) { /* sheet dismissed */ }
  });
  return btn;
}
