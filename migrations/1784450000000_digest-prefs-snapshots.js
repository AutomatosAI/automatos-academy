/**
 * PRD-DIGEST S1+S2 — the weekly digest's only new state: per-user prefs
 * (opt-in + unsubscribe token + exam dates) and weekly mastery snapshots
 * (content assembly + send ledger in one table).
 *
 * Schema decisions (documented here per the wire-posts precedent):
 *
 * 1. `user_prefs.digest_enabled` DEFAULT false — strictly opt-in is a schema
 *    fact, not just UI copy; a bug that forgets to send the flag cannot
 *    enrol anyone.
 *
 * 2. `unsub_token` backs the signed-out one-click unsubscribe
 *    (`/digest/unsubscribe?u&t`) and the RFC 8058 List-Unsubscribe-Post
 *    header. It ROTATES on re-opt-in (me-routes upsert) so a forwarded old
 *    email can never re-toggle a learner who opted back in.
 *
 * 3. `exam_dates` jsonb is the server home PRD-WEB-LOOP's setter pushes into
 *    when signed in ({"vendorId/trackId": "YYYY-MM-DD"}) — what makes the
 *    "23 days to exam" line real. Shape is enforced at the API boundary
 *    (me-routes), not restated in a CHECK.
 *
 * 4. `mastery_snapshots.stats` holds the whole weekly fix-point as jsonb
 *    (per-track sums + per-domain raw competence + streak): `progress` is an
 *    upsert store, so "43 questions this week" cannot be recomputed after
 *    the fact — the diff needs last week's values verbatim.
 *
 * 5. UNIQUE(user_id, week_start) + `emailed_at` make the snapshot row the
 *    send ledger: any number of concurrent/replayed runners (advisory-locked
 *    anyway) converge on one row, one send, per learner per week (US-D5).
 *
 * 6. ON DELETE CASCADE matches every other child of `users` (spine-initial),
 *    and both tables ALSO join me-routes' CHILD_TABLES so the two delete
 *    flows keep reporting per-table counts — cascade is the belt, the
 *    explicit wipe is the audited path (U2 acceptance re-runs against them).
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE user_prefs (
      user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      digest_enabled boolean NOT NULL DEFAULT false,
      unsub_token    uuid NOT NULL DEFAULT gen_random_uuid(),
      exam_dates     jsonb NOT NULL DEFAULT '{}'
                       CHECK (jsonb_typeof(exam_dates) = 'object'),
      updated_at     timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE mastery_snapshots (
      id         bigserial PRIMARY KEY,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start date NOT NULL,
      taken_at   timestamptz NOT NULL DEFAULT now(),
      stats      jsonb NOT NULL
                   CHECK (jsonb_typeof(stats) = 'object'),
      emailed_at timestamptz,
      UNIQUE (user_id, week_start)
    );

    -- the send loop's one hot query: this week's unsent rows
    CREATE INDEX mastery_snapshots_unsent_idx
      ON mastery_snapshots (week_start) WHERE emailed_at IS NULL;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS mastery_snapshots;
    DROP TABLE IF EXISTS user_prefs;
  `);
}
