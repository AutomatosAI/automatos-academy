// Pathfinder lane persistence (PRD-WEB-LOOP §4.3, D-WL4) — #/start's walk
// becomes a LOCAL PREFERENCE, not progress: nothing is sent anywhere. Home
// reads it to lead with the learner's lane (doors + grid ordering) until real
// progress takes over — the personal hero always outranks the recommendation.
//
// Lifecycle (D-WL4): 90 days rolling from the last pathfinder run; a re-run
// overwrites; "Reset my progress" (views/readiness.js) and the GDPR wipes
// (sync/account.js clears every automatos-academy: key) both clear it — it
// derives from answers about the learner, and only theme survives a wipe
// (the D-H1 keep-list philosophy).

const KEY = "automatos-academy:v1:pathfinder";
export const LANE_TTL_DAYS = 90;
const TTL_MS = LANE_TTL_DAYS * 86_400_000;

/** persist one pathfinder result: { answers, recs: [{trackId, name}], lane } */
export function saveLane({ answers, recs, lane }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      answers: answers || {},
      recs: Array.isArray(recs) ? recs : [],
      lane: lane || null,
      at: Date.now(),
    }));
  } catch (_) { /* storage unavailable — the walk just isn't remembered */ }
}

/** the stored walk, or null (never run / malformed / expired — expiry prunes the key) */
export function loadLane(now = Date.now()) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || typeof rec !== "object" || !rec.lane || typeof rec.at !== "number") return null;
    if (now - rec.at > TTL_MS) {
      localStorage.removeItem(KEY); // D-WL4: expired preferences don't linger
      return null;
    }
    return rec;
  } catch (_) {
    return null;
  }
}

export function clearLane() {
  try { localStorage.removeItem(KEY); } catch (_) {}
}

/**
 * Lane-matching tracks first, original order preserved within each half —
 * pure and stable so home's grid ordering is testable. No lane → untouched.
 * The default mirrors doors(): a track without a lane is a practitioner one.
 */
export function laneSort(tracks, lane) {
  if (!lane) return tracks;
  const match = [], rest = [];
  for (const t of tracks || []) ((t.lane || "practitioner") === lane ? match : rest).push(t);
  return [...match, ...rest];
}
