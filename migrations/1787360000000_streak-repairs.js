/**
 * PRD-WAVE-LEARNER-UX LX-11 — streak mercy (D-LX3: repair-by-doing).
 *
 * A repair row makes one missed UTC day count as active in the streak
 * computation (me-routes STREAK_SQL unions it into the day set). Rows are
 * written server-side by the /api/sync/progress path when the repair rule
 * holds: today became active, exactly yesterday is missing, the day before
 * was active, and no repair was granted in the trailing 7 days. Never
 * client-writable — mercy is policy, not an input.
 */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE streak_repairs (
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day        date NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, day)
    );
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS streak_repairs;`);
}
