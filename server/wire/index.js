// Wire assembly — the Academy's news surface, now READ-ONLY.
//
// Posts used to live in this repo: a wire_posts table, an ingest API behind
// X-Wire-Key, a validator, an IP rate limiter and a draft/publish/correction
// workflow. All of that is gone. The Wire is managed on the Automatos
// platform — agents research, write and publish with platform_publish_blog_post,
// the workspace owns editorial state, and the Academy only reads. Same
// pattern automatos.app runs (_fieldnotes.js is its browser half).
//
// What that removed from here: one table, one migration, one deploy secret
// (WIRE_INGEST_KEY), the publish-policy switch, ~450 lines of ingest surface,
// and the possibility of the Academy's copy of a post disagreeing with the
// platform's.
//
// Where landing V2 has the browser call api.automatos.app directly, this
// mounts a thin same-origin proxy instead. Three reasons, all specific to
// having a server at all: the SPA already speaks /api/wire/*, so its
// feature-detect posture (501 when the Wire is off) survives untouched; the
// RSS, sitemap and per-slug shells must be rendered server-side for crawlers
// regardless, so the fetch code exists either way and this way there is one
// copy of it; and one 60s cache in front of the platform serves every reader
// instead of each browser fetching for itself.
//
// Injectable for tests:
//   workspaceId — whose posts to show (ACADEMY_WORKSPACE_ID)
//   apiBase     — platform origin
//   fetchFn     — stub the platform without a network
//   humanReviewed — whether drafts are genuinely reviewed before publishing,
//                   which is the only thing that earns the label's review clause
import { listPosts, getPost } from "../../public/js/wire-api.js";
import { createRssHandler } from "./rss.js";
import { createShellHandler, createSitemapHandler } from "./shell.js";
import { transparencyLabel } from "./label.js";

const CACHE_MS = 60_000;

/** Tiny TTL cache: the platform is the source of truth, but a burst of
 *  readers (or a crawler walking the sitemap) should not become a burst of
 *  upstream calls. Keyed by the call's own arguments. */
function createCache(ttl = CACHE_MS) {
  const entries = new Map();
  return async function cached(key, produce) {
    const hit = entries.get(key);
    const now = Date.now();
    if (hit && now - hit.at < ttl) return hit.value;
    try {
      const value = await produce();
      entries.set(key, { at: now, value });
      return value;
    } catch (e) {
      // serve stale rather than fail a page when the platform blips
      if (hit) return hit.value;
      throw e;
    }
  };
}

export function createWireClient({ workspaceId, apiBase, fetchFn, ttl } = {}) {
  if (!workspaceId) throw new Error("[wire] createWireClient requires a workspaceId");
  const cache = createCache(ttl);
  const base = { apiBase, workspaceId, fetchFn };
  return {
    workspaceId,
    listPosts: ({ perPage = 20, page = 1, category = null } = {}) =>
      cache(`list:${perPage}:${page}:${category || ""}`, () => listPosts({ ...base, perPage, page, category })),
    getPost: (slug) => cache(`post:${slug}`, () => getPost({ ...base, slug })),
  };
}

export function mountWire(app, opts = {}) {
  const workspaceId = opts.workspaceId;
  if (!workspaceId) throw new Error("[wire] mountWire requires ACADEMY_WORKSPACE_ID");

  const client = opts.client || createWireClient({
    workspaceId,
    apiBase: opts.apiBase,
    fetchFn: opts.fetchFn,
  });
  const label = transparencyLabel(opts.humanReviewed);

  // Public reads the SPA consumes. Shape is unchanged from the DB era —
  // {posts, transparency} — so the views did not need rewriting around a new
  // envelope; only the body field moved from markdown to sanitised HTML.
  app.get("/api/wire/posts", async (req, res) => {
    try {
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const { posts, total, totalPages, page } = await client.listPosts({
        perPage: limit,
        page: Math.max(1, parseInt(req.query.page, 10) || 1),
        category: req.query.category || null,
      });
      res.set("Cache-Control", "public, max-age=60");
      res.json({ posts, total, totalPages, page, transparency: label });
    } catch (e) {
      console.error("[wire] list failed:", e.message);
      res.status(502).json({ error: "upstream_unavailable" });
    }
  });

  app.get("/api/wire/posts/:slug", async (req, res) => {
    try {
      const post = await client.getPost(req.params.slug);
      if (!post) return res.status(404).json({ error: "not_found" });
      res.set("Cache-Control", "public, max-age=60");
      res.json({ post, transparency: label });
    } catch (e) {
      console.error("[wire] post failed:", e.message);
      res.status(502).json({ error: "upstream_unavailable" });
    }
  });

  app.get("/wire/rss.xml", createRssHandler({ client, label }));
  // Real-path SEO surfaces, fetched per request so a post published after
  // boot appears and an unpublished one vanishes — boot-time
  // generate-shells.mjs can see neither. rss/sitemap register first; the
  // :slug matcher excludes dots anyway, so the fixed paths can't be shadowed.
  app.get("/wire/sitemap.xml", createSitemapHandler({ client }));
  app.get("/wire/:slug([a-z0-9-]+)", createShellHandler({ client, label }));

  return { client, workspaceId, label };
}
