#!/usr/bin/env node
// Wire tests — same zero-framework style as the other suites.
//
// The Wire is now read-only: posts are authored and published on the
// Automatos platform and this server proxies + renders them. So the old
// ingest-side suite (the §4.3 verification gate, source-independence rules,
// the timing-safe key comparator, the seed script, the Postgres integration)
// is gone with the code it covered, and what replaced it is:
//
//   - the platform→Wire shape mapping, the one place the two vocabularies meet
//   - the HTML sanitiser, which is the security boundary now that bodies
//     arrive as rendered HTML rather than markdown
//   - the transparency label, whose claims must track what actually happens
//   - the Atom/shell/sitemap builders, unchanged but now fed mapped posts
//   - the mounted routes end to end, against a stubbed platform
//
// Every test here runs with zero env and makes no network calls: the platform
// is injected as a fetch stub, so CI never depends on api.automatos.app being
// up or on the workspace having content.
import { createServer } from "http";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import { transparencyLabel } from "../server/wire/label.js";
import { buildFeedXml } from "../server/wire/rss.js";
import { buildPostShellHtml, buildWireSitemapXml } from "../server/wire/shell.js";
import { mountWire, createWireClient } from "../server/wire/index.js";
import { mapPost, listPosts, getPost } from "../public/js/wire-api.js";
import { sanitizeHtml, htmlToText } from "../public/js/sanitize-html.js";
import { generateShells, wireIndexMeta, injectWireMeta } from "../scripts/generate-shells.mjs";
import { buildContentIndex } from "../server/catalog.js";

let failures = 0;
function ok(cond, label) {
  if (cond) { console.log(`  ok   ${label}`); return; }
  failures++;
  console.error(`  FAIL ${label}`);
}
const section = (t) => console.log(`\n${t}`);

const WS = "894519f4-9fc3-40eb-bb9f-081e5b113a58";

/** A platform post exactly as /api/widgets/blog returns one. */
const apiPost = (over = {}) => ({
  id: "1", workspace_id: WS, slug: "a-post", title: "A post",
  excerpt: "The summary.", content: "<h2>Body</h2><p>Words.</p>",
  category: "Engineering", tags: ["agents", "ops"],
  author_name: "QUILL", author_agent_id: "agent-1",
  status: "published",
  published_at: "2026-08-01T10:00:00.000Z", updated_at: "2026-08-02T11:00:00.000Z",
  created_at: "2026-07-30T09:00:00.000Z",
  cover_image_url: "https://cdn.test/c.png", reading_time_minutes: 7,
  seo_title: "A post · SEO", seo_description: "SEO description.",
  ...over,
});

/** Stub the platform. Records calls so we can assert on the URLs built. */
function stubPlatform({ posts = [apiPost()], total = null, status = 200 } = {}) {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(String(url));
    const u = new URL(url);
    if (status !== 200) return { ok: false, status, json: async () => ({}) };
    if (/\/posts\/[^/?]+$/.test(u.pathname)) {
      const slug = decodeURIComponent(u.pathname.split("/").pop());
      const hit = posts.find((p) => p.slug === slug);
      return hit
        ? { ok: true, status: 200, json: async () => hit }
        : { ok: false, status: 404, json: async () => ({ detail: "not found" }) };
    }
    return {
      ok: true, status: 200,
      json: async () => ({ posts, total: total ?? posts.length, page: 1, per_page: posts.length || 1, total_pages: 1 }),
    };
  };
  return { fetchFn, calls };
}

// ── Shape mapping ────────────────────────────────────────────────────────
section("platform → Wire mapping");
{
  const m = mapPost(apiPost());
  ok(m.slug === "a-post" && m.title === "A post", "slug and title carry through");
  ok(m.summary === "The summary.", "excerpt becomes summary");
  ok(m.body_html === "<h2>Body</h2><p>Words.</p>", "content becomes body_html, unmodified at map time");
  ok(m.type === "Engineering", "category becomes type");
  ok(Array.isArray(m.byline.agents) && m.byline.agents[0] === "QUILL", "author_name becomes the agent byline");
  ok(m.published_at === "2026-08-01T10:00:00.000Z" && m.updated_at === "2026-08-02T11:00:00.000Z", "timestamps keep their snake_case names for the builders");
  ok(Array.isArray(m.sources) && m.sources.length === 0, "sources map to empty — blog_posts has no citation column");
  ok(Array.isArray(m.corrections) && m.corrections.length === 0, "corrections map to empty for the same reason");
  ok(m.seo_title === "A post · SEO" && m.reading_time_minutes === 7, "SEO + reading time survive for the shell");

  const bare = mapPost({ slug: "s", title: "t" });
  ok(bare.byline.agents[0] === "Automatos agent", "a post with no author still gets an honest byline");
  ok(bare.tags.length === 0 && bare.body_html === "", "missing fields degrade to empty, never undefined");
  ok(mapPost(null) === null, "null in, null out");
}

// ── Sanitiser — the security boundary ────────────────────────────────────
section("sanitiser (bodies are now remote HTML, not markdown)");
{
  const vectors = [
    ["<script>alert(1)</script><p>after</p>", /^<p>after<\/p>$/, "script element and its text are dropped"],
    ["<img src=x onerror=alert(1)>", /^<img loading="lazy">$/, "event handlers cannot survive an allowed tag"],
    ['<a href="javascript:alert(1)">x</a>', /^<a>x<\/a>$/, "javascript: href refused, link text kept"],
    ['<a href="java\tscript:alert(1)">x</a>', /^<a>x<\/a>$/, "control characters cannot smuggle a scheme"],
    ["<iframe src=//evil></iframe>ok", /^ok$/, "iframe dropped"],
    ["<svg><script>alert(1)</script></svg>", /^$/, "svg subtree dropped whole"],
    ['<p style="x" onclick="y">t</p>', /^<p>t<\/p>$/, "unlisted attributes stripped wholesale"],
    ["<div class=evil><p>kept</p></div>", /^<p>kept<\/p>$/, "unknown tag unwrapped, its content kept"],
    ["<p>unclosed", /^<p>unclosed<\/p>$/, "unbalanced input is closed, not leaked"],
    ["</p></div>stray", /^stray$/, "stray closing tags dropped"],
  ];
  for (const [input, expect, label] of vectors) ok(expect.test(sanitizeHtml(input)), label);

  ok(!/on\w+=|javascript:|<script|<iframe/i.test(vectors.map(([i]) => sanitizeHtml(i)).join("")), "no vector produced executable output");
  ok(sanitizeHtml('<a href="https://x.test">e</a>').includes('rel="noopener noreferrer"'), "external links get rel=noopener");
  ok(sanitizeHtml("<p>Tom &amp; Jerry &mdash; &#39;q&#39;</p>") === "<p>Tom &amp; Jerry &mdash; &#39;q&#39;</p>", "existing entities are not double-escaped");
  ok(sanitizeHtml("<p>AT&T</p>") === "<p>AT&amp;T</p>", "a bare ampersand still is escaped");
  ok(sanitizeHtml("a < b") === "a &lt; b", "bare angle brackets escaped");
  ok(htmlToText("<h1>Hi</h1><p>there &amp; <b>b</b></p>") === "Hi there & b", "htmlToText flattens markup and entities");
}

// ── Transparency label ───────────────────────────────────────────────────
section("transparency label");
{
  const base = transparencyLabel(false);
  ok(/Automatos agents/.test(base), "names the agents as authors");
  ok(!/reviewed by a human/.test(base), "does NOT claim review by default — nothing enforces it now");
  ok(!/linked to its source/.test(base), "does NOT claim per-claim sourcing — no citation column exists");
  ok(/reviewed by a human/.test(transparencyLabel(true)), "claims review only when review is real");
  ok(/reviewed by a human/.test(transparencyLabel("true")), "accepts the env-string form");
}

// ── Builders, fed mapped posts ───────────────────────────────────────────
section("feed + shell builders");
{
  const posts = [mapPost(apiPost())];
  const xml = buildFeedXml({ posts, baseUrl: "https://academy.automatos.app", label: transparencyLabel(false) });
  ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'), "feed is XML");
  ok(xml.includes("<title>A post</title>"), "entry carries the title");
  ok(xml.includes("https://academy.automatos.app/#/wire/a-post"), "entry links the post deep link");
  ok(xml.includes("<name>QUILL</name>"), "entry credits the authoring agent");
  ok(!xml.includes("<p>Sources:</p>"), "no Sources block when the post has none — the feed does not fake verification");
  ok(!/reviewed by a human/.test(xml), "feed subtitle carries the honest label");

  const esc = buildFeedXml({ posts: [mapPost(apiPost({ title: 'X & <b>Y</b> "z"' }))], baseUrl: "https://a.test", label: "l" });
  ok(!/<b>Y<\/b>/.test(esc) && esc.includes("&amp;"), "titles are XML-escaped, never injected");

  const shell = buildPostShellHtml({ post: posts[0], baseUrl: "https://academy.automatos.app", label: "L" });
  ok(shell.includes('<link rel="canonical" href="https://academy.automatos.app/wire/a-post/">'), "canonical is the trailing-slash real path");
  ok(shell.includes("<h2>Body</h2>"), "body HTML reaches the crawler shell");
  ok(!shell.includes("&lt;h2&gt;"), "body is NOT double-escaped into visible tags (the markdown-path bug)");

  const evil = buildPostShellHtml({ post: mapPost(apiPost({ content: '<p>ok</p><script>alert(1)</script>' })), baseUrl: "https://a.test", label: "L" });
  ok(!/<script>alert/.test(evil), "the shell sanitises too — server-side rendering is not a sanitiser bypass");

  const sm = buildWireSitemapXml({ posts, baseUrl: "https://a.test" });
  ok(sm.includes("<loc>https://a.test/wire/</loc>") && sm.includes("<loc>https://a.test/wire/a-post/</loc>"), "sitemap lists the index and each post");
}

// ── Client against a stubbed platform ────────────────────────────────────
section("api client");
{
  const { fetchFn, calls } = stubPlatform();
  const r = await listPosts({ apiBase: "https://api.test", workspaceId: WS, perPage: 3, fetchFn });
  ok(r.posts.length === 1 && r.total === 1, "list returns mapped posts and a total");
  ok(calls[0].includes(`workspace_id=${WS}`), "workspace_id is always sent");
  ok(calls[0].includes("per_page=3"), "per_page is honoured");

  await listPosts({ apiBase: "https://api.test", workspaceId: WS, perPage: 999, fetchFn });
  ok(calls[1].includes("per_page=50"), "per_page is capped at the platform's maximum");

  const one = await getPost({ apiBase: "https://api.test", workspaceId: WS, slug: "a-post", fetchFn });
  ok(one && one.title === "A post", "single post fetch maps too");
  ok(await getPost({ apiBase: "https://api.test", workspaceId: WS, slug: "nope", fetchFn }) === null, "a missing slug is null, not a throw");

  let threw = false;
  try { await listPosts({ apiBase: "https://api.test", fetchFn }); } catch (_) { threw = true; }
  ok(threw, "a missing workspace is a loud error, not a silent empty list");

  const empty = stubPlatform({ posts: [], total: 0 });
  const e = await listPosts({ apiBase: "https://api.test", workspaceId: WS, fetchFn: empty.fetchFn });
  ok(e.posts.length === 0 && e.total === 0, "an empty workspace is a valid empty result, not an error");
}

// ── Cache ────────────────────────────────────────────────────────────────
section("client cache");
{
  const { fetchFn, calls } = stubPlatform();
  const client = createWireClient({ workspaceId: WS, apiBase: "https://api.test", fetchFn });
  await client.listPosts({ perPage: 5 });
  await client.listPosts({ perPage: 5 });
  ok(calls.length === 1, "identical calls inside the TTL hit the cache, not the platform");
  await client.listPosts({ perPage: 6 });
  ok(calls.length === 2, "a different query is a different cache key");
}

// ── Mounted routes, end to end ───────────────────────────────────────────
section("mounted routes");
{
  async function mount(stub, opts = {}) {
    const app = express();
    mountWire(app, { workspaceId: WS, apiBase: "https://api.test", fetchFn: stub.fetchFn, ...opts });
    const server = createServer(app);
    await new Promise((r) => server.listen(0, r));
    return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
  }

  const s = await mount(stubPlatform());
  const list = await fetch(`${s.base}/api/wire/posts?limit=3`);
  const listBody = await list.json();
  ok(list.status === 200, "GET /api/wire/posts answers 200");
  ok(Array.isArray(listBody.posts) && listBody.posts[0].slug === "a-post", "the SPA envelope still carries posts[]");
  ok(typeof listBody.transparency === "string" && listBody.transparency.length > 0, "…and the transparency label the views render");
  ok(list.headers.get("cache-control").includes("max-age=60"), "reads are cacheable");

  const post = await fetch(`${s.base}/api/wire/posts/a-post`);
  ok(post.status === 200 && (await post.json()).post.title === "A post", "GET /api/wire/posts/:slug answers the post");
  ok((await fetch(`${s.base}/api/wire/posts/missing`)).status === 404, "an unknown slug is 404, not 500");

  const rss = await fetch(`${s.base}/wire/rss.xml`);
  ok(rss.status === 200 && (rss.headers.get("content-type") || "").includes("atom+xml"), "/wire/rss.xml serves an Atom feed");
  ok((await rss.text()).includes("A post"), "…containing the platform's post");

  const sitemap = await fetch(`${s.base}/wire/sitemap.xml`);
  ok(sitemap.status === 200 && (await sitemap.text()).includes("/wire/a-post/"), "/wire/sitemap.xml lists the post");

  const shell = await fetch(`${s.base}/wire/a-post`);
  ok(shell.status === 200 && (await shell.text()).includes("<h2>Body</h2>"), "/wire/:slug serves the crawler shell");
  ok((await fetch(`${s.base}/wire/does-not-exist`)).status === 404, "an unknown shell is 404");
  s.close();

  // An empty workspace must serve, not error — this is the Academy's state
  // until an agent publishes into it.
  const empty = await mount(stubPlatform({ posts: [], total: 0 }));
  const el = await fetch(`${empty.base}/api/wire/posts`);
  ok(el.status === 200 && (await el.json()).posts.length === 0, "empty workspace lists 200 with no posts (the SPA hides the nav on 0)");
  const erss = await fetch(`${empty.base}/wire/rss.xml`);
  ok(erss.status === 200, "empty workspace still serves a valid feed — the page head advertises it");
  empty.close();

  // The platform being down must not 500 the Academy's pages.
  const down = await mount(stubPlatform({ status: 500 }));
  ok((await fetch(`${down.base}/api/wire/posts`)).status === 502, "an upstream failure surfaces as 502, never a stack");
  down.close();

  let mountThrew = false;
  try { mountWire(express(), {}); } catch (_) { mountThrew = true; }
  ok(mountThrew, "mounting without a workspace fails loudly at boot");
}

// ── Shell generation + the /wire shadowing rule ──────────────────────────
section("generate-shells wire statics");
{
  const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
  const idx = buildContentIndex(join(PUB, "content"));

  generateShells(idx, { wire: true });
  ok(!existsSync(join(PUB, "wire", "index.html")),
     "NOTHING is written to public/wire/index.html — express.static would answer it for GET /wire and shadow the SPA route");
  ok(/Sitemap: .*\/wire\/sitemap\.xml/.test(readFileSync(join(PUB, "robots.txt"), "utf8")),
     "robots.txt points at the wire sitemap");

  const meta = wireIndexMeta();
  ok(typeof meta.title === "string" && /The Wire/.test(meta.title), "wire meta carries a title for the SPA shell");
  ok(!/source-verified/.test(meta.title), "title drops the 'source-verified' claim the platform cannot back");
  ok(!/linked to its source|correction in the open/.test(meta.desc), "description drops the sourcing and corrections promises");
  ok(/\/wire\/$/.test(meta.pageUrl), "canonical points at the trailing-slash real path");

  generateShells(idx, { wire: false });
  ok(!/wire\/sitemap/.test(readFileSync(join(PUB, "robots.txt"), "utf8")), "wire off → robots.txt drops the wire line");

  generateShells(idx, { wire: true }); // leave the tree as a wire-enabled deploy finds it
}

// ── /wire's injected head ────────────────────────────────────────────────
// This shipped broken: the injection referenced an escAttr declared inside
// another function, threw ReferenceError on every request, and was swallowed
// by its own catch — so /wire served the generic shell for days with no log
// line and green CI. The assertions below are against the real output.
section("/wire head injection");
{
  const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
  const shell = readFileSync(join(PUB, "index.html"), "utf8");
  const out = injectWireMeta(shell);
  const meta = wireIndexMeta();

  ok(out.includes(`<title>${meta.title}</title>`), "the shell's <title> becomes the Wire's");
  ok(out !== shell, "output actually differs from the shell it was given");
  ok(!/Learn AI architecture/.test(out.slice(0, out.indexOf("</head>"))), "the generic Academy title is gone from the head");
  ok(out.includes(`<link rel="canonical" href="${meta.pageUrl}" />`), "canonical points at /wire/");
  ok(out.includes(`<meta property="og:title" content="${meta.title}"`), "og:title carries the Wire title");
  ok(out.includes(`<meta name="description" content="${meta.desc}"`), "description is the Wire's");
  ok(injectWireMeta('<head><title>x</title></head>').includes(meta.title), "works on a minimal document too");
}

console.log(failures ? `\n${failures} failure(s)` : "\nwire: all assertions passed");
process.exit(failures ? 1 : 0);
