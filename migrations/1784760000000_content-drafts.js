/**
 * PRD-CONTENT-LIFECYCLE S1 — content_drafts: the text write-back store.
 *
 * The seam that lets Automatos's daily mission (and a human admin) PROPOSE a
 * content change without touching git. A draft is one scope's proposed
 * canonical bytes (a whole manifest/track/domain/paths/levels/podcasts
 * document), pending review. On approval the serve-time overlay
 * (server/content/overlay.js) renders it over the git/DB base at /api/catalog
 * — the exact media_bindings pattern, one plane for text as videos already
 * have — so an approved draft goes live with NO republish and NO pointer flip.
 *
 * Decisions (mirrored in the PR body):
 *
 * 1. SCOPE-LEVEL drafts, not field patches. A draft carries the ENTIRE
 *    document for a scope (byte-fidelity: `canonical` is served verbatim as
 *    `JSON.parse(canonical)`, its sha256 is the ETag). This matches
 *    content_documents' unit and keeps the overlay a whole-node swap — no
 *    risky field-merge. The generator reads /api/catalog/inventory first and
 *    emits the full updated document (check-before-create, story 4).
 *
 * 2. ONE APPROVED DRAFT PER SCOPE wins the overlay — a partial UNIQUE index
 *    (NULLS NOT DISTINCT, PG15+, same as content_documents) enforces it. The
 *    approve txn supersedes the prior approved row for that scope first, so a
 *    scope's live override is always exactly the last thing approved.
 *
 * 3. IDEMPOTENT proposals — a second identical pending draft for a scope
 *    (same sha256) is a no-op (partial UNIQUE while status='pending'); the
 *    write-back returns the existing row rather than stacking duplicates, so a
 *    daily mission re-run never floods the queue.
 *
 * 4. Same scope-shape CHECK as content_documents (singleton scopes carry no
 *    ids; track carries vendor+track; domain carries all three) so a draft can
 *    only ever describe a real, servable scope.
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE content_drafts (
      id            bigserial PRIMARY KEY,
      scope_kind    text NOT NULL CHECK (scope_kind IN ('manifest', 'track', 'domain', 'paths', 'levels', 'podcasts')),
      vendor_id     text,
      track_id      text,
      domain_id     text,
      rel_path      text NOT NULL,
      canonical     text NOT NULL,
      payload       jsonb NOT NULL,
      sha256        text NOT NULL,
      bytes         integer NOT NULL,
      status        text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
      source        text NOT NULL DEFAULT 'admin',
      note          text,
      created_by    text,
      created_at    timestamptz NOT NULL DEFAULT now(),
      reviewed_by   text,
      reviewed_at   timestamptz,
      CONSTRAINT content_drafts_scope_shape CHECK (
        (scope_kind IN ('manifest', 'paths', 'levels', 'podcasts')
          AND vendor_id IS NULL AND track_id IS NULL AND domain_id IS NULL)
        OR (scope_kind = 'track'
          AND vendor_id IS NOT NULL AND track_id IS NOT NULL AND domain_id IS NULL)
        OR (scope_kind = 'domain'
          AND vendor_id IS NOT NULL AND track_id IS NOT NULL AND domain_id IS NOT NULL)
      )
    );

    -- Exactly one APPROVED draft per scope may exist (it is the live override).
    CREATE UNIQUE INDEX content_drafts_one_approved_per_scope
      ON content_drafts (scope_kind, vendor_id, track_id, domain_id)
      NULLS NOT DISTINCT
      WHERE status = 'approved';

    -- Idempotency: identical proposed bytes for a scope don't stack while pending.
    CREATE UNIQUE INDEX content_drafts_pending_dedupe
      ON content_drafts (scope_kind, vendor_id, track_id, domain_id, sha256)
      NULLS NOT DISTINCT
      WHERE status = 'pending';

    -- Review queue read path (list pending, newest first).
    CREATE INDEX content_drafts_status_created ON content_drafts (status, created_at DESC);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS content_drafts;`);
}
