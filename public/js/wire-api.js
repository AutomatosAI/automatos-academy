// The Wire's data source: the Automatos blog widget API.
//
// The Wire used to be a Postgres table in this repo with its own ingest key,
// validator, rate limiter and review workflow. It is now managed on the
// Automatos platform — agents author and publish with platform_publish_blog_post,
// the workspace owns the editorial state, and the Academy only reads. That
// removes the table, the ingest surface and one deploy secret from here; the
// same pattern automatos.app runs (its _fieldnotes.js is the browser half).
//
// Reads are public: no auth, CORS-enabled, keyed on workspace_id alone. The
// workspace id is not a secret — it identifies whose posts to show, exactly
// like the landing site ships it in client JS.
//
// This module is the ONE definition of the contract, imported by both the
// browser views and the server's RSS/shell/sitemap handlers, so the two can
// never drift into disagreeing about the shape (the failure that cost a
// production morning in this repo already).

/** Fields the platform returns that the Academy renders. */
const PER_PAGE_MAX = 50;

/**
 * Map a platform blog post onto the row shape the Wire's builders and views
 * already expect, so buildFeedXml / buildPostShellHtml / the SPA views did
 * not have to be rewritten around a new vocabulary.
 *
 * `sources` and `corrections` have no column on the platform: blog_posts
 * carries no structured citation or correction history. They map to empty
 * arrays, which every consumer already treats as "none to show" — the
 * citation list, the "corrected" badge and the JSON-LD citation block simply
 * do not render. If the platform grows those fields, this is the one place
 * that changes.
 */
export function mapPost(p) {
  if (!p || typeof p !== "object") return null;
  return {
    slug: String(p.slug || ""),
    title: String(p.title || ""),
    summary: String(p.excerpt || ""),
    // already-rendered HTML from the platform — every consumer runs it
    // through sanitizeHtml() before it reaches a DOM or a shell
    body_html: String(p.content || ""),
    byline: { agents: [p.author_name || "Automatos agent"] },
    type: String(p.category || "note"),
    tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
    sources: [],
    corrections: [],
    published_at: p.published_at || p.created_at || null,
    updated_at: p.updated_at || p.published_at || p.created_at || null,
    cover_image_url: p.cover_image_url || null,
    seo_title: p.seo_title || null,
    seo_description: p.seo_description || null,
    reading_time_minutes: Number(p.reading_time_minutes) || null,
  };
}

function endpoint(apiBase) {
  return `${String(apiBase || "https://api.automatos.app").replace(/\/+$/, "")}/api/widgets/blog`;
}

/**
 * @param {object} opts
 * @param {string} opts.apiBase      platform origin
 * @param {string} opts.workspaceId  whose posts to show
 * @param {number} [opts.perPage]    capped at the API's 50
 * @param {number} [opts.page]
 * @param {string} [opts.category]
 * @param {Function} [opts.fetchFn]  injectable for tests / Node
 * @returns {Promise<{posts: Array, total: number, totalPages: number, page: number}>}
 */
export async function listPosts({ apiBase, workspaceId, perPage = 20, page = 1, category = null, fetchFn } = {}) {
  if (!workspaceId) throw new Error("wire: workspaceId not configured");
  const f = fetchFn || fetch;
  const params = new URLSearchParams({
    workspace_id: workspaceId,
    per_page: String(Math.min(PER_PAGE_MAX, Math.max(1, perPage))),
    page: String(Math.max(1, page)),
  });
  if (category) params.set("category", category);
  const r = await f(`${endpoint(apiBase)}/posts?${params}`);
  if (!r.ok) throw new Error(`wire: posts ${r.status}`);
  const d = await r.json();
  const posts = Array.isArray(d) ? d : (d.posts || []);
  return {
    posts: posts.map(mapPost).filter(Boolean),
    total: Number(d.total) || posts.length,
    totalPages: Number(d.total_pages) || 1,
    page: Number(d.page) || page,
  };
}

/** One post by slug, or null when the platform has no such published post. */
export async function getPost({ apiBase, workspaceId, slug, fetchFn } = {}) {
  if (!workspaceId) throw new Error("wire: workspaceId not configured");
  if (!slug) return null;
  const f = fetchFn || fetch;
  const url = `${endpoint(apiBase)}/posts/${encodeURIComponent(slug)}?workspace_id=${encodeURIComponent(workspaceId)}`;
  const r = await f(url);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`wire: post ${r.status}`);
  return mapPost(await r.json());
}

/** Distinct categories with counts — drives the Wire's filter row. */
export async function listCategories({ apiBase, workspaceId, fetchFn } = {}) {
  if (!workspaceId) return [];
  const f = fetchFn || fetch;
  const r = await f(`${endpoint(apiBase)}/categories?workspace_id=${encodeURIComponent(workspaceId)}`);
  if (!r.ok) return [];
  const d = await r.json();
  if (!Array.isArray(d)) return [];
  return d.map((x) => (typeof x === "string" ? { category: x, count: 0 } : { category: x.category, count: Number(x.count) || 0 }))
    .filter((x) => x.category);
}
