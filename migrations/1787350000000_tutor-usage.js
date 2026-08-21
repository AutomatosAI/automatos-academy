/**
 * PRD-WAVE-LEARNER-UX LX-15 — tutor quota (D-LX5: 10/day, UTC day boundary).
 * One row per (user, UTC day); the atomic upsert in server/tutor.js is the
 * counter. No cron: old rows are just history, and the day column makes the
 * reset a WHERE clause, not a job.
 */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE tutor_usage (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day     date NOT NULL,
      count   integer NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, day)
    );
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS tutor_usage;`);
}
