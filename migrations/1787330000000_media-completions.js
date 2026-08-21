/**
 * PRD-WAVE-LEARNER-UX LX-1 — media completion.
 *
 * One row per (user, track, media slot): the learner finished this video /
 * podcast / narration, or explicitly un-marked it (completed_at NULL — the row
 * must survive an unmark so /api/me/state can sync the un-completion as a
 * delta; a DELETE would be invisible to `since` pulls).
 *
 * media_id repeats across tracks (every track has a v-ov-1), so the PK spans
 * vendor/track/media. `how` records auto (ended / ≥90%, D-LX1) vs manual.
 */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE media_completions (
      user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vendor_id    text NOT NULL,
      track_id     text NOT NULL,
      kind         text NOT NULL CHECK (kind IN ('video','podcast','narration')),
      media_id     text NOT NULL,
      completed_at timestamptz,
      how          text NOT NULL DEFAULT 'auto' CHECK (how IN ('auto','manual')),
      updated_at   timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, vendor_id, track_id, media_id)
    );
    CREATE INDEX media_completions_user_updated ON media_completions (user_id, updated_at);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS media_completions;`);
}
