/**
 * PRD-WIRE S1 — the Wire's post store: agent-authored news posts, verified at
 * the ingest boundary (§4.3), reviewable (D-W1) and immutable-after-publish
 * with appended corrections (D-W2). Net-new and unrelated to the Spine and to
 * U3's content_documents — course content stays git-canonical; nothing here
 * touches the content tree.
 *
 * Schema decisions (documented here per the PRD, mirrored in the PR body):
 *
 * 1. `post_id` is the client-supplied idempotency key (the mission run id).
 *    Its UNIQUE index is what `INSERT … ON CONFLICT (post_id)` rides so a
 *    crashed-and-re-run mission replaces its own draft instead of duplicating
 *    it (US-W4); the DO UPDATE's `WHERE status = 'draft'` makes re-POST after
 *    publish a clean 409 in the same statement (D-W2: corrections are the
 *    only post-publish mutation).
 *
 * 2. `unpublish_reason` (one column beyond PRD §4.1). The unpublish call
 *    requires `{reason}` and rows are "retained for audit, never deleted" —
 *    a required audit fact needs somewhere durable to live. It is never
 *    rendered on any public surface (unpublished posts vanish everywhere);
 *    a repeated unpublish overwrites it (last reason wins, updated_at says
 *    when).
 *
 * 3. CHECKs mirror the §4.3 boundary validation (caps, slug shape, enums) so
 *    a bug in the API layer can't quietly store an over-cap or malformed row
 *    — the same defense-in-depth instinct as content_documents' scope-shape
 *    CHECK. `sources`/`byline`/`corrections` internal shape is enforced at
 *    the boundary only (server/wire/validate.js): jsonb CHECKs deep enough
 *    to re-state it would duplicate the validator in a second language.
 *
 * 4. The one hot query is the public list (`status = 'published' ORDER BY
 *    published_at DESC LIMIT n`) — a partial index covers exactly that and
 *    stays tiny however many drafts/unpublished audit rows accumulate. Slug
 *    and post_id lookups ride their UNIQUE btrees.
 *
 * 5. A published row must carry `published_at` (CHECK) — the list/RSS sort
 *    key can never be NULL for a visible post. Unpublished rows KEEP their
 *    old published_at (audit: when it had been live).
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE wire_posts (
      id               bigserial PRIMARY KEY,
      post_id          text NOT NULL UNIQUE
                         CHECK (char_length(post_id) BETWEEN 1 AND 200),
      slug             text NOT NULL UNIQUE
                         CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
      type             text NOT NULL
                         CHECK (type IN ('model-news', 'trend', 'new-course', 'question-refresh', 'changelog')),
      tags             text[] NOT NULL DEFAULT '{}'
                         CHECK (cardinality(tags) <= 8),
      title            text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
      summary          text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 300),
      body_md          text NOT NULL CHECK (octet_length(body_md) BETWEEN 1 AND 32768),
      sources          jsonb NOT NULL,
      byline           jsonb NOT NULL,
      status           text NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'published', 'unpublished')),
      corrections      jsonb NOT NULL DEFAULT '[]',
      unpublish_reason text,
      published_at     timestamptz,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now(),
      -- decision 5: everything that ever went live has a sort key
      CONSTRAINT wire_posts_published_needs_at CHECK (status <> 'published' OR published_at IS NOT NULL)
    );

    -- decision 4: the public list/RSS access path, drafts excluded
    CREATE INDEX wire_posts_published_idx
      ON wire_posts (published_at DESC) WHERE status = 'published';
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS wire_posts;
  `);
}
