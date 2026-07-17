#!/usr/bin/env node
// Wire tests (PRD-WIRE S1–S5) — same zero-framework style as the other suites.
//
// Unit tests always run: the §4.3 verification gate (pure validate.js), the
// timing-safe key comparator, the D-W5 transparency label, the Atom feed
// builder, the hardened markdown render path (PRD-WIRE §7), the S3 shell +
// sitemap builders, the generate-shells wire statics, and the S4 seed-script
// safety guard. Integration tests need a real Postgres and run only when
// DATABASE_URL is set (the CI `spine` job provides a service container and
// applies migrations first); without it they skip loudly so `npm test` stays
// green with zero env.
import { createServer } from "http";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import {
  validateIngest, registrableDomain,
  MAX_TITLE, MAX_SUMMARY, MAX_TAGS, MAX_BODY_BYTES, MAX_CLAIMS,
} from "../server/wire/validate.js";
import { keyMatcher } from "../server/wire/auth.js";
import { transparencyLabel } from "../server/wire/label.js";
import { buildFeedXml } from "../server/wire/rss.js";
import { buildPostShellHtml, buildWireSitemapXml } from "../server/wire/shell.js";
import { mountWire } from "../server/wire/index.js";
import { assertLocalDatabase, buildSeedPosts, seedWire } from "../scripts/seed-wire.mjs";
import { generateShells } from "../scripts/generate-shells.mjs";
import { buildContentIndex } from "../server/catalog.js";
import { md } from "../public/js/markdown.js";

const DAY = 86_400_000;
let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const nowMs = Date.now();
const isoAgo = (ms) => new Date(nowMs - ms).toISOString();

// A well-formed factual post: two sources on independent registrable domains,
// fresh retrievals, one-line claim mapping each — the §4.3 shape.
const validSources = () => [
  { url: "https://www.anthropic.com/news/claude-4-2", title: "Anthropic — Claude 4.2 announcement", retrievedAt: isoAgo(3_600_000), claims: "Claude 4.2 ships with a 2M-token context window" },
  { url: "https://techcrunch.com/2026/07/16/claude-4-2/", title: "TechCrunch coverage", retrievedAt: isoAgo(7_200_000), claims: "Pricing is unchanged from Claude 4.1" },
];
const validPost = (over = {}) => ({
  postId: "run-2026-07-17-001",
  slug: "claude-4-2-launch",
  type: "model-news",
  tags: ["anthropic", "models"],
  title: "Claude 4.2 lands with a 2M-token context window",
  summary: "Anthropic shipped Claude 4.2 this morning — much bigger context, same price. What it changes for the architect exam's context-management domain.",
  bodyMd: "Anthropic released **Claude 4.2** today.\n\n- 2M-token context window\n- pricing unchanged\n\n[The announcement](https://www.anthropic.com/news/claude-4-2)",
  sources: validSources(),
  byline: { agents: ["the-wire"], missionRun: "run-2026-07-17-001", model: "claude-fable-5" },
  ...over,
});
const gate = (post, policy = "review") => validateIngest(post, { nowMs, publishPolicy: policy });

// ═══════════════════════════ unit — source independence heuristic ══════
console.log("registrable-domain heuristic (source independence)");
ok(registrableDomain("https://www.anthropic.com/news/x") === "anthropic.com", "www. + subpath collapse to the registrable domain");
ok(registrableDomain("https://docs.anthropic.com/y") === "anthropic.com", "subdomains never count as independence");
ok(registrableDomain("https://www.bbc.co.uk/news") === "bbc.co.uk", "ccTLD second-level: bbc.co.uk keeps three labels");
ok(registrableDomain("https://www.theguardian.co.uk/x") !== registrableDomain("https://www.bbc.co.uk/y"), "…so two .co.uk outlets stay independent");
ok(registrableDomain("ftp://example.com/f") === null, "non-http(s) scheme → null");
ok(registrableDomain("javascript:alert(1)") === null, "javascript: → null");
ok(registrableDomain("not a url") === null, "garbage → null");

// ═══════════════════════════════ unit — the §4.3 verification gate ═════
console.log("ingest validation (the verification gate)");
const good = gate(validPost());
ok(!good.error, "well-formed factual post accepted");
ok(good.value.status === "draft", "status defaults to draft (D-W1 review-first)");

const sameDomain = gate(validPost({ sources: [
  { ...validSources()[0] },
  { url: "https://anthropic.com/another-page", title: "Same site, second page", retrievedAt: isoAgo(1000), claims: "Second claim" },
] }));
ok(sameDomain.error && sameDomain.error.field === "sources" && /independent/.test(sameDomain.error.reason), "two pages of the same site ≠ independence → rejected");
const oneSource = gate(validPost({ sources: [validSources()[0]] }));
ok(oneSource.error && oneSource.error.field === "sources", "factual type with one source rejected");
ok(!gate(validPost({ type: "changelog", sources: [validSources()[0]] })).error, "first-party type (changelog) accepts a single canonical source");
ok(gate(validPost({ sources: [] })).error !== undefined, "empty sources[] rejected — verification is mandatory on every post");

const stale = gate(validPost({ sources: [
  { ...validSources()[0], retrievedAt: isoAgo(8 * DAY) },
  validSources()[1],
] }));
ok(stale.error && /stale/.test(stale.error.reason), "retrievedAt older than 7 days → rejected (no stale research)");
const future = gate(validPost({ sources: [
  { ...validSources()[0], retrievedAt: new Date(nowMs + 3_600_000).toISOString() },
  validSources()[1],
] }));
ok(future.error && /future/.test(future.error.reason), "retrievedAt in the future → rejected");
ok(gate(validPost({ sources: [{ ...validSources()[0], retrievedAt: 1720000000000 }, validSources()[1]] })).error !== undefined, "non-ISO retrievedAt rejected");
ok(gate(validPost({ sources: [{ ...validSources()[0], claims: "x".repeat(MAX_CLAIMS + 1) }, validSources()[1]] })).error !== undefined, "claims over 200 chars rejected");
ok(gate(validPost({ sources: [{ ...validSources()[0], claims: "two\nlines" }, validSources()[1]] })).error !== undefined, "multi-line claims rejected (one line per §4.3)");
const noClaims = gate(validPost({ sources: [{ url: "https://a.example/x", title: "t", retrievedAt: isoAgo(1000) }, validSources()[1]] }));
ok(noClaims.error && /claims/.test(noClaims.error.field), "source without its claim mapping rejected");
ok(gate(validPost({ sources: [{ ...validSources()[0], extra: 1 }, validSources()[1]] })).error.reason === "unknown_field", "unknown field inside a source rejected");

ok(gate(validPost({ corrections: [] })).error.reason === "unknown_field", "unknown top-level field rejected (corrections is not an ingest field)");
ok(gate(validPost({ type: "opinion" })).error.field === "type", "type outside the enum rejected");
ok(gate(validPost({ slug: "Bad_Slug" })).error.field === "slug", "slug shape enforced");
ok(gate(validPost({ slug: "a".repeat(81) })).error.field === "slug", "slug cap (80) enforced");
ok(gate(validPost({ title: "x".repeat(MAX_TITLE + 1) })).error.field === "title", "title cap (120) enforced");
ok(gate(validPost({ summary: "x".repeat(MAX_SUMMARY + 1) })).error.field === "summary", "summary cap (300) enforced");
ok(gate(validPost({ tags: Array.from({ length: MAX_TAGS + 1 }, (_, i) => `t${i}`) })).error.field === "tags", "tags cap (8) enforced");
ok(gate(validPost({ bodyMd: "x".repeat(MAX_BODY_BYTES + 1) })).error.field === "bodyMd", "body cap (32 KB) enforced");
ok(!gate(validPost({ tags: undefined })).error, "tags optional → defaults to []");
ok(gate(validPost({ byline: { agents: [], missionRun: "r" } })).error.field === "byline.agents", "empty agents[] rejected — the byline is mandatory transparency");
ok(gate(validPost({ byline: { agents: ["a"] } })).error.field === "byline.missionRun", "byline without missionRun rejected");
ok(gate(validPost({ byline: { agents: ["a"], missionRun: "r", model: "m", extra: true } })).error.reason === "unknown_field", "unknown byline field rejected");

ok(gate(validPost({ status: "published" })).error.field === "status", "review policy: status 'published' at ingest → rejected (use the publish call)");
ok(!gate(validPost({ status: "published" }), "auto").error, "auto policy: missions may publish directly");
ok(gate(validPost({ status: "unpublished" }), "auto").error.field === "status", "status 'unpublished' never valid at ingest");

// ═══════════════════════════════════ unit — key guard + label + feed ═══
console.log("key comparator, transparency label, feed builder");
const matches = keyMatcher("wk_live_secret");
ok(matches("wk_live_secret") === true, "exact key matches");
ok(matches("wk_live_secreT") === false && matches("wk_live_secre") === false, "near-miss and truncated keys refused");
ok(matches("") === false && matches(undefined) === false, "empty/missing keys refused");

ok(/reviewed by a human$/.test(transparencyLabel("review")), "review-mode label claims the human review that is actually happening (D-W5 c)");
ok(!/reviewed by a human/.test(transparencyLabel("auto")), "auto-mode label drops the review clause (degrades to D-W5 b)");
ok(transparencyLabel("auto").startsWith("Researched and written by Automatos agents"), "label base copy verbatim");

const feedPosts = [{
  slug: "claude-4-2-launch", type: "model-news", tags: ["anthropic"],
  title: 'Claude & the "2M" <context> era', summary: "Summary & dek",
  sources: validSources(), corrections: [{ at: isoAgo(0), note: "Fixed the price figure" }],
  byline: { agents: ["the-wire"], missionRun: "r1" },
  published_at: new Date(nowMs - DAY), updated_at: new Date(nowMs),
}];
const xml = buildFeedXml({ posts: feedPosts, baseUrl: "https://academy.automatos.app", label: transparencyLabel("review") });
ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>') && xml.includes('<feed xmlns="http://www.w3.org/2005/Atom">'), "Atom envelope present");
ok(xml.includes("Claude &amp; the &quot;2M&quot; &lt;context&gt; era"), "titles are XML-escaped");
ok(!/& the "2M"/.test(xml), "…and no raw unescaped title text leaks");
ok(xml.includes("https://academy.automatos.app/#/wire/claude-4-2-launch"), "entry links target the post deep link");
ok(xml.includes(`<updated>${new Date(nowMs).toISOString()}</updated>`), "entry <updated> reflects the correction bump");
ok(xml.includes("techcrunch.com") && xml.includes("Pricing is unchanged"), "the feed carries the verification: source links + claim mapping ride every entry");
ok(xml.includes("Fixed the price figure"), "corrections ride the entry content");
ok(xml.includes("reviewed by a human"), "transparency label rides the feed subtitle");
const emptyXml = buildFeedXml({ posts: [], baseUrl: "https://a.example", label: "L" });
ok(emptyXml.includes("<feed") && emptyXml.includes("<updated>"), "empty feed still well-formed (feed-level <updated> present)");

// ═════════════════════════ unit — hardened markdown (PRD-WIRE §7) ══════
console.log("markdown hardening (untrusted wire bodies)");
ok(!md("[x](javascript:alert(1))").includes("<a "), "javascript: scheme refused — renders as text, not a link");
ok(!md("[x](data:text/html,hi)").includes("<a "), "data: scheme refused");
ok(!md("[x](//evil.example/p)").includes("<a "), "scheme-relative URL refused");
const quoted = md('[x](https://a.example/"onmouseover="alert(1))');
ok(!quoted.includes('"onmouseover'), "quotes in hrefs are attribute-escaped — no breakout into new attributes");
ok(quoted.includes("&quot;onmouseover"), "…the quote survives as data, dead as syntax");
ok(md("[x](https://a.example/p?q=1&r=2)").includes('href="https://a.example/p?q=1&amp;r=2"'), "http(s) links keep working, ampersands entity-encoded");
ok(md("[jump](#anchor)").includes('<a href="#anchor">') && !md("[jump](#anchor)").includes("_blank"), "in-app hash links allowed, same-tab");
ok(md("<script>alert(1)</script>") === "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>", "raw HTML never passes through");

// ═══════════════════════ unit — S3 shell + sitemap builders ════════════
console.log("post shell builder (per-request SEO shells)");
const ldOf = (html) => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  try { return m ? JSON.parse(m[1]) : null; } catch (_) { return null; }
};
const shellRow = {
  slug: "claude-4-2-launch", type: "model-news", tags: ["anthropic"],
  title: 'Claude & the "2M" <context> era',
  summary: "Summary & dek",
  body_md: "Body with **bold** and [a link](https://a.example/x)\n\n<script>alert(1)</script>",
  sources: validSources(),
  corrections: [{ at: isoAgo(0), note: "Fixed the price figure" }],
  byline: { agents: ["the-wire"], missionRun: "r1" },
  published_at: new Date(nowMs - DAY), updated_at: new Date(nowMs),
};
const shellHtml = buildPostShellHtml({ post: shellRow, baseUrl: "https://academy.automatos.app", label: transparencyLabel("review") });
ok(shellHtml.includes('<link rel="canonical" href="https://academy.automatos.app/wire/claude-4-2-launch/">'), "canonical is the trailing-slash real path");
ok(shellHtml.includes("Claude &amp; the &quot;2M&quot; &lt;context&gt; era"), "title escaped in markup");
const shellLdUnit = ldOf(shellHtml);
ok(shellLdUnit && shellLdUnit["@type"] === "NewsArticle", "factual type → NewsArticle JSON-LD");
ok(shellLdUnit.headline === shellRow.title && shellLdUnit.dateModified === new Date(nowMs).toISOString(), "headline round-trips; dateModified = updated_at (the corrections bump)");
ok(Array.isArray(shellLdUnit.citation) && shellLdUnit.citation.length === 2 && shellLdUnit.citation[0].url === validSources()[0].url, "citation carries the §4.3 sources — the verification travels with the SEO");
ok(Array.isArray(shellLdUnit.correction) && /Fixed the price figure/.test(shellLdUnit.correction[0]), "NewsArticle carries its corrections in the open");
ok(shellHtml.includes("reviewed by a human"), "transparency label rides the shell (S5: the fourth surface)");
ok(shellHtml.includes("<strong>bold</strong>") && shellHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "body renders through the hardened markdown path — raw HTML dies");
ok(shellHtml.includes('href="/#/wire/claude-4-2-launch"'), "shell links into the SPA deep link");
ok(shellHtml.includes("Pricing is unchanged") && shellHtml.includes("retrieved"), "the Sources box carries link + retrieved date + claim mapping");
ok(shellHtml.includes('property="article:published_time"') && shellHtml.includes('rel="alternate" type="application/atom+xml"'), "article timestamps + feed discovery present");
// a hostile title must not be able to terminate the JSON-LD <script> element:
// if the < escape were missing, the capture would truncate mid-JSON and fail
// to parse — this asserts the whole round trip.
const hostile = buildPostShellHtml({ post: { ...shellRow, corrections: [], title: "x</script><b>pwn</b>" }, baseUrl: "https://a.example", label: "L" });
const hostileLd = ldOf(hostile);
ok(hostileLd && hostileLd.headline === "x</script><b>pwn</b>", "JSON-LD escapes < — no script-element breakout, payload survives as data");
const bpHtml = buildPostShellHtml({ post: { ...shellRow, type: "changelog", corrections: [] }, baseUrl: "https://a.example", label: "L" });
ok(ldOf(bpHtml)["@type"] === "BlogPosting" && ldOf(bpHtml).correction === undefined, "first-party type → BlogPosting (correction is a NewsArticle-only property)");

console.log("wire sitemap builder");
const smUnit = buildWireSitemapXml({ posts: [{ slug: "a-post", updated_at: new Date(nowMs) }], baseUrl: "https://a.example" });
ok(smUnit.includes("<loc>https://a.example/wire/</loc>") && smUnit.includes("<loc>https://a.example/wire/a-post/</loc>"), "sitemap lists the /wire/ index + each shell");
ok(smUnit.includes(`<lastmod>${new Date(nowMs).toISOString()}</lastmod>`), "lastmod = updated_at (corrections move it)");
ok(buildWireSitemapXml({ posts: [], baseUrl: "https://a.example" }).includes("<urlset"), "empty wire → still a well-formed sitemap");

// ═══════════════════ unit — S4 seed script safety + fixtures ═══════════
console.log("seed script (never a prod path; fixtures pass the gate)");
const throws = (fn) => { try { fn(); return null; } catch (e) { return e; } };
ok(/refusing/.test((throws(() => assertLocalDatabase("postgres://u:p@db.prod.example.com:5432/wire")) || { message: "" }).message), "non-local DATABASE_URL refused");
ok(throws(() => assertLocalDatabase("postgres://postgres:postgres@localhost:5432/t")) === null, "localhost allowed");
ok(throws(() => assertLocalDatabase("postgres://postgres@127.0.0.1:5432/t")) === null, "127.0.0.1 allowed");
ok(throws(() => assertLocalDatabase("postgres://u:p@db.prod.example.com:5432/wire", true)) === null, "--allow-remote-db is a deliberate override");
ok(throws(() => assertLocalDatabase(undefined)) !== null, "missing DATABASE_URL refused");
const seeds = buildSeedPosts(5, nowMs);
ok(seeds.length === 5 && new Set(seeds.map((p) => p.type)).size === 5, "5 seeds cycle all five post types");
ok(seeds.every((p) => !validateIngest(p, { nowMs, publishPolicy: "review" }).error), "every generated seed passes the §4.3 gate");
ok(seeds.every((p) => p.slug.startsWith("seed-example-") && /Seed example/.test(p.title)), "seeds are visibly synthetic — never mistakable for news");

// ═══════════════ unit — S3 static parts (generate-shells wire mode) ════
console.log("generate-shells wire statics (/wire/ index shell + robots line)");
const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const contentIdx = buildContentIndex(join(PUB, "content"));
generateShells(contentIdx, { wire: true });
ok(existsSync(join(PUB, "wire", "index.html")), "wire on → /wire/ index shell emitted");
const wireIdxHtml = readFileSync(join(PUB, "wire", "index.html"), "utf8");
ok(wireIdxHtml.includes('rel="canonical"') && wireIdxHtml.includes("/wire/rss.xml") && wireIdxHtml.includes("Open the Wire"), "index shell: canonical + feed + door into #/wire");
ok(/reviewed by a human/.test(wireIdxHtml), "index shell carries the review-mode label (D-W5, no WIRE_PUBLISH_POLICY set)");
ok(/Sitemap: .*\/wire\/sitemap\.xml/.test(readFileSync(join(PUB, "robots.txt"), "utf8")), "robots.txt points at the DB-served wire sitemap");
generateShells(contentIdx, { wire: false });
ok(!existsSync(join(PUB, "wire", "index.html")), "wire off → the stale index shell is removed");
ok(!/wire\/sitemap/.test(readFileSync(join(PUB, "robots.txt"), "utf8")), "…and robots.txt drops the wire line");

// ══════════════════════════════════════════════════════ integration ════
if (!process.env.DATABASE_URL) {
  console.log("\nintegration: SKIPPED — DATABASE_URL not set (the CI spine job runs these against a service container)");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

console.log("integration (Postgres via DATABASE_URL)");
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

const KEY = "wk_test_1234567890";
const servers = [];
// Mirrors the server.js mount posture: wire routes, then the /api 501
// fallback the SPA feature-detects against.
const mkApp = async (opts = {}) => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  mountWire(app, {
    pool, ingestKey: KEY,
    publishPolicy: opts.publishPolicy || "review",
    rateLimit: opts.rateLimit || { max: 10_000, windowMs: 60_000 },
  });
  app.use("/api", (_req, res) => res.status(501).json({ error: "not_implemented" }));
  const server = createServer(app);
  await new Promise((r) => server.listen(0, r));
  servers.push(server);
  return { base: `http://127.0.0.1:${server.address().port}` };
};
const main = await mkApp();

const request = async (method, path, { key, body, base = main.base } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(key ? { "X-Wire-Key": key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const type = res.headers.get("content-type") || "";
  return { status: res.status, headers: res.headers, text, body: type.includes("json") && text ? JSON.parse(text) : null };
};

// Clean slate so reruns are deterministic; the migration created the table.
const { rows: tableRows } = await pool.query(
  "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wire_posts'");
ok(tableRows[0].n === 1, "migration created wire_posts");
await pool.query("TRUNCATE wire_posts");

// ── auth: key required, timing-safe compare, never a reason ────────────
const noKey = await request("POST", "/api/wire/posts", { body: validPost() });
ok(noKey.status === 401 && noKey.body.error === "unauthorized", "missing X-Wire-Key → 401");
const badKey = await request("POST", "/api/wire/posts", { key: "wk_test_123456789X", body: validPost() });
ok(badKey.status === 401, "near-miss key → 401 (timing-safe digest compare)");

// ── D-W1 review flow: ingest lands draft, invisible until the flip ─────
const created = await request("POST", "/api/wire/posts", { key: KEY, body: validPost() });
ok(created.status === 201 && created.body.post.status === "draft", "valid post → 201, stored as draft");
const listDraft = await request("GET", "/api/wire/posts");
ok(listDraft.status === 200 && listDraft.body.posts.length === 0, "drafts never appear on the public list");
ok(/reviewed by a human$/.test(listDraft.body.transparency), "review-mode list carries the D-W5(c) label");
ok((await request("GET", "/api/wire/posts/claude-4-2-launch")).status === 404, "draft post → 404 on the public slug route");

// ── idempotency (US-W4): re-POST replaces the draft, never duplicates ──
const replaced = await request("POST", "/api/wire/posts", { key: KEY, body: validPost({ title: "Claude 4.2: second take after the re-run" }) });
ok(replaced.status === 200 && replaced.body.post.title === "Claude 4.2: second take after the re-run", "re-POST of the same postId replaces the draft (200, not 201)");
const { rows: countRows } = await pool.query("SELECT count(*)::int AS n FROM wire_posts");
ok(countRows[0].n === 1, "…and exactly one row exists — no double posts, ever");

const slugClash = await request("POST", "/api/wire/posts", { key: KEY, body: validPost({ postId: "run-2026-07-17-002" }) });
ok(slugClash.status === 409 && slugClash.body.reason === "slug_taken", "same slug under a different postId → 409 slug_taken");

// ── publish flip + public read side ────────────────────────────────────
const pub = await request("POST", "/api/wire/posts/run-2026-07-17-001/publish", { key: KEY });
ok(pub.status === 200 && pub.body.status === "published" && !!pub.body.publishedAt, "publish call: draft → published with published_at");
ok((await request("POST", "/api/wire/posts/run-2026-07-17-001/publish", { key: KEY })).status === 200, "publish is idempotent — a retry is a clean 200");
ok((await request("POST", "/api/wire/posts/nope/publish", { key: KEY })).status === 404, "publishing an unknown postId → 404");
ok((await request("POST", "/api/wire/posts/run-2026-07-17-001/publish", {})).status === 401, "publish without the key → 401 (admin surface is key-gated)");

const list1 = await request("GET", "/api/wire/posts");
ok(list1.body.posts.length === 1 && list1.body.posts[0].slug === "claude-4-2-launch", "published post appears on the list");
ok(list1.headers.get("cache-control") === "public, max-age=60", "public list cached 60 s");
const single = await request("GET", "/api/wire/posts/claude-4-2-launch");
ok(single.status === 200 && single.body.post.bodyMd.includes("Claude 4.2") && single.body.post.sources.length === 2, "slug route serves the full body + sources");
ok(Array.isArray(single.body.post.corrections) && single.body.post.corrections.length === 0, "corrections start empty");

// ── D-W2 immutability: published posts never rewrite in place ──────────
const rePost = await request("POST", "/api/wire/posts", { key: KEY, body: validPost({ title: "Silent rewrite attempt" }) });
ok(rePost.status === 409 && rePost.body.reason === "already_published", "re-POST after publish → 409 (corrections are the only post-publish mutation)");

// ── the §4.3 gate at the HTTP boundary (DoD 400s) ──────────────────────
const one = await request("POST", "/api/wire/posts", { key: KEY, body: validPost({ postId: "r-x1", slug: "one-source", sources: [validSources()[0]] }) });
ok(one.status === 400 && one.body.error === "invalid_input" && one.body.field === "sources", "factual post with <2 independent-domain sources → 400");
const staleHttp = await request("POST", "/api/wire/posts", { key: KEY, body: validPost({ postId: "r-x2", slug: "stale-post", sources: [{ ...validSources()[0], retrievedAt: isoAgo(8 * DAY) }, validSources()[1]] }) });
ok(staleHttp.status === 400 && /stale/.test(staleHttp.body.reason), "stale retrievedAt → 400 — the post never exists, not even as a draft");
const pubAtIngest = await request("POST", "/api/wire/posts", { key: KEY, body: validPost({ postId: "r-x3", slug: "eager-post", status: "published" }) });
ok(pubAtIngest.status === 400 && pubAtIngest.body.field === "status", "review mode: status 'published' at ingest → 400");
ok((await pool.query("SELECT count(*)::int AS n FROM wire_posts")).rows[0].n === 1, "every rejected post left zero rows behind");

// ── auto mode: direct publish + the degraded label ─────────────────────
const auto = await mkApp({ publishPolicy: "auto" });
const autoPost = validPost({
  postId: "run-2026-07-17-010", slug: "context-windows-trend", type: "trend",
  title: "Context windows keep growing — & what that buys you", tags: ["context"],
  status: "published",
});
const autoCreated = await request("POST", "/api/wire/posts", { key: KEY, body: autoPost, base: auto.base });
ok(autoCreated.status === 201 && autoCreated.body.post.status === "published", "auto mode: mission publishes directly at ingest");
const autoList = await request("GET", "/api/wire/posts", { base: auto.base });
ok(!/reviewed by a human/.test(autoList.body.transparency), "auto-mode label never claims a review that isn't happening");
ok(autoList.body.posts.length === 2, "both published posts on the list");

// ── list filters + pagination ──────────────────────────────────────────
const byType = await request("GET", "/api/wire/posts?type=model-news");
ok(byType.body.posts.length === 1 && byType.body.posts[0].type === "model-news", "type filter narrows the list");
ok((await request("GET", "/api/wire/posts?type=opinion")).status === 400, "unknown type filter → 400");
const byTag = await request("GET", "/api/wire/posts?tag=anthropic");
ok(byTag.body.posts.length === 1 && byTag.body.posts[0].slug === "claude-4-2-launch", "tag filter narrows the list");
ok((await request("GET", "/api/wire/posts?limit=51")).status === 400, "limit over 50 → 400");
const newestAt = autoList.body.posts[0].publishedAt;
const before = await request("GET", `/api/wire/posts?before=${encodeURIComponent(newestAt)}`);
ok(before.body.posts.length === 1 && before.body.posts[0].publishedAt < newestAt, "before= paginates strictly older posts");

// ── corrections (D-W2): append-only, visible, bumps <updated> ──────────
ok((await request("POST", "/api/wire/posts/run-2026-07-17-001/corrections", { key: KEY, body: {} })).status === 400, "correction without a note → 400");
const corr = await request("POST", "/api/wire/posts/run-2026-07-17-001/corrections", { key: KEY, body: { note: "An earlier version misstated the price; it is unchanged from 4.1." } });
ok(corr.status === 200 && corr.body.corrections.length === 1 && corr.body.corrections[0].at, "correction appended with a server timestamp");
const corrected = await request("GET", "/api/wire/posts/claude-4-2-launch");
ok(corrected.body.post.corrections.length === 1 && corrected.body.post.updatedAt > corrected.body.post.publishedAt, "correction renders on the post and bumps updated_at");
const draftForCorr = await request("POST", "/api/wire/posts", { key: KEY, body: validPost({ postId: "r-draft", slug: "still-a-draft" }) });
ok(draftForCorr.status === 201, "second draft created");
ok((await request("POST", "/api/wire/posts/r-draft/corrections", { key: KEY, body: { note: "n" } })).status === 409, "corrections on a draft → 409 (drafts are replaced by re-POST)");

// ── RSS (D-W4): served from the DB per request ─────────────────────────
const rss = await request("GET", "/wire/rss.xml");
ok(rss.status === 200 && (rss.headers.get("content-type") || "").includes("application/atom+xml"), "GET /wire/rss.xml → 200 Atom");
ok(rss.text.includes("Claude 4.2: second take after the re-run") && rss.text.includes("growing — &amp; what that buys you"), "feed carries both published posts, XML-escaped");
ok(rss.text.includes("techcrunch.com") && rss.text.includes("misstated the price"), "feed carries per-item source links and the correction");
ok(rss.text.includes(`<updated>${corrected.body.post.updatedAt}</updated>`), "entry <updated> reflects the correction");
ok(!rss.text.includes("still-a-draft"), "drafts never reach the feed");

// ── the kill-switch (US-W3): one call, gone everywhere, row retained ───
ok((await request("POST", "/api/wire/posts/run-2026-07-17-001/unpublish", { key: KEY, body: {} })).status === 400, "unpublish requires {reason}");
const gone = await request("POST", "/api/wire/posts/run-2026-07-17-001/unpublish", { key: KEY, body: { reason: "price claim disputed by the vendor" } });
ok(gone.status === 200 && gone.body.status === "unpublished", "unpublish → 200");
ok((await request("GET", "/api/wire/posts")).body.posts.every((p) => p.slug !== "claude-4-2-launch"), "unpublished post vanishes from the list on the next request");
ok((await request("GET", "/api/wire/posts/claude-4-2-launch")).status === 404, "…and from the slug route");
ok(!(await request("GET", "/wire/rss.xml")).text.includes("second take"), "…and from the feed");
const { rows: audit } = await pool.query("SELECT status, unpublish_reason FROM wire_posts WHERE post_id = 'run-2026-07-17-001'");
ok(audit.length === 1 && audit[0].unpublish_reason === "price claim disputed by the vendor", "row retained for audit with the reason");
ok((await request("POST", "/api/wire/posts", { key: KEY, body: validPost() })).status === 409, "unpublished posts stay immutable too — re-POST → 409");
const rePub = await request("POST", "/api/wire/posts/run-2026-07-17-001/publish", { key: KEY });
ok(rePub.status === 200 && rePub.body.status === "published", "publish re-instates a mistakenly killed post (the kill-switch is reversible)");
ok((await request("GET", "/api/wire/posts/claude-4-2-launch")).status === 200, "…and it is back on the public surface");

// ── S3: per-request post shells — the /cert/:payload posture ──────────
const shellOk = await request("GET", "/wire/claude-4-2-launch");
ok(shellOk.status === 200 && (shellOk.headers.get("content-type") || "").includes("text/html"), "published post shell → 200 HTML");
ok(shellOk.headers.get("cache-control") === "public, max-age=60", "shell cached 60 s — the kill-switch is visible on the next request");
ok(shellOk.text.includes(`<link rel="canonical" href="${main.base}/wire/claude-4-2-launch/">`), "canonical built from the request host, trailing-slash form");
const shellLd = ldOf(shellOk.text);
ok(shellLd && shellLd["@type"] === "NewsArticle" && shellLd.citation.some((c) => String(c.url).includes("anthropic.com")), "NewsArticle JSON-LD with sources[] as citation");
const freshPost = await request("GET", "/api/wire/posts/claude-4-2-launch");
ok(shellLd.dateModified === freshPost.body.post.updatedAt, "JSON-LD dateModified tracks updated_at (corrections + lifecycle bumps)");
ok(shellOk.text.includes("misstated the price"), "the correction renders on the shell (no-JS body)");
ok(shellOk.text.includes("/#/wire/claude-4-2-launch"), "shell deep-links into the SPA");
ok((await request("GET", "/wire/claude-4-2-launch/")).status === 200, "trailing-slash request serves too (the canonical shape)");
ok((await request("GET", "/wire/still-a-draft")).status === 404, "draft shell → 404 (drafts are invisible everywhere)");
ok((await request("GET", "/wire/never-was")).status === 404, "unknown slug shell → 404");

const smapOn = await request("GET", "/wire/sitemap.xml");
ok(smapOn.status === 200 && (smapOn.headers.get("content-type") || "").includes("application/xml"), "GET /wire/sitemap.xml → 200 XML");
ok(smapOn.text.includes(`<loc>${main.base}/wire/claude-4-2-launch/</loc>`) && smapOn.text.includes(`<loc>${main.base}/wire/</loc>`), "sitemap lists the /wire/ index + the published shell");
ok(!smapOn.text.includes("still-a-draft"), "…and never a draft");

// ── S5: the transparency label on all four surfaces (D-W5) ────────────
const surfList = await request("GET", "/api/wire/posts");
ok(/reviewed by a human$/.test(surfList.body.transparency), "label surface 1: list API");
ok(/reviewed by a human$/.test(freshPost.body.transparency), "label surface 2: post API");
ok((await request("GET", "/wire/rss.xml")).text.includes("reviewed by a human"), "label surface 3: RSS subtitle");
ok(shellOk.text.includes("reviewed by a human"), "label surface 4: the shell");
const autoShell = await request("GET", "/wire/context-windows-trend", { base: auto.base });
ok(autoShell.status === 200 && !/reviewed by a human/.test(autoShell.text), "auto-mode shell drops the review clause — the label states track the policy");

// ── S5: review queue + unpublish audit (key-gated admin reads) ────────
ok((await request("GET", "/api/wire/admin/posts")).status === 401, "admin list without the key → 401");
const adminAll = await request("GET", "/api/wire/admin/posts", { key: KEY });
ok(adminAll.status === 200 && adminAll.body.posts.length === 3, "admin list sees every state (2 published + 1 draft)");
ok(adminAll.headers.get("cache-control") === "no-store", "admin reads are never cached");
const queue = await request("GET", "/api/wire/admin/posts?status=draft", { key: KEY });
ok(queue.body.posts.length === 1 && queue.body.posts[0].postId === "r-draft" && queue.body.posts[0].status === "draft", "the D-W1 review queue: drafts are listable");
ok((await request("GET", "/api/wire/admin/posts?status=bogus", { key: KEY })).status === 400, "unknown status filter → 400");
const adminDetail = await request("GET", "/api/wire/admin/posts/r-draft", { key: KEY });
ok(adminDetail.status === 200 && adminDetail.body.post.bodyMd.includes("Claude 4.2") && adminDetail.body.post.sources.length === 2, "admin detail serves the full draft for the review pass");
ok((await request("GET", "/api/wire/admin/posts/r-draft")).status === 401, "admin detail without the key → 401");
ok((await request("GET", "/api/wire/admin/posts/nope", { key: KEY })).status === 404, "unknown postId → 404");

// the kill-switch across the S3 surfaces + the audit view of the reason
await request("POST", "/api/wire/posts/run-2026-07-17-001/unpublish", { key: KEY, body: { reason: "second kill: audit-surface check" } });
ok((await request("GET", "/wire/claude-4-2-launch")).status === 404, "unpublish vanishes the shell on the next request");
ok(!(await request("GET", "/wire/sitemap.xml")).text.includes("claude-4-2-launch"), "…and its sitemap entry");
const audit2 = await request("GET", "/api/wire/admin/posts?status=unpublished", { key: KEY });
ok(audit2.body.posts.length === 1 && audit2.body.posts[0].unpublishReason === "second kill: audit-surface check" && audit2.body.posts[0].correctionsCount === 1, "audit surface: the retained row is readable with its reason + corrections count");

// ── S4: the seed script, end-to-end through the real API ──────────────
const seeded = await seedWire({ databaseUrl: process.env.DATABASE_URL, count: 5, key: "wk_seed_ci" });
ok(seeded.length === 5 && seeded.every((r) => r.ok), "seed-wire drove 5 example drafts through the real ingest gate");
const { rows: seedRows } = await pool.query("SELECT status FROM wire_posts WHERE post_id LIKE 'seed-example-%'");
ok(seedRows.length === 5 && seedRows.every((r) => r.status === "draft"), "seeds land as drafts — the review posture, never straight to the public list");
const seededAgain = await seedWire({ databaseUrl: process.env.DATABASE_URL, count: 5, key: "wk_seed_ci" });
ok(seededAgain.every((r) => r.ok && r.status === 200), "re-seeding replaces the drafts (US-W4 through the seed path)…");
ok((await pool.query("SELECT count(*)::int AS n FROM wire_posts WHERE post_id LIKE 'seed-example-%'")).rows[0].n === 5, "…and the row count holds at 5");
ok(!(await request("GET", "/api/wire/posts")).body.posts.some((p) => p.slug.startsWith("seed-example-")), "seeded drafts never reach the public list");

// ── rate limit on writes ───────────────────────────────────────────────
const limited = await mkApp({ rateLimit: { max: 2, windowMs: 60_000 } });
await request("POST", "/api/wire/posts", { key: KEY, body: {}, base: limited.base });
await request("POST", "/api/wire/posts", { key: KEY, body: {}, base: limited.base });
const third = await request("POST", "/api/wire/posts", { key: KEY, body: {}, base: limited.base });
ok(third.status === 429 && third.body.error === "rate_limited", "write routes rate-limited per IP");

// ── unmounted deploy (US-W6): honest degrade, byte-identical boot ──────
const bare = express();
bare.use(express.json());
// server.js's else-branch: both real-path XML surfaces answer machine-readable
bare.get("/wire/rss.xml", (_req, res) => res.status(503).json({ error: "not_configured" }));
bare.get("/wire/sitemap.xml", (_req, res) => res.status(503).json({ error: "not_configured" }));
bare.use("/api", (_req, res) => res.status(501).json({ error: "not_implemented" }));
const bareServer = createServer(bare);
await new Promise((r) => bareServer.listen(0, r));
servers.push(bareServer);
const bareBase = `http://127.0.0.1:${bareServer.address().port}`;
const unmounted = await request("GET", "/api/wire/posts", { base: bareBase });
ok(unmounted.status === 501, "no-Wire deploy: /api/wire/posts answers the 501 fallback (SPA feature-detects)");
const rssOff = await request("GET", "/wire/rss.xml", { base: bareBase });
ok(rssOff.status === 503 && rssOff.body.error === "not_configured", "no-Wire deploy: /wire/rss.xml → 503 not_configured (the /api/notify pattern)");
const smapOff = await request("GET", "/wire/sitemap.xml", { base: bareBase });
ok(smapOff.status === 503 && smapOff.body.error === "not_configured", "no-Wire deploy: /wire/sitemap.xml → 503 not_configured too");

for (const s of servers) s.close();
await pool.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
