// Reveal the "Admin" affordances (topnav link + account-menu item) for admins
// (PRD-ADMIN-CONSOLE S6 — discoverability). Both ship hidden (class
// ac-admin-only); this un-hides them once GET /api/me reports admin/owner.
// The role is cached after the first successful call, and the reveal is
// idempotent — safe to call again whenever the nav or account menu re-renders
// (so a freshly-rebuilt dropdown still gets the item). Fail-quiet; the #/admin
// view is role-gated server-side, so nothing here is a security boundary.

import { adminApi, isAdminRole } from "./console.js";

let adminStatus = null; // null = unknown · true/false once /api/me answers

export async function revealAdminNav() {
  if (adminStatus === null) {
    let me;
    try { me = await adminApi.me(); } catch { return; }
    if (me.status === 0) return; // auth not ready (no token yet) — stay unknown, retry later
    adminStatus = !!(me.data && isAdminRole(me.data.role));
  }
  if (adminStatus) {
    document.querySelectorAll(".ac-admin-only").forEach((el) => el.removeAttribute("hidden"));
  }
}
