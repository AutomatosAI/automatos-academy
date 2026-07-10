/**
 * PRD-MT-02 US-021 — the Spine's initial schema: all seven user-state tables
 * from 02-architecture §3, verbatim columns plus the decisions below.
 *
 * Schema decisions (documented here per the PRD, mirrored in the PR body):
 *
 * 1. Path-scope rows (mastery_map). A `path` scope may span tracks (02 §3),
 *    so path rows carry the path's globally-unique id as `scope_id` with
 *    `vendor_id`/`track_id` NULL — a path is not owned by any one track, and
 *    path ids are globally unique per CONTENT-API-CONTRACT §3.1, so F4's
 *    "qualify ids by track" rule has nothing to disambiguate. The shape is
 *    enforced by CHECK (domain rows must carry both ids; path rows neither),
 *    and uniqueness uses UNIQUE NULLS NOT DISTINCT so a user can't grow
 *    duplicate path rows. Requires PostgreSQL >= 15.
 *
 * 2. `event_id` on telemetry + mock_attempts. Both tables are append-only, so
 *    idempotent sync retry (US-023) needs an explicit per-event uuid dedupe
 *    key; UNIQUE (user_id, event_id) + ON CONFLICT DO NOTHING makes replays
 *    free. The upserted tables (progress, scenario_progress) dedupe naturally
 *    on their scope key + later-wall-clock-wins rule (02 §5), so they don't
 *    carry event_id. This is the one column addition over 02 §3.
 *
 * 3. `progress.answered_at` is the conflict comparator — the *device
 *    wall-clock* of the winning answer (02 §5), never server arrival time.
 *
 * 4. content_cache stays dormant in the pilot (PRD §8 open question): the
 *    table exists so export/deletion cover it, but no route writes it yet.
 *
 * 5. Every content-referencing table carries vendor_id + track_id (F4) —
 *    content ids are unique only within a track. telemetry's pair is nullable
 *    for non-content events (02 §3); mastery_map's is nullable for path rows
 *    (decision 1); everywhere else NOT NULL.
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    -- ── users — Clerk-linked identity ─────────────────────────────────
    CREATE TABLE users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_user_id text NOT NULL UNIQUE,
      workspace_id  uuid NOT NULL,
      plan          text NOT NULL DEFAULT 'free',
      created_at    timestamptz NOT NULL DEFAULT now()
    );

    -- ── mastery_map — per-user competence vector, server-derived ──────
    -- competence is stored RAW (high-water) and decayed on read (03 §2);
    -- clients never write it.
    CREATE TABLE mastery_map (
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vendor_id  text,
      track_id   text,
      scope_type text NOT NULL CHECK (scope_type IN ('domain', 'path')),
      scope_id   text NOT NULL,
      competence double precision NOT NULL CHECK (competence >= 0 AND competence <= 1),
      decay_at   timestamptz NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      -- decision 1: domain rows are track-qualified, path rows are global
      CONSTRAINT mastery_map_scope_shape CHECK (
        (scope_type = 'domain' AND vendor_id IS NOT NULL AND track_id IS NOT NULL)
        OR (scope_type = 'path' AND vendor_id IS NULL AND track_id IS NULL)
      ),
      CONSTRAINT mastery_map_scope_uniq
        UNIQUE NULLS NOT DISTINCT (user_id, vendor_id, track_id, scope_type, scope_id)
    );
    CREATE INDEX mastery_map_user_track_idx ON mastery_map (user_id, track_id);

    -- ── progress — SM-2 item state (mirrors store.js q-shape) ─────────
    CREATE TABLE progress (
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vendor_id   text NOT NULL,
      track_id    text NOT NULL,
      item_id     text NOT NULL,
      seen        integer NOT NULL DEFAULT 0,
      correct     integer NOT NULL DEFAULT 0,
      ease        double precision NOT NULL DEFAULT 2.3,
      "interval"  integer NOT NULL DEFAULT 0,
      due_at      timestamptz,
      answered_at timestamptz NOT NULL,
      CONSTRAINT progress_item_uniq UNIQUE (user_id, vendor_id, track_id, item_id)
    );
    CREATE INDEX progress_user_track_idx ON progress (user_id, track_id);
    CREATE INDEX progress_user_due_idx ON progress (user_id, due_at);

    -- ── content_cache — offline snapshot bookkeeping (dormant in pilot) ─
    CREATE TABLE content_cache (
      user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scope_id        text NOT NULL,
      payload         jsonb,
      content_version text,
      synced_at       timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT content_cache_scope_uniq UNIQUE (user_id, scope_id)
    );

    -- ── telemetry — append-only events (personalization + factory loop) ─
    CREATE TABLE telemetry (
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id   uuid NOT NULL,
      vendor_id  text,
      track_id   text,
      event_type text NOT NULL CHECK (event_type IN ('answer', 'card_outcome', 'session', 'scenario')),
      item_id    text,
      payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT telemetry_event_uniq UNIQUE (user_id, event_id)
    );
    CREATE INDEX telemetry_user_track_idx ON telemetry (user_id, track_id);

    -- ── mock_attempts — whole-exam attempts (readiness gate Part 2, F6) ─
    CREATE TABLE mock_attempts (
      user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id  uuid NOT NULL,
      vendor_id text NOT NULL,
      track_id  text NOT NULL,
      scaled    integer NOT NULL,
      passed    boolean NOT NULL,
      "at"      timestamptz NOT NULL,
      CONSTRAINT mock_attempts_event_uniq UNIQUE (user_id, event_id)
    );
    CREATE INDEX mock_attempts_user_track_idx ON mock_attempts (user_id, track_id);

    -- ── scenario_progress — branching-scenario state (F17) ─────────────
    CREATE TABLE scenario_progress (
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vendor_id   text NOT NULL,
      track_id    text NOT NULL,
      scenario_id text NOT NULL,
      step        integer NOT NULL DEFAULT 0,
      score_pct   double precision NOT NULL DEFAULT 0,
      updated_at  timestamptz NOT NULL,
      CONSTRAINT scenario_progress_uniq UNIQUE (user_id, vendor_id, track_id, scenario_id)
    );
    CREATE INDEX scenario_progress_user_track_idx ON scenario_progress (user_id, track_id);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS scenario_progress;
    DROP TABLE IF EXISTS mock_attempts;
    DROP TABLE IF EXISTS telemetry;
    DROP TABLE IF EXISTS content_cache;
    DROP TABLE IF EXISTS progress;
    DROP TABLE IF EXISTS mastery_map;
    DROP TABLE IF EXISTS users;
  `);
}
