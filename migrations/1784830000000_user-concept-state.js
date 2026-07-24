/**
 * PRD-WAVE-LIVING-ACADEMY LA-2 — `user_concept_state`: topic-level learner
 * state, so the scheduler can reason about CONCEPTS and not just items.
 *
 * The decision this table encodes (PRD §2, 2026-07-24): learner state is
 * **rows keyed to shared concept ids**, explicitly NOT per-user `graph.json`
 * blobs. The "personal graph" is the shared graph coloured at read time. That
 * means it is queryable ("which learners are weak on d3 retrieval-filtering?"),
 * aggregatable (the flywheel, LA-12), and needs no blob migration when the
 * concept model gets finer (D-LA3 adds a fourth key segment; existing rows
 * stay valid).
 *
 * Derived, never client-written — the same rule mastery_map obeys (02 §5).
 * Devices push raw events; the Spine re-derives this inside the same
 * transaction as the progress upsert, from the merged authoritative rows.
 * A device can therefore never inflate its own mastery.
 *
 * Two notes on the columns:
 *
 * 1. `concept_key` is the WHOLE key (`vendor/track/domain[/lesson]`), stored
 *    denormalised alongside vendor_id/track_id. The key is the join surface
 *    that survives the content model getting finer; the split ids are what
 *    every existing index and per-track query already speaks. Both, cheaply.
 *
 * 2. `lapses` counts RECORDED MISSES across the concept's items (Σ seen −
 *    Σ correct), not SM-2 lapses in the strict sense — the Spine keeps merged
 *    item state, not per-answer history, so misses are the honest signal the
 *    raw rows support. Named for what the scheduler uses it as; documented for
 *    what it actually is.
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE user_concept_state (
      user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      concept_key  text NOT NULL,
      vendor_id    text NOT NULL,
      track_id     text NOT NULL,
      level        text NOT NULL CHECK (level IN ('vendor', 'track', 'domain', 'lesson')),
      -- competence stored RAW, like mastery_map; decay is applied on read
      mastery      double precision NOT NULL DEFAULT 0,
      coverage     double precision NOT NULL DEFAULT 0,
      accuracy     double precision NOT NULL DEFAULT 0,
      -- how many of the concept's items the learner has actually touched, and
      -- how big the pool is — the pair that makes mastery honest to read
      items_seen   integer NOT NULL DEFAULT 0,
      items_total  integer NOT NULL DEFAULT 0,
      -- due pressure: items due at derive time, and when the next one lands
      due_count    integer NOT NULL DEFAULT 0,
      next_due_at  timestamptz,
      lapses       integer NOT NULL DEFAULT 0,
      last_seen_at timestamptz,
      updated_at   timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT user_concept_state_uniq PRIMARY KEY (user_id, concept_key)
    );

    -- The read path: "/api/me/state?since=" pulls a user's changed rows.
    CREATE INDEX user_concept_state_user_updated_idx
      ON user_concept_state (user_id, updated_at DESC);

    -- The scheduler's read path: weak/overdue concepts for one track.
    CREATE INDEX user_concept_state_user_track_idx
      ON user_concept_state (user_id, vendor_id, track_id);

    -- The aggregate path (LA-12 flywheel, LA-13 demand): everyone on a
    -- concept. Aggregate-only remains the platform boundary — this index
    -- serves counts and distributions, never a per-learner cross-user read.
    CREATE INDEX user_concept_state_concept_idx
      ON user_concept_state (concept_key);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS user_concept_state;`);
}
