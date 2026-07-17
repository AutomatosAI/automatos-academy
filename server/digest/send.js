// The weekly run (PRD-DIGEST §4.1/§4.2/§4.5) — snapshot, then claim-and-send
// each unsent row. Correctness lives in the LEDGER, not the trigger: any
// number of ticks, manual runs or crashed-and-resumed runs converge.
//
//   - advisory lock (one holder at a time) — held on ONE pooled connection,
//     because pg advisory locks are per-connection;
//   - claim-then-send: emailed_at is set BEFORE the SMTP call. A crash in
//     the gap means that learner's week is SKIPPED, never doubled — the
//     PRD's explicit ordering ("a late digest is worse than none");
//   - per-user try/catch: one bad row (Clerk miss, SMTP refusal) skips one
//     learner, loud in logs — user ids only, never addresses;
//   - zero-week policy (D-D4): a quiet week sends the gentle variant; three
//     consecutive SENT zero-weeks + a fourth quiet week ⇒ pause (row marked
//     `paused` in stats, never claimed) until an active week resumes flow.
import { takeSnapshots, weekStartUtc } from "./snapshot.js";
import { composeDigest } from "./compose.js";

const LOCK_KEY = [427001, 1]; // arbitrary app-scoped advisory pair

/** index → the display-name lookups compose needs (pure). */
export function buildMeta(index) {
  const trackNames = {};
  const domainNames = {};
  for (const [key, entry] of index.tracks) {
    trackNames[key] = (entry.track.data && entry.track.data.name) || key;
    for (const [, d] of entry.domains) {
      domainNames[`${key}/${d.data.id}`] = d.data.name || d.data.id;
    }
  }
  return { trackNames, domainNames };
}

async function lastThreeWereZero(pool, userId, weekStart) {
  const { rows } = await pool.query(
    `SELECT stats->>'zeroWeek' AS z FROM mastery_snapshots
     WHERE user_id = $1 AND week_start < $2 AND emailed_at IS NOT NULL
     ORDER BY week_start DESC LIMIT 3`,
    [userId, weekStart],
  );
  return rows.length === 3 && rows.every((r) => r.z === "true");
}

/**
 * @returns {Promise<{ran:boolean, weekStart?:string, snapshotted?:number,
 *   sent?:number, skipped?:number, paused?:number, failed?:number}>}
 */
export async function runDigest({ pool, index, mailer, fetchEmail, baseUrl, now = new Date(), log = console }) {
  const client = await pool.connect();
  try {
    const lock = await client.query("SELECT pg_try_advisory_lock($1, $2) AS ok", LOCK_KEY);
    if (!lock.rows[0].ok) {
      log.log("[digest] another runner holds the lock — standing down");
      return { ran: false };
    }
    try {
      const weekStart = weekStartUtc(now);
      const snap = await takeSnapshots({ pool, index, weekStart, now });
      const meta = buildMeta(index);

      const pending = await pool.query(
        `SELECT s.id, s.user_id, s.stats, u.clerk_user_id, p.unsub_token, p.exam_dates
         FROM mastery_snapshots s
         JOIN users u ON u.id = s.user_id
         JOIN user_prefs p ON p.user_id = s.user_id
         WHERE s.week_start = $1 AND s.emailed_at IS NULL
           AND NOT (s.stats ? 'paused') AND p.digest_enabled`,
        [weekStart],
      );

      let sent = 0, skipped = 0, paused = 0, failed = 0;
      for (const row of pending.rows) {
        try {
          const prevQ = await pool.query(
            `SELECT stats FROM mastery_snapshots
             WHERE user_id = $1 AND week_start < $2
             ORDER BY week_start DESC LIMIT 1`,
            [row.user_id, weekStart],
          );
          const prev = prevQ.rows.length ? prevQ.rows[0].stats : null;
          const unsubUrl = `${baseUrl}/digest/unsubscribe?u=${row.user_id}&t=${row.unsub_token}`;
          const mail = composeDigest({
            curr: row.stats,
            prev,
            meta: { ...meta, examDates: row.exam_dates || {}, baseUrl, unsubUrl, nowMs: now.getTime() },
          });

          if (mail.zeroWeek && await lastThreeWereZero(pool, row.user_id, weekStart)) {
            await pool.query(
              `UPDATE mastery_snapshots SET stats = stats || '{"paused": true}' WHERE id = $1`,
              [row.id],
            );
            paused++;
            continue;
          }

          const to = await fetchEmail(row.clerk_user_id);
          if (!to) {
            log.warn(`[digest] user ${row.user_id}: no address resolvable — skipped this week`);
            skipped++;
            continue;
          }

          const claim = await pool.query(
            `UPDATE mastery_snapshots
             SET emailed_at = now(), stats = jsonb_set(stats, '{zeroWeek}', $2::jsonb)
             WHERE id = $1 AND emailed_at IS NULL`,
            [row.id, JSON.stringify(mail.zeroWeek)],
          );
          if (!claim.rowCount) { skipped++; continue; } // raced another runner

          await mailer.send({ to, subject: mail.subject, html: mail.html, text: mail.text, unsubUrl });
          sent++;
        } catch (e) {
          failed++;
          // e.code only, NEVER e.message — SMTP rejection strings can echo
          // the recipient address, and addresses stay out of logs (S3 DoD).
          log.error(`[digest] user ${row.user_id}: send failed — skipped this week (${e.code || e.name || "error"})`);
        }
      }

      log.log(`[digest] week ${weekStart}: ${snap.snapshotted} snapshotted, ${sent} sent, ${skipped} skipped, ${paused} paused, ${failed} failed (${snap.optedIn} opted in)`);
      return { ran: true, weekStart, snapshotted: snap.snapshotted, sent, skipped, paused, failed };
    } finally {
      await client.query("SELECT pg_advisory_unlock($1, $2)", LOCK_KEY);
    }
  } finally {
    client.release();
  }
}
