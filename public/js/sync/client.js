// Spine transport (PRD-U2 S1) — the ONE place client sync code talks HTTP.
// Same-origin fetch to /api/sync/* + /api/me/* with a Bearer token from the
// U1 auth seam (auth.js is the only Clerk toucher; this module only asks it
// for tokens). Every Spine response wears the {success, data, error} envelope
// (server/spine/http.js) — parsed here once, policy stays in flush/reconcile.
// Never throws: transport failures come back as { status: 0, code } so
// callers can leave the queue intact and try again later.

import { getToken } from "../auth.js";

/**
 * @param {string} path e.g. "/api/sync/progress"
 * @param {{method?: string, body?: object, headers?: object}} [opts]
 * @returns {Promise<{status: number, code: string|null, data: unknown}>}
 *   status 0 = never reached the server (no token / network); code is the
 *   envelope's error string when the server sent one, else a transport code.
 */
export async function spineRequest(path, { method = "GET", body, headers } = {}) {
  const token = await getToken();
  if (!token) return { status: 0, code: "no_token", data: null };

  let res;
  try {
    res = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (_) {
    return { status: 0, code: "network", data: null };
  }

  let envelope;
  try {
    envelope = await res.json();
  } catch (_) {
    return { status: res.status, code: "unparseable_response", data: null };
  }
  if (!envelope || typeof envelope !== "object" || envelope.success !== true) {
    return {
      status: res.status,
      code: (envelope && typeof envelope.error === "string" && envelope.error) || `http_${res.status}`,
      data: (envelope && envelope.data) || null,
    };
  }
  return { status: res.status, code: null, data: envelope.data };
}
