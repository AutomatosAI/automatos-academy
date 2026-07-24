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

export const contentApi = {
  listDrafts: (status) =>
    authed(`/api/admin/content/drafts${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  getDraft: (id) => authed(`/api/admin/content/drafts/${encodeURIComponent(id)}`),
  approve: (id) => authed(`/api/admin/content/drafts/${encodeURIComponent(id)}/approve`, { method: "POST" }),
  reject: (id) => authed(`/api/admin/content/drafts/${encodeURIComponent(id)}/reject`, { method: "POST" }),
  writeBack: (body) => authed("/api/admin/content", { method: "POST", body }),
};

// Human label for a draft's scope tuple, e.g. "domain · anthropic/cca-f/d1".
export function scopeLabel(d) {
  const ids = [d.vendorId, d.trackId, d.domainId].filter(Boolean).join("/");
  return ids ? `${d.scopeKind} · ${ids}` : d.scopeKind;
}
