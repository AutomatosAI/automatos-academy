// Content write-back API client (PRD-CONTENT-LIFECYCLE / ADMIN-CONSOLE S5).
// The content-ops plane returns RAW json ({ok,...} / {error}) like the media
// plane — NOT the Spine {success,data} envelope — so it uses a raw authed
// fetch (getToken + Bearer), mirroring public/js/admin/media.js, rather than
// sync/client.js's envelope parser.

import { getToken } from "../auth.js";

async function authed(path, { method = "GET", body } = {}) {
  let token = null;
  try { token = await getToken(); } catch (_) { token = null; }
  if (!token) return { status: 0, error: "no_token" };
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (_) {
    return { status: 0, error: "network" };
  }
  let json = null;
  try { json = await res.json(); } catch (_) { /* empty/non-json body */ }
  return { status: res.status, ok: res.ok, ...(json || {}) };
}

// LA-8 §6 — the four verdicts, in the order a reviewer reaches for them.
// `wrong-fact` is first because it is the one that matters: a single one
// demotes its playbook×format to full manual review.
export const REJECT_REASONS = [
  { value: "wrong-fact", label: "Wrong fact" },
  { value: "bad-pedagogy", label: "Bad pedagogy" },
  { value: "style", label: "Style" },
  { value: "duplicate", label: "Duplicate" },
];

export const contentApi = {
  listDrafts: (status, batchId) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (batchId) q.set("batchId", batchId);
    const qs = q.toString();
    return authed(`/api/admin/content/drafts${qs ? `?${qs}` : ""}`);
  },
  getDraft: (id) => authed(`/api/admin/content/drafts/${encodeURIComponent(id)}`),
  approve: (id) => authed(`/api/admin/content/drafts/${encodeURIComponent(id)}/approve`, { method: "POST" }),
  // A pending draft's rejection MUST carry a reason (the ladder counts them);
  // retiring a live override may pass none.
  reject: (id, reason) =>
    authed(`/api/admin/content/drafts/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: reason ? { reason } : {},
    }),
  listBatches: () => authed("/api/admin/content/batches"),
  approveBatch: (batchId) =>
    authed(`/api/admin/content/batches/${encodeURIComponent(batchId)}/approve`, { method: "POST" }),
  writeBack: (body) => authed("/api/admin/content", { method: "POST", body }),
};

// Human label for a draft's scope tuple, e.g. "domain · anthropic/cca-f/d1".
export function scopeLabel(d) {
  const ids = [d.vendorId, d.trackId, d.domainId].filter(Boolean).join("/");
  return ids ? `${d.scopeKind} · ${ids}` : d.scopeKind;
}
