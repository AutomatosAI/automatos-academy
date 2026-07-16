// Account data rights (PRD-U2 S4) — the web UI's transport for the Spine's
// existing GDPR endpoints (server/spine/me-routes.js):
//   GET    /api/me/export   → the raw-truth JSON across all 7 tables
//   DELETE /api/me/data     → wipe Spine rows, keep the Clerk identity
//   DELETE /api/me/account  → wipe rows AND the Clerk identity, gated on the
//                             X-Confirm-Account-Deletion header naming the
//                             caller's own clerk user id (02 §4 — the
//                             cross-surface action is separately confirmed)
//
// Local effects mirror the mobile F8 lesson (delta review D-H1): every wipe
// clears the outbound queue THROUGH ITS clearAll() SEAM FIRST — deleting the
// rows underneath the queue would leave queued events to re-upload to the
// server that just confirmed the deletion — then removes every
// `automatos-academy:` key (progress, sync meta, backfill manifest, claim
// name). The keep-list philosophy holds: the theme (`automatos-mood`) and
// nothing else survives. Account deletion additionally signs out via the U1
// auth seam.

import { signOut, user } from "../auth.js";
import { spineRequest } from "./client.js";
import { clearAll } from "./queue.js";

const LOCAL_PREFIX = "automatos-academy:";

/** wipe every local trace, queue first (through the seam — D-H1) */
function wipeLocal() {
  clearAll();
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_PREFIX)) doomed.push(k);
    }
    for (const k of doomed) localStorage.removeItem(k);
  } catch (_) {}
}

/**
 * GET /api/me/export → download as a JSON file (same download idiom as
 * progress-io.js). Returns { ok } or { ok: false, error }.
 */
export async function exportMyData() {
  const res = await spineRequest("/api/me/export");
  if (res.code !== null || !res.data) return { ok: false, error: res.code || "empty_export" };
  try {
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `automatos-academy-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || "download_failed" };
  }
}

/**
 * DELETE /api/me/data — server rows gone, Clerk identity kept, THEN the
 * local wipe (server confirmed first; a failed call leaves everything —
 * including the queue — untouched for a clean retry).
 */
export async function deleteMyData() {
  const res = await spineRequest("/api/me/data", { method: "DELETE" });
  if (res.code !== null) return { ok: false, error: res.code };
  wipeLocal();
  return { ok: true, deleted: (res.data && res.data.deleted) || {} };
}

/**
 * DELETE /api/me/account — rows AND the Clerk identity. The confirmation
 * header must name the caller's own clerk user id (the server 403s anything
 * else). Spine rows are wiped server-side even when Clerk deletion fails
 * (502 clerk_deletion_failed/unavailable) — locally we treat that as a wipe
 * too, sign out, and surface the error honestly.
 */
export async function deleteMyAccount() {
  const u = user();
  if (!u || !u.id) return { ok: false, error: "not_signed_in" };
  const res = await spineRequest("/api/me/account", {
    method: "DELETE",
    headers: { "X-Confirm-Account-Deletion": u.id },
  });
  // 502 = rows wiped, Clerk identity still standing — local data must go
  // either way; anything else (403/401/network) aborts untouched.
  const rowsWiped = res.code === null || res.status === 502;
  if (!rowsWiped) return { ok: false, error: res.code };
  wipeLocal();
  await signOut();
  return res.code === null
    ? { ok: true, clerkDeleted: true }
    : { ok: true, clerkDeleted: false, error: res.code };
}
