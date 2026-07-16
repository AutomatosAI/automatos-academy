/**
 * PRD-U3 S1 — content-to-Postgres schema: published content documents,
 * the durable version journal, and the single-row current pointer.
 *
 * Schema decisions (documented here per the PRD, mirrored in the PR body):
 *
 * 1. BYTE-FIDELITY (PRD-U3 §8 — "the whole game"). jsonb normalises key
 *    order/whitespace, which would silently change ETags (sha256 over the raw
 *    file bytes) and bust every mobile/web cache on the files→db flip. So each
 *    document row stores BOTH:
 *      - `canonical` text — the exact file bytes (utf8) as read from git; this
 *        is what gets hashed AND what the loader JSON.parses to serve, so the
 *        served body + ETag are bit-identical to files mode;
 *      - `payload` jsonb — the same document, for queryability only. Never
 *        served, never hashed.
 *
 * 2. `rel_path` (one column beyond PRD §4.1). The contentVersion rollup is a
 *    short hash over the sorted (relative path, per-file hash) list — domain
 *    files roll up under their FILENAME, which is not derivable from
 *    `domain_id`. Storing the path lets the db loader recompute the rollup
 *    from rows and refuse to serve if it doesn't equal the stored
 *    `content_version` — an integrity tripwire on every boot/refresh, not
 *    just in CI.
 *
 * 3. `content_versions` IS the durable delta journal (PRD-U3 goal 4): one row
 *    per published version with the per-scope hash snapshot the existing
 *    `computeChanges(from, to)` diffs. Retention is unbounded (tiny rows) so
 *    `/changes?since=` survives restarts and 410 becomes rare. Documents
 *    FK-cascade from their version row, so retiring an old version is one
 *    DELETE.
 *
 * 4. `content_current` is a single-row pointer table (`id boolean PK CHECK
 *    (id)` admits exactly one row, `true`). Publish flips it inside the same
 *    transaction as the inserts; rollback is one UPDATE pointing back — the
 *    FK guarantees it can only point at a published version.
 *
 * 5. Indexes: the UNIQUE constraint's btree leads on `content_version`, which
 *    is exactly the loader's access path (`WHERE content_version = $1`) — no
 *    separate index needed. UNIQUE NULLS NOT DISTINCT (PostgreSQL >= 15, same
 *    as the Spine's mastery_map) stops duplicate singleton scopes, whose
 *    vendor/track/domain ids are NULL.
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    -- ── content_versions — durable version journal (one row per publish) ─
    CREATE TABLE content_versions (
      content_version text PRIMARY KEY,
      scopes          jsonb NOT NULL,
      published_at    timestamptz NOT NULL DEFAULT now()
    );

    -- ── content_documents — the published files, canonical bytes + jsonb ─
    CREATE TABLE content_documents (
      id              bigserial PRIMARY KEY,
      scope_kind      text NOT NULL CHECK (scope_kind IN ('manifest', 'track', 'domain', 'paths', 'levels', 'podcasts')),
      vendor_id       text,
      track_id        text,
      domain_id       text,
      rel_path        text NOT NULL,
      payload         jsonb NOT NULL,
      canonical       text NOT NULL,
      sha256          text NOT NULL,
      bytes           integer NOT NULL,
      content_version text NOT NULL REFERENCES content_versions(content_version) ON DELETE CASCADE,
      published_at    timestamptz NOT NULL DEFAULT now(),
      -- singleton scopes carry no ids; track scope carries vendor+track;
      -- domain scope carries all three (decision 5's shape rule, content flavour)
      CONSTRAINT content_documents_scope_shape CHECK (
        (scope_kind IN ('manifest', 'paths', 'levels', 'podcasts')
          AND vendor_id IS NULL AND track_id IS NULL AND domain_id IS NULL)
        OR (scope_kind = 'track'
          AND vendor_id IS NOT NULL AND track_id IS NOT NULL AND domain_id IS NULL)
        OR (scope_kind = 'domain'
          AND vendor_id IS NOT NULL AND track_id IS NOT NULL AND domain_id IS NOT NULL)
      ),
      CONSTRAINT content_documents_version_scope_uniq
        UNIQUE NULLS NOT DISTINCT (content_version, scope_kind, vendor_id, track_id, domain_id)
    );

    -- ── content_current — single-row pointer to the served version ───────
    CREATE TABLE content_current (
      id              boolean PRIMARY KEY DEFAULT true CHECK (id),
      content_version text NOT NULL REFERENCES content_versions(content_version),
      updated_at      timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS content_current;
    DROP TABLE IF EXISTS content_documents;
    DROP TABLE IF EXISTS content_versions;
  `);
}
