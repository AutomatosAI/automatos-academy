// The Wire's API surface (PRD-WIRE §4.2) — the platform-facing ingest
// contract plus the public read side, plus the S5 key-gated admin reads
// (review queue + unpublish audit). Writes and admin reads authenticate with
// X-Wire-Key (timing-safe, rate-limited, auth.js); public reads are cached 60 s.
//
// Idempotency (US-W4) lives in ONE statement: INSERT … ON CONFLICT (post_id)
// DO UPDATE … WHERE status = 'draft' — a re-run mission replaces its own
// draft race-free; a re-POST after publish updates nothing and falls out as
// a 409 (D-W2: published posts are immutable, corrections are the only
// post-publish mutation). A slug held by a DIFFERENT postId surfaces as the
// slug UNIQUE violation → 409 slug_taken.
import express from "express";
import { invalidInput, conflict, notFound, wrap } from "./http.js";
import { validateIngest, WIRE_TYPES, MAX_TAG_LEN, MAX_REASON, MAX_NOTE } from "./validate.js";

const iso = (v) => (v === null || v === undefined ? null : new Date(v).toISOString());

// Ingest/admin confirmations echo the stored row minus the heavy fields.
const toAdminWire = (r) => ({
  postId: r.post_id, slug: r.slug, type: r.type, tags: r.tags, title: r.title,
  summary: r.summary, status: r.status, publishedAt: iso(r.published_at),
  createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
});

// Public list rows: everything a reader (or the mission's story-level dedupe
// check) needs, without shipping every body over the list.
const toListWire = (r) => ({
  slug: r.slug, type: r.type, tags: r.tags, title: r.title, summary: r.summary,
  byline: r.byline, publishedAt: iso(r.published_at), updatedAt: iso(r.updated_at),
  correctionsCount: r.corrections_count,
});

const toPostWire = (r) => ({
  slug: r.slug, type: r.type, tags: r.tags, title: r.title, summary: r.summary,
  bodyMd: r.body_md, sources: r.sources, byline: r.byline, corrections: r.corrections,
  publishedAt: iso(r.published_at), updatedAt: iso(r.updated_at),
});

// (xmax = 0) distinguishes the fresh INSERT (201) from a draft replacement
// (200); the WHERE makes any non-draft row fall through with zero rows.
const INGEST_SQL = `
  INSERT INTO wire_posts (post_id, slug, type, tags, title, summary, body_md, sources, byline, status, published_at)
  VALUES ($1, $2, $3, $4::text[], $5, $6, $7, $8::jsonb, $9::jsonb, $10,
          CASE WHEN $10 = 'published' THEN now() ELSE NULL END)
  ON CONFLICT (post_id) DO UPDATE SET
    slug = EXCLUDED.slug, type = EXCLUDED.type, tags = EXCLUDED.tags,
    title = EXCLUDED.title, summary = EXCLUDED.summary, body_md = EXCLUDED.body_md,
    sources = EXCLUDED.sources, byline = EXCLUDED.byline,
    status = EXCLUDED.status, published_at = EXCLUDED.published_at,
    updated_at = now()
  WHERE wire_posts.status = 'draft'
  RETURNING *, (xmax = 0) AS inserted
`;

// The kill-switch's inverse is deliberate (goal 5's spirit): publish lifts a
// draft OR re-instates an unpublished post — without it, one mistaken
// unpublish would strand a correct post forever (its post_id can never be
// re-POSTed). published_at is set fresh on every transition to published.
const PUBLISH_SQL = `
  UPDATE wire_posts SET status = 'published', published_at = now(), updated_at = now()
  WHERE post_id = $1 AND status IN ('draft', 'unpublished')
  RETURNING post_id, status, published_at
`;

// Unpublish from ANY state (US-W3: one call, retry-safe): the post vanishes
// from list/RSS/post on the next request; the row is retained for audit with
// the required reason (migration decision 2). A repeat overwrites the reason.
const UNPUBLISH_SQL = `
  UPDATE wire_posts SET status = 'unpublished', unpublish_reason = $2, updated_at = now()
  WHERE post_id = $1
  RETURNING post_id, status
`;

// D-W2: corrections append-only, published posts only; updated_at bump feeds
// the RSS <updated>.
const CORRECTIONS_SQL = `
  UPDATE wire_posts SET corrections = corrections || $2::jsonb, updated_at = now()
  WHERE post_id = $1 AND status = 'published'
  RETURNING post_id, corrections, updated_at
`;

/** ISO string or epoch-ms string → ms, or null when unparseable. */
function parseBefore(v) {
  if (/^\d+$/.test(v)) return Number(v);
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? null : ms;
}

export function createWireRouter({ pool, requireKey, limiter, publishPolicy, label }) {
  const router = express.Router();

  // Public caching posture matches the PRD (max-age=60) and the catalog's
  // published-content-is-public CORS stance.
  const publicHeaders = (res) => {
    res.set("Cache-Control", "public, max-age=60");
    res.set("Access-Control-Allow-Origin", "*");
  };

  // ── POST /api/wire/posts — create (the mission's write) ──────────────
  router.post("/posts", limiter, requireKey, wrap(async (req, res) => {
    const v = validateIngest(req.body, { nowMs: Date.now(), publishPolicy });
    if (v.error) return invalidInput(res, v.error.field, v.error.reason);
    const p = v.value;
    let rows;
    try {
      ({ rows } = await pool.query(INGEST_SQL, [
        p.postId, p.slug, p.type, p.tags, p.title, p.summary, p.bodyMd,
        JSON.stringify(p.sources), JSON.stringify(p.byline), p.status,
      ]));
    } catch (e) {
      if (e.code === "23505") return conflict(res, "slug_taken"); // only the slug UNIQUE can fire here
      throw e;
    }
    if (rows.length === 0) return conflict(res, "already_published");
    return res.status(rows[0].inserted ? 201 : 200).json({ post: toAdminWire(rows[0]) });
  }));

  // ── POST /api/wire/posts/:postId/publish — D-W1 review flip ──────────
  router.post("/posts/:postId/publish", limiter, requireKey, wrap(async (req, res) => {
    const { rows } = await pool.query(PUBLISH_SQL, [req.params.postId]);
    if (rows.length === 1) {
      return res.json({ postId: rows[0].post_id, status: rows[0].status, publishedAt: iso(rows[0].published_at) });
    }
    const { rows: cur } = await pool.query("SELECT post_id, status, published_at FROM wire_posts WHERE post_id = $1", [req.params.postId]);
    if (cur.length === 0) return notFound(res);
    // already published — idempotent no-op keeps the original published_at
    return res.json({ postId: cur[0].post_id, status: cur[0].status, publishedAt: iso(cur[0].published_at) });
  }));

  // ── POST /api/wire/posts/:postId/unpublish — the kill-switch ─────────
  router.post("/posts/:postId/unpublish", limiter, requireKey, wrap(async (req, res) => {
    const reason = (req.body || {}).reason;
    if (typeof reason !== "string" || reason.length === 0 || reason.length > MAX_REASON) {
      return invalidInput(res, "reason", `must_be_string_1_to_${MAX_REASON}_chars`);
    }
    const { rows } = await pool.query(UNPUBLISH_SQL, [req.params.postId, reason]);
    if (rows.length === 0) return notFound(res);
    return res.json({ postId: rows[0].post_id, status: rows[0].status });
  }));

  // ── POST /api/wire/posts/:postId/corrections — append, visibly ───────
  router.post("/posts/:postId/corrections", limiter, requireKey, wrap(async (req, res) => {
    const note = (req.body || {}).note;
    if (typeof note !== "string" || note.length === 0 || note.length > MAX_NOTE) {
      return invalidInput(res, "note", `must_be_string_1_to_${MAX_NOTE}_chars`);
    }
    const entry = JSON.stringify({ at: new Date().toISOString(), note });
    const { rows } = await pool.query(CORRECTIONS_SQL, [req.params.postId, entry]);
    if (rows.length === 1) {
      return res.json({ postId: rows[0].post_id, corrections: rows[0].corrections, updatedAt: iso(rows[0].updated_at) });
    }
    const { rows: cur } = await pool.query("SELECT status FROM wire_posts WHERE post_id = $1", [req.params.postId]);
    if (cur.length === 0) return notFound(res);
    return conflict(res, "not_published"); // drafts are replaced by re-POST, not corrected
  }));

  // ── S5: the review queue + unpublish audit surface ───────────────────
  // D-W1(b)'s human review pass and US-W3's "retained for audit" both need a
  // READ: drafts are invisible on every public surface by design, and an
  // unpublished row's reason lives nowhere public. These two key-gated GETs
  // are that surface — authenticated API calls, not a dashboard (§3
  // non-goal). Never cached: a review/audit view must be current.
  const toAuditWire = (r) => ({
    postId: r.post_id, slug: r.slug, type: r.type, tags: r.tags, title: r.title,
    summary: r.summary, status: r.status, unpublishReason: r.unpublish_reason,
    correctionsCount: r.corrections_count, publishedAt: iso(r.published_at),
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  });

  router.get("/admin/posts", limiter, requireKey, wrap(async (req, res) => {
    const q = req.query;
    const where = [];
    const params = [];
    if (q.status !== undefined) {
      if (!["draft", "published", "unpublished"].includes(q.status)) {
        return invalidInput(res, "status", "must_be_one_of_draft|published|unpublished");
      }
      params.push(q.status); where.push(`status = $${params.length}`);
    }
    let limit = 50;
    if (q.limit !== undefined) {
      limit = Number(q.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) return invalidInput(res, "limit", "must_be_integer_1_to_200");
    }
    params.push(limit);
    const { rows } = await pool.query(
      `SELECT post_id, slug, type, tags, title, summary, status, unpublish_reason,
              jsonb_array_length(corrections)::int AS corrections_count,
              published_at, created_at, updated_at
       FROM wire_posts ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY updated_at DESC LIMIT $${params.length}`,
      params,
    );
    res.set("Cache-Control", "no-store");
    res.json({ posts: rows.map(toAuditWire) });
  }));

  // Full row for one post, any status — the body the reviewer reads before
  // the publish call, or the complete audit record after an unpublish.
  router.get("/admin/posts/:postId", limiter, requireKey, wrap(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM wire_posts WHERE post_id = $1", [req.params.postId]);
    if (rows.length === 0) return notFound(res);
    const r = rows[0];
    res.set("Cache-Control", "no-store");
    res.json({
      post: {
        ...toAuditWire({ ...r, corrections_count: (r.corrections || []).length }),
        bodyMd: r.body_md, sources: r.sources, byline: r.byline, corrections: r.corrections,
      },
    });
  }));

  // ── GET /api/wire/posts — public list (published only, newest first) ─
  router.get("/posts", wrap(async (req, res) => {
    const q = req.query;
    const where = ["status = 'published'"];
    const params = [];
    if (q.type !== undefined) {
      if (!WIRE_TYPES.includes(q.type)) return invalidInput(res, "type", `must_be_one_of_${WIRE_TYPES.join("|")}`);
      params.push(q.type); where.push(`type = $${params.length}`);
    }
    if (q.tag !== undefined) {
      if (typeof q.tag !== "string" || q.tag.length === 0 || q.tag.length > MAX_TAG_LEN) {
        return invalidInput(res, "tag", `must_be_string_1_to_${MAX_TAG_LEN}_chars`);
      }
      params.push(q.tag); where.push(`$${params.length} = ANY(tags)`);
    }
    if (q.before !== undefined) {
      const ms = typeof q.before === "string" ? parseBefore(q.before) : null;
      if (ms === null) return invalidInput(res, "before", "must_be_iso_timestamp_or_epoch_ms");
      params.push(new Date(ms)); where.push(`published_at < $${params.length}`);
    }
    let limit = 20;
    if (q.limit !== undefined) {
      limit = Number(q.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) return invalidInput(res, "limit", "must_be_integer_1_to_50");
    }
    params.push(limit);
    const { rows } = await pool.query(
      `SELECT slug, type, tags, title, summary, byline, published_at, updated_at,
              jsonb_array_length(corrections)::int AS corrections_count
       FROM wire_posts WHERE ${where.join(" AND ")}
       ORDER BY published_at DESC LIMIT $${params.length}`,
      params,
    );
    publicHeaders(res);
    res.json({ posts: rows.map(toListWire), transparency: label });
  }));

  // ── GET /api/wire/posts/:slug — one published post, full ─────────────
  router.get("/posts/:slug", wrap(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT slug, type, tags, title, summary, body_md, sources, byline, corrections,
              published_at, updated_at
       FROM wire_posts WHERE slug = $1 AND status = 'published'`,
      [req.params.slug],
    );
    if (rows.length === 0) return notFound(res);
    publicHeaders(res);
    res.json({ post: toPostWire(rows[0]), transparency: label });
  }));

  return router;
}
