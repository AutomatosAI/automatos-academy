// Weekly fix-point (PRD-DIGEST §4.2) — one pass over existing tables per
// opted-in learner, stored as the `stats` jsonb on mastery_snapshots.
// `progress` upserts per item, so weekly numbers must be FROZEN here to be
// diffable later; the snapshot row doubles as the send ledger (emailed_at).
//
// stats shape (versioned by construction — compose tolerates missing keys):
//   {
//     streak: {current, best},                    // STREAK_SQL verbatim
//     tracks: {
//       "vendorId/trackId": {
//         seenSum, correctSum,                    // Σ over the track's rows
//         dueCount,                               // rows due at taken_at
//         touchedDomains: [domainId, …],          // answered within 7 days
//         weekTouched,                            // rows answered within 7 days
//         perDomain: {domainId: rawMastery0to1},  // RAW (undecayed) — §4.2
//       },
//     },
//   }
import { STREAK_SQL } from "../spine/me-routes.js";
import { domainStatsFromRows } from "../engine/competence.js";

const DAY_MS = 86_400_000;

/** Monday (UTC) of the week containing `now`, as "YYYY-MM-DD". */
export function weekStartUtc(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return new Date(d.getTime() - back * DAY_MS).toISOString().slice(0, 10);
}

/** Pure: progress rows (+ the content index + a streak) → the stats jsonb. */
export function buildStats({ rows, index, streak, nowMs }) {
  const byTrack = new Map();
  for (const r of rows) {
    const key = `${r.vendor_id}/${r.track_id}`;
    if (!byTrack.has(key)) byTrack.set(key, []);
    byTrack.get(key).push(r);
  }

  const tracks = {};
  for (const [key, trackRows] of byTrack) {
    const entry = index.tracks.get(key);
    if (!entry) continue; // retired/unknown track — rows stay, digest ignores

    const byItem = new Map();
    let seenSum = 0, correctSum = 0, dueCount = 0, weekTouched = 0;
    const touchedItems = new Set();
    for (const r of trackRows) {
      byItem.set(r.item_id, { seen: r.seen, correct: r.correct });
      seenSum += r.seen;
      correctSum += r.correct;
      if (r.due_at && new Date(r.due_at).getTime() <= nowMs) dueCount++;
      if (r.answered_at && nowMs - new Date(r.answered_at).getTime() <= 7 * DAY_MS) {
        weekTouched++;
        touchedItems.add(r.item_id);
      }
    }

    const perDomain = {};
    const touchedDomains = [];
    for (const [, d] of entry.domains) {
      const domain = d.data;
      perDomain[domain.id] = round4(domainStatsFromRows(domain, byItem).mastery);
      const items = [...(domain.questions || []), ...(domain.lessons || [])];
      if (items.some((it) => touchedItems.has(it.id))) touchedDomains.push(domain.id);
    }

    tracks[key] = { seenSum, correctSum, dueCount, weekTouched, touchedDomains, perDomain };
  }

  return { streak, tracks };
}

const round4 = (n) => Math.round(n * 10_000) / 10_000;

/**
 * Snapshot every opted-in learner for `weekStart` (idempotent: re-runs and
 * concurrent runners converge on the UNIQUE(user_id, week_start) row).
 * Returns {snapshotted, users} — users listed for the send loop's logs
 * (user ids only; addresses never appear anywhere near this module).
 */
export async function takeSnapshots({ pool, index, weekStart, now = new Date() }) {
  const nowMs = now.getTime();
  const optedIn = await pool.query(
    `SELECT u.id FROM users u JOIN user_prefs p ON p.user_id = u.id WHERE p.digest_enabled`,
  );

  let snapshotted = 0;
  for (const { id: userId } of optedIn.rows) {
    const [progress, streak] = await Promise.all([
      pool.query(
        `SELECT vendor_id, track_id, item_id, seen, correct, due_at, answered_at
         FROM progress WHERE user_id = $1`,
        [userId],
      ),
      pool.query(STREAK_SQL, [userId]),
    ]);
    const stats = buildStats({ rows: progress.rows, index, streak: streak.rows[0], nowMs });
    const r = await pool.query(
      `INSERT INTO mastery_snapshots (user_id, week_start, stats)
       VALUES ($1, $2, $3) ON CONFLICT (user_id, week_start) DO NOTHING`,
      [userId, weekStart, JSON.stringify(stats)],
    );
    snapshotted += r.rowCount;
  }
  return { snapshotted, optedIn: optedIn.rows.length };
}
