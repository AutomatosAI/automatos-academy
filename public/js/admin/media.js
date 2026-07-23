// Admin media plane — the browser client for PRD-WAVE-CONTENT-OPS C3.
//
// A signed-in, allow-listed admin (ACADEMY_ADMIN_CLERK_IDS) gets Upload
// affordances on video placeholders; everyone else sees exactly today's UI.
// Fail-closed and quiet: signed-out or non-admin ⇒ admin:false, no buttons, no
// console noise. Every call carries the Clerk bearer token; the server's single
// gate (server/media/admin.js) is the real authority — this only decides what
// to render. The upload path mirrors the server contract in server/media:
// presign (MP4 ≤500 MB, key locked to academy/<vendor>/<track>/) → PUT the
// bytes straight to S3 → bind (server HEADs the object, then upserts).

import { getToken } from "../auth.js";

let probe = null; // memoised Promise<{admin, actor}>
let cachedAdmin = false; // synchronous view for render functions

/** What render code reads — false until (and unless) ensureAdmin() confirms. */
export function isAdminSync() {
  return cachedAdmin;
}

/**
 * Probe admin status once, sharing one request across every caller. Signed-out
 * or any non-200 (403 not allow-listed, 404 feature off, network) ⇒ admin:false.
 * Resolving true flips isAdminSync() so a re-render shows the affordances.
 */
export async function ensureAdmin() {
  if (probe) return probe;
  probe = (async () => {
    let token = null;
    try { token = await getToken(); } catch (_) { token = null; }
    if (!token) return { admin: false, actor: null };
    try {
      const r = await fetch("/api/admin/media/session", { headers: { authorization: `Bearer ${token}` } });
      if (!r.ok) return { admin: false, actor: null };
      const body = await r.json().catch(() => ({}));
      cachedAdmin = body.admin === true;
      return { admin: cachedAdmin, actor: body.actor || null };
    } catch (_) {
      return { admin: false, actor: null };
    }
  })();
  return probe;
}

// The server accepts video/mp4 only, ≤500 MB (server/media/validate.js
// MEDIA_RULES.video). Enforce the same client-side for an instant, honest error
// instead of a round-trip 400.
const VIDEO_TYPE = "video/mp4";
const MAX_BYTES = 500 * 1024 * 1024;

/**
 * presign → PUT (with progress) → bind. Resolves {url} on success; throws with
 * a human-readable message on any step. onProgress(0..1) fires during the PUT.
 */
export async function uploadVideo({ vendor, track, slotId, file, onProgress }) {
  if (file.type !== VIDEO_TYPE) throw new Error("Upload an MP4 file (H.264/AAC).");
  if (file.size > MAX_BYTES) throw new Error("That file is over 500 MB — re-encode it smaller first.");
  const token = await getToken().catch(() => null);
  if (!token) throw new Error("Your session expired — sign in again.");
  const auth = { authorization: `Bearer ${token}` };

  // 1) presign — the server locks the S3 key to academy/<vendor>/<track>/.
  const pres = await fetch("/api/admin/media/presign", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ vendor, track, slotId, kind: "video", filename: file.name, contentType: VIDEO_TYPE }),
  });
  if (pres.status === 503) throw new Error("Media storage isn't configured on this deploy yet.");
  if (!pres.ok) throw new Error(await errText(pres, "Couldn't prepare the upload."));
  const { putUrl, finalUrl } = await pres.json();

  // 2) PUT the bytes straight to S3 (XHR, for upload progress).
  await putWithProgress(putUrl, file, onProgress);

  // 3) bind — the server HEADs the object (no dangling urls), then upserts.
  const bind = await fetch("/api/admin/media/bind", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ vendor, track, slotId, kind: "video", url: finalUrl }),
  });
  if (!bind.ok) throw new Error(await errText(bind, "Uploaded, but couldn't publish it."));
  return { url: finalUrl };
}

function putWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage rejected the upload (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

async function errText(r, fallback) {
  try {
    const b = await r.json();
    return b && b.error ? `${fallback} (${b.error})` : fallback;
  } catch (_) {
    return fallback;
  }
}
