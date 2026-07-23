/**
 * PRD-WAVE-CONTENT-OPS C3 — media_bindings: the operational fulfilment of a
 * content media slot. WORDS live in git → Postgres (content_documents, U3);
 * which MP4/MP3/transcript fills a slot is OPERATIONAL data written by the
 * admin UI or the Automatos API, never a git commit.
 *
 * Schema decisions:
 *
 * 1. UNIQUE(vendor_id, track_id, slot_id, kind) — one binding per slot per
 *    media kind; re-upload upserts (ON CONFLICT), so replacing a video is a
 *    single idempotent write and there is never a duplicate to reconcile.
 *
 * 2. `url` is the CDN URL the object landed at (academy/<vendor>/<track>/…);
 *    the content index OVERLAYS it at serve time so a bound slot renders
 *    published without a republish (the PR2 overlay).
 *
 * 3. `kind` CHECK ('video'|'audio'|'transcript') mirrors the app's media
 *    classes; audio bindings are what the voice pipeline writes, transcript
 *    backs the podcast read-along.
 *
 * 4. No FK to a slot table — slots are DEFINED in the git content
 *    (track.json `videos[]`), validated at the API boundary against the live
 *    content index, not by the database (the exam_dates precedent).
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS media_bindings (
      id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      vendor_id     text        NOT NULL,
      track_id      text        NOT NULL,
      slot_id       text        NOT NULL,
      kind          text        NOT NULL CHECK (kind IN ('video', 'audio', 'transcript')),
      url           text        NOT NULL,
      content_type  text,
      size_bytes    bigint,
      uploaded_by   text,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      UNIQUE (vendor_id, track_id, slot_id, kind)
    );

    CREATE INDEX IF NOT EXISTS media_bindings_track_idx
      ON media_bindings (vendor_id, track_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS media_bindings;`);
};
