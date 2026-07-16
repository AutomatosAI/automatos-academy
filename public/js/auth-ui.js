// Topbar sign-in affordance (PRD-U1 S2, extended by PRD-U2 S4). Chrome, not a
// view: mounted once by app.js next to the mood toggle. It renders NOTHING
// until auth.js reports a state — unconfigured deploys never even get the
// slot, so the pre-U1 topbar is byte-identical — then:
//   signed-out → a quiet ghost pill ("Sign in") that opens Clerk's modal
//   signed-in  → avatar (photo, else the learner's initial in an accent
//                circle) with a small menu: name/email header, My progress,
//                Sign out. Account plumbing (export / delete) deliberately
//                does NOT live here — it has a "Your data" section at the
//                bottom of #/profile; the menu stays about learning.
// All auth calls go through auth.js (the single Clerk seam).
import { el, clear } from "./ui.js";
import { initAuth, isConfigured, onAuthChange, openSignIn, signOut } from "./auth.js";
import { url } from "./router.js";

// Document-level listeners for the open menu, torn down on every re-render so
// signed-in/out flips never leak handlers.
let disposeMenu = null;

export function mountAuthUI() {
  if (!isConfigured()) return; // unconfigured: zero DOM, zero network
  const bar = document.querySelector(".ac-topbar");
  const mood = document.getElementById("ac-mood");
  if (!bar || !mood) return;
  const slot = el("div", { class: "ac-auth" });
  bar.insertBefore(slot, mood); // between the nav and the mood toggle
  onAuthChange((u) => render(slot, u));
  initAuth();
}

function render(slot, u) {
  if (disposeMenu) {
    disposeMenu();
    disposeMenu = null;
  }
  clear(slot);
  slot.appendChild(u ? accountMenu(u) : signInButton());
}

function signInButton() {
  return el("button", { class: "ac-auth-signin", type: "button", onClick: () => openSignIn() }, ["Sign in"]);
}

function avatarFace(u) {
  if (u.imageUrl) return el("img", { class: "ac-avatar-img", src: u.imageUrl, alt: "", referrerpolicy: "no-referrer" });
  const letter = (u.name || u.email || "?").trim().charAt(0).toUpperCase() || "?";
  return el("span", { class: "ac-avatar-initial", "aria-hidden": "true", text: letter });
}

function accountMenu(u) {
  const menu = el("div", { class: "ac-auth-menu", role: "menu", hidden: true }, [
    el("div", { class: "ac-auth-id", role: "presentation" }, [
      u.name ? el("b", { text: u.name }) : null,
      u.email ? el("span", { text: u.email }) : null,
    ]),
    el("button", {
      class: "ac-auth-item", type: "button", role: "menuitem",
      onClick: () => { setOpen(false); location.hash = "#" + url.profile(); },
    }, ["My progress"]),
    el("button", {
      class: "ac-auth-item", type: "button", role: "menuitem",
      onClick: () => { setOpen(false); signOut(); },
    }, ["Sign out"]),
  ]);
  const btn = el("button", {
    class: "ac-avatar", type: "button",
    "aria-label": u.name ? `Account — ${u.name}` : "Account menu",
    "aria-haspopup": "menu", "aria-expanded": "false",
  }, [avatarFace(u)]);
  const wrap = el("div", { class: "ac-auth-wrap" }, [btn, menu]);

  let open = false;
  function setOpen(v) {
    open = v;
    btn.setAttribute("aria-expanded", String(v));
    if (v) menu.removeAttribute("hidden");
    else menu.setAttribute("hidden", "");
  }
  btn.addEventListener("click", () => setOpen(!open));

  // Close on outside click / Escape; both torn down by render() on state flips.
  const onDocClick = (e) => { if (open && !wrap.contains(e.target)) setOpen(false); };
  const onDocKey = (e) => { if (open && e.key === "Escape") { setOpen(false); btn.focus(); } };
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onDocKey);
  disposeMenu = () => {
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onDocKey);
  };

  return wrap;
}
