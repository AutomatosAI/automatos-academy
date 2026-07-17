// Per-track exam dates (PRD-WEB-LOOP §4.1 / S1) — the input the pacing line
// paces against. Device-local, matching mobile's posture (src/feed/examDate.ts
// keeps them in kv; cross-device exam-date sync is flagged, not built — set
// it on web AND phone until a server home exists). Storage:
//   automatos-academy:v1:exam-dates → { "{vendorId}/{trackId}": "YYYY-MM-DD" }
// The key rides the automatos-academy: prefix, so the file backup
// (progress-io.js) carries it and every GDPR wipe (sync/account.js) clears it
// with no extra enumeration.
//
// When signed in, every write ALSO fires a one-way push to /api/me/prefs for
// PRD-DIGEST S1 to consume — feature-detected by simply ignoring every
// failure (the 501 convention: the endpoint may not exist yet). Local stays
// the truth; nothing here reads back.

import { isConfigured, user } from "./auth.js";
import { spineRequest } from "./sync/client.js";

const KEY = "automatos-academy:v1:exam-dates";
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const doc = raw ? JSON.parse(raw) : null;
    return doc && typeof doc === "object" ? doc : {};
  } catch (_) {
    return {};
  }
}

function writeAll(doc) {
  try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch (_) {}
}

/** "YYYY-MM-DD" for one track, or null when none is set */
export function getExamDate(vendorId, trackId) {
  const v = readAll()[`${vendorId}/${trackId}`];
  return typeof v === "string" && ISO_RE.test(v) ? v : null;
}

/** set one track's exam date (invalid input is ignored — never throws) */
export function setExamDate(vendorId, trackId, iso) {
  if (!ISO_RE.test(iso || "")) return;
  writeAll({ ...readAll(), [`${vendorId}/${trackId}`]: iso });
  pushPrefs();
}

export function clearExamDate(vendorId, trackId) {
  const all = { ...readAll() };
  delete all[`${vendorId}/${trackId}`];
  writeAll(all);
  pushPrefs();
}

/**
 * Epoch ms of the local END of the exam day: on exam-day morning the pace
 * honestly has one day left; the morning after, it is honestly past. null on
 * bad input.
 */
export function examDateMs(iso) {
  if (!ISO_RE.test(iso || "")) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1, d).getTime();
  return Number.isFinite(t) ? t + 86_400_000 : null;
}

/** localized display label; long → "Sep 12, 2026", default → "Sep 12" */
export function examDateLabel(iso, { long } = {}) {
  if (!ISO_RE.test(iso || "")) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    undefined,
    long ? { year: "numeric", month: "short", day: "numeric" } : { month: "short", day: "numeric" },
  );
}

// One-way push for PRD-DIGEST S1. Fire-and-forget: signed out (or an
// unconfigured deploy) it does nothing; a missing endpoint, a 501, or a
// network fault are all silently absorbed — spineRequest never throws and
// nobody consumes the result. Local stays the truth.
function pushPrefs() {
  try {
    if (!isConfigured() || !user()) return;
    spineRequest("/api/me/prefs", { method: "PUT", body: { examDates: readAll() } }).catch(() => {});
  } catch (_) { /* prefs push must never break the setter */ }
}
