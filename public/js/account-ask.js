// The earned-value account ask (PRD-WEB-LOOP §4.2, D-WL1/D-WL3) — one inline
// line at session end-states while signed out, right after value was created
// (quiz finish, mock results, lesson mark-complete, scenario debrief, badge
// claim). Never a modal, never blocking, never a wall: structural caps rather
// than good intentions — once per ASK_COOLDOWN_DAYS across ALL surfaces (one
// shared ledger), two lifetime dismissals then permanent quiet (the topbar
// Sign in stays the standing affordance). The register never says "losing
// your progress" — no fear copy.
//
// Wiring: [Create free account] → openSignIn(); on success U2's existing
// sign-in trigger runs syncNow + maybeOfferBackfill() — the backfill prompt
// is what actually saves the local history. This module ships only the
// doorway and its manners; zero new sync code.

import { el } from "./ui.js";
import { isConfigured, user, openSignIn } from "./auth.js";
import { track as tk } from "./analytics.js";

const KEY = "automatos-academy:v1:account-ask";
export const ASK_COOLDOWN_DAYS = 14; // D-WL1
export const ASK_MAX_DISMISSALS = 2; // then it retires permanently
const COOLDOWN_MS = ASK_COOLDOWN_DAYS * 86_400_000;

/** the persisted ledger { lastShownAt, dismissals } or null (never asked) */
export function loadLedger() {
  try {
    const raw = localStorage.getItem(KEY);
    const l = raw ? JSON.parse(raw) : null;
    return l && typeof l === "object" ? l : null;
  } catch (_) {
    return null;
  }
}

function saveLedger(l) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (_) {}
}

/** pure cadence gate — ONE ledger across every surface (D-WL3 rides it too) */
export function askAllowed(ledger, now) {
  if (!ledger) return true;
  if ((ledger.dismissals || 0) >= ASK_MAX_DISMISSALS) return false;
  if (ledger.lastShownAt && now - ledger.lastShownAt < COOLDOWN_MS) return false;
  return true;
}

/**
 * The inline ask panel, or null when it must stay quiet (signed in,
 * unconfigured deploy, cooling down, retired). Rendering IS the spend:
 * lastShownAt is written before the panel returns, so no second surface can
 * double-ask inside the window — a learner never sees two asks in a week.
 */
export function accountAsk(surface) {
  try {
    if (!isConfigured() || user()) return null;
    const now = Date.now();
    const ledger = loadLedger();
    if (!askAllowed(ledger, now)) return null;
    saveLedger({ dismissals: (ledger && ledger.dismissals) || 0, lastShownAt: now });
    tk("account_ask_shown", { surface });

    const go = el("button", { class: "ac-btn ac-btn-solid", type: "button" }, ["Create free account"]);
    const later = el("button", { class: "ac-btn", type: "button" }, ["Not now"]);
    const panel = el("div", { class: "panel ask-line", role: "status" }, [
      el("p", { class: "ask-copy", text: "Nice work — an account saves this progress across devices." }),
      el("div", { class: "row", style: { gap: "10px", flexWrap: "wrap" } }, [go, later]),
    ]);
    go.addEventListener("click", () => {
      tk("account_ask_clicked", { surface });
      openSignIn();
    });
    later.addEventListener("click", () => {
      const l = loadLedger() || {};
      saveLedger({ ...l, dismissals: (l.dismissals || 0) + 1 });
      tk("account_ask_dismissed", { surface });
      panel.remove();
    });
    return panel;
  } catch (_) {
    return null; // an ask must never break a finish panel
  }
}
