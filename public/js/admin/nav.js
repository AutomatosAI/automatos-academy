// Reveal the "Admin" nav link for admins (PRD-ADMIN-CONSOLE S6 — discoverability).
// The link ships hidden in index.html; this un-hides it only when GET /api/me
// reports an admin/owner role. Signed-out or a learner never sees it. The
// #/admin view is itself role-gated server-side, so this is purely cosmetic —
// no authority rides on the client. Idempotent + fail-quiet.

import { adminApi, isAdminRole } from "./console.js";

let revealed = false;

export async function revealAdminNav() {
  if (revealed) return;
  let me;
  try { me = await adminApi.me(); } catch { return; }
  if (me.status === 0 || !me.data || !isAdminRole(me.data.role)) return;
  revealed = true;
  document.querySelectorAll(".ac-admin-only").forEach((el) => el.removeAttribute("hidden"));
}
