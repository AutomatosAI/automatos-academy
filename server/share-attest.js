// Share-payload attestation (PRD-COMMUNITY S1) — the honesty gate in front
// of share-card signing. A certificate signature only attests "the Academy
// issued this link", so /api/badge/sign signs any well-formed cert payload.
// A share card claims a NUMBER — signing it means "the Spine checked this
// against the DB" (S1b DoD: signed chip only when server-attested). So:
//
//   - only a signed-in learner (verified Clerk token) can get a share sig,
//   - only for a number their own synced data supports: claimed ≤ what the
//     server computes (under-claiming is honest; over-claiming is refused),
//   - streak from the same gaps-and-islands rollup /api/me/state serves,
//   - readiness from the same ported competence math the sync rollups use
//     (domainStatsFromRows + weightedCompetence — one canonical math),
//   - refusals are a generic "not_attested" — the endpoint never leaks what
//     the server thinks the real number is (the /api/badge/verify posture).
//
// Signed-out or Spine-less deploys simply never attest; the client falls
// back to an UNSIGNED link silently (the v1 social-proof posture).
import { STREAK_SQL } from "./spine/me-routes.js";
import { domainStatsFromRows, weightedCompetence } from "./engine/competence.js";
import { isSkillsTrack } from "../public/js/engine/certificate.js";

const refuse = (status, error) => ({ ok: false, status, error });

/** Server-side track number, on the profile ring's own scale (0–100). */
export async function serverTrackPct(pool, index, userId, vendorId, trackId) {
  const entry = index.tracks.get(`${vendorId}/${trackId}`);
  if (!entry) return null;
  const { rows } = await pool.query(
    `SELECT item_id, seen, correct FROM progress
     WHERE user_id = $1 AND vendor_id = $2 AND track_id = $3`,
    [userId, vendorId, trackId],
  );
  const byItem = new Map();
  for (const r of rows) byItem.set(r.item_id, { seen: r.seen, correct: r.correct });

  const track = entry.track.data;
  const domains = [...entry.domains.values()].map((d) => d.data);
  if (isSkillsTrack(track)) {
    // Skills tracks: the ring is lesson completion (certificate.js completion()).
    let total = 0, done = 0;
    for (const d of domains) {
      for (const l of d.lessons || []) {
        total++;
        const r = byItem.get(l.id);
        if (r && r.seen > 0) done++;
      }
    }
    return total ? Math.round((done / total) * 100) : 0;
  }
  // Exam tracks: blueprint-weighted mastery (readiness.js overall(), ported).
  const entries = domains.map((d) => {
    const st = domainStatsFromRows(d, byItem);
    return { weight: st.weight, competence: st.mastery };
  });
  return Math.round(weightedCompetence(entries) * 100);
}

/**
 * @param {{ pool: import("pg").Pool,
 *           verifier: (token:string) => Promise<object>,
 *           getIndex: () => object }} deps
 * @returns {(req, share) => Promise<{ok:true}|{ok:false,status:number,error:string}>}
 */
export function createShareAttestor({ pool, verifier, getIndex }) {
  return async function attestShare(req, share) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return refuse(401, "missing_token");

    let claims;
    try {
      claims = await verifier(token);
    } catch (_e) {
      return refuse(401, "invalid_token");
    }
    const clerkUserId = claims && typeof claims.sub === "string" && claims.sub ? claims.sub : null;
    if (!clerkUserId) return refuse(403, "token_missing_subject");

    // Read-only lookup — attestation never mints a users row.
    const u = await pool.query("SELECT id FROM users WHERE clerk_user_id = $1", [clerkUserId]);
    if (!u.rows.length) return refuse(403, "not_attested");
    const userId = u.rows[0].id;

    if (share.kind === "streak") {
      const r = await pool.query(STREAK_SQL, [userId]);
      const best = r.rows[0] ? r.rows[0].best : 0;
      return share.n >= 1 && share.n <= best ? { ok: true } : refuse(403, "not_attested");
    }

    const pct = await serverTrackPct(pool, getIndex(), userId, share.vendorId, share.trackId);
    if (pct === null) return refuse(403, "not_attested");
    return share.n <= pct ? { ok: true } : refuse(403, "not_attested");
  };
}
