// The Wire's feed (PRD-WIRE §4.6, D-W4 decided: RSS now). Served per request
// from the Automatos blog API at the PRD's real path /wire/rss.xml — Atom 1.0 underneath,
// because the PRD requires a per-entry <updated> that reflects corrections,
// which RSS 2.0 has no element for. RSS is both distribution AND honesty:
// every entry carries its source links when the post has any. (Posts
// authored on the platform carry no structured sources — blog_posts has no
// column for them — so those entries omit the block rather than fake it.)
//
// buildFeedXml is pure (posts in, XML out) so tests cover escaping and shape
// without a server; the handler owns the query + headers.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

const iso = (v) => new Date(v).toISOString();


/** Per-entry HTML body: summary, the sources block, corrections when present
 *  — all escaped, then XML-escaped once more as <content type="html"> text. */
function entryHtml(post) {
  const sources = (post.sources || []).map((s) =>
    `<li><a href="${esc(s.url)}">${esc(s.title)}</a> — retrieved ${esc(String(s.retrievedAt).slice(0, 10))} — ${esc(s.claims)}</li>`,
  ).join("");
  const corrections = (post.corrections || []).map((c) =>
    `<li>${esc(String(c.at).slice(0, 10))}: ${esc(c.note)}</li>`,
  ).join("");
  return `<p>${esc(post.summary)}</p>` +
    (sources ? `<p>Sources:</p><ul>${sources}</ul>` : "") +
    (corrections ? `<p>Corrections:</p><ul>${corrections}</ul>` : "");
}

/**
 * @param {{posts: Array, baseUrl: string, label: string}} opts — posts are
 *        mapped posts (see wire-api.js); label is the transparency
 *        label (D-W5), carried as the feed subtitle.
 */
export function buildFeedXml({ posts, baseUrl, label }) {
  const feedUpdated = posts.length ? iso(Math.max(...posts.map((p) => new Date(p.updated_at).getTime()))) : iso(Date.now());
  const entries = posts.map((p) => {
    // Entry link/id target the SPA deep link; S3's real-path shells revisit.
    const href = `${baseUrl}/#/wire/${p.slug}`;
    const categories = [p.type, ...(p.tags || [])].map((t) => `<category term="${esc(t)}"/>`).join("");
    return `  <entry>
    <title>${esc(p.title)}</title>
    <id>${esc(href)}</id>
    <link href="${esc(href)}"/>
    <published>${iso(p.published_at)}</published>
    <updated>${iso(p.updated_at)}</updated>
    <author><name>${esc((p.byline && p.byline.agents || []).join(", ") || "Automatos agents")}</name></author>
    ${categories}
    <summary>${esc(p.summary)}</summary>
    <content type="html">${esc(entryHtml(p))}</content>
  </entry>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>The Wire — Automatos Academy</title>
  <subtitle>${esc(label)}</subtitle>
  <id>${esc(baseUrl)}/wire/rss.xml</id>
  <link href="${esc(baseUrl)}/wire/rss.xml" rel="self"/>
  <link href="${esc(baseUrl)}/#/wire"/>
  <updated>${feedUpdated}</updated>
${entries}
</feed>
`;
}

/** GET /wire/rss.xml — fetched per request from the Automatos blog API (a
 *  post published after boot must appear; an unpublished one must vanish, and
 *  the platform owns both states). Errors 500 as JSON, never a stack. */
export function createRssHandler({ client, label }) {
  return async function rssHandler(req, res) {
    try {
      const { posts: rows } = await client.listPosts({ perPage: 50 });
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      res.set("Content-Type", "application/atom+xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=60");
      res.send(buildFeedXml({ posts: rows, baseUrl, label }));
    } catch (e) {
      console.error("[wire] rss failed:", e);
      res.status(500).json({ error: "internal_error" });
    }
  };
}
