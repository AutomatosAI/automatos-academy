#!/usr/bin/env node
// Wire tests (PRD-WIRE S1/S2) — same zero-framework style as the other suites.
//
// Unit tests always run: the §4.3 verification gate (pure validate.js), the
// timing-safe key comparator, the D-W5 transparency label, the Atom feed
// builder, and the hardened markdown render path (PRD-WIRE §7). Integration
// tests need a real Postgres and run only when DATABASE_URL is set (the CI
// `spine` job provides a service container and applies migrations first);
// without it they skip loudly so `npm test` stays green with zero env.
import { createServer } from "http";
import express from "express";
import {
  validateIngest, registrableDomain,
  MAX_TITLE, MAX_SUMMARY, MAX_TAGS, MAX_BODY_BYTES, MAX_CLAIMS,
} from "../server/wire/validate.js";
import { keyMatcher } from "../server/wire/auth.js";
import { transparencyLabel } from "../server/wire/label.js";
import { buildFeedXml } from "../server/wire/rss.js";
import { mountWire } from "../server/wire/index.js";
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

// ── rate limit on writes ───────────────────────────────────────────────
const limited = await mkApp({ rateLimit: { max: 2, windowMs: 60_000 } });
await request("POST", "/api/wire/posts", { key: KEY, body: {}, base: limited.base });
await request("POST", "/api/wire/posts", { key: KEY, body: {}, base: limited.base });
const third = await request("POST", "/api/wire/posts", { key: KEY, body: {}, base: limited.base });
ok(third.status === 429 && third.body.error === "rate_limited", "write routes rate-limited per IP");

// ── unmounted deploy (US-W6): honest degrade, byte-identical boot ──────
const bare = express();
bare.use(express.json());
bare.get("/wire/rss.xml", (_req, res) => res.status(503).json({ error: "not_configured" })); // server.js's else-branch
bare.use("/api", (_req, res) => res.status(501).json({ error: "not_implemented" }));
const bareServer = createServer(bare);
await new Promise((r) => bareServer.listen(0, r));
servers.push(bareServer);
const bareBase = `http://127.0.0.1:${bareServer.address().port}`;
const unmounted = await request("GET", "/api/wire/posts", { base: bareBase });
ok(unmounted.status === 501, "no-Wire deploy: /api/wire/posts answers the 501 fallback (SPA feature-detects)");
const rssOff = await request("GET", "/wire/rss.xml", { base: bareBase });
ok(rssOff.status === 503 && rssOff.body.error === "not_configured", "no-Wire deploy: /wire/rss.xml → 503 not_configured (the /api/notify pattern)");

for (const s of servers) s.close();
await pool.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
