// The Wire's feed (PRD-WIRE §4.6, D-W4 decided: RSS now). Served from the DB
// per request at the PRD's real path /wire/rss.xml — Atom 1.0 underneath,
// because the PRD requires a per-entry <updated> that reflects corrections,
// which RSS 2.0 has no element for. RSS is both distribution AND honesty:
// every entry carries its source links (the feed carries the verification,
// not just the claims), and anyone can audit the Wire's history from a feed
// reader.
//
// buildFeedXml is pure (posts in, XML out) so tests cover escaping and shape
// without a server; the handler owns the query + headers.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

const iso = (v) => new Date(v).toISOString();

// Latest 50 published, newest first — the same visibility rule as the list
// API, so unpublish vanishes a post from the feed on the next request.
export const RSS_SQL = `
  SELECT slug, type, tags, title, summary, sources, corrections, byline, published_at, updated_at
  FROM wire_posts WHERE status = 'published'
  ORDER BY published_at DESC LIMIT 50
`;

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
    `<p>Sources:</p><ul>${sources}</ul>` +
    (corrections ? `<p>Corrections:</p><ul>${corrections}</ul>` : "");
}

/**
 * @param {{posts: Array, baseUrl: string, label: string}} opts — posts are
 *        wire_posts rows (snake_case timestamps); label is the transparency
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

/** GET /wire/rss.xml — per-request from the DB (posts published after boot
 *  must appear; unpublished must vanish). Errors 500 as JSON, never a stack. */
export function createRssHandler({ pool, label }) {
  return async function rssHandler(req, res) {
    try {
      const { rows } = await pool.query(RSS_SQL);
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
