#!/usr/bin/env node
// Public facts sheet of 19 Oct 2026 — the Automatos tracks and the site shell
// must not drift back to claims the sheet retired, and must keep teaching the
// product as it ships (Command Centre tabs, Marketplace tabs, plugins, the
// open skills library). Static: reads the content tree, no server.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { BRAND_FOOTER_HTML, FAMILY_LABEL, FAMILY_SITES, FAMILY_ROW_HTML, FAMILY_ROW_INLINE_HTML } from "../server/brand-footer.js";
import { ACADEMY_ORG_ID, AUTOMATOS_ORG_ID, AUTOMATOS_ORGANIZATION, siteJsonLd } from "../server/structured-data.js";
import { shellHtml } from "../scripts/generate-shells.mjs";
import { buildPostShellHtml } from "../server/wire/shell.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const root = fileURLToPath(new URL("..", import.meta.url));
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const read = (rel) => readFileSync(join(root, rel), "utf8");

const automatosJson = walk(join(root, "public/content/automatos")).filter((p) => p.endsWith(".json"));
const shellFiles = ["public/index.html", "public/js/legal-copy.js", "public/js/views/home.js", "public/js/tutor.js"].map((f) => join(root, f));
const corpus = [...automatosJson, ...shellFiles].map((p) => ({ p: p.slice(root.length), text: readFileSync(p, "utf8") }));

// Claims the sheet retired. Each pattern names the rule it enforces.
const RETIRED = [
  [/\b(?:110|130|150)\+/, "no 110+ / 130+ / 150+ counts (section 6)"],
  [/300\+ models|100\+ models|hundred-plus models/, "models are 400+ through OpenRouter (section 6)"],
  [/\b0 plugins\b|[Pp]lugins? sub-tab[^.]*\bempty\b/, "plugins are a true hosted claim: 70+ (section 6)"],
  [/Microsoft Teams|Google Chat|iMessage|nine documented channels/, "chat channels are Telegram, Slack, Discord and WhatsApp plus a webhook (section 6)"],
  [/ten starter agents|\b128 skills\b/, "day-one agents per edition; the open library is 140 skills (section 6)"],
  [/Automatos AI Academy/, 'the name is "Automatos Academy" (section 8b)'],
  [/aligned by design|AI Act[- ]compliant/i, "EU AI Act posture line, not a compliance claim (section 8)"],
  [/99\.9%|95% routing/, "no uptime or routing-accuracy stats (section 6)"],
  [/\bin flux\b/, "EU AI Act dates are set by Regulation (EU) 2026/1744 (section 8)"],
  [/Built on Automatos agents/, "outlets carry the Powered by pill only (section 2)"],
  [/pre-set spend ceiling|there is no hard spend cap/, "missions have a budget that pauses them; the workspace ceiling exists but ships off"],
  [/Channels Live/, "a connected channel shows on its card in Settings → Channels; the Command Centre has no 'Channels Live' card (facts 8b: no unrunning features as running)"],
  [/confirmed live on production|live production store today|Live today: partner app/, "the Shopify app is next, not in the App Store; the 12 Shopify agent templates ship (section 6)"],
  [/six-step create flow|From Template → Code Reviewer|Settings → Voice Profiles/, "the create dialog ships five steps (create-agent-modal.tsx); voice is the chat's Live button, Business plan on hosted Studio (section 4)"],
  [/verify-in-product|roadmap edge/, "branded documents and templates ship: generate_document renders PDF, DOCX and XLSX from the Brand Kit (facts 8b)"],
  [/\/Users\//, "no local machine paths in served content (track verification.sourceOfTruth)"],
  [/Activity → (?:Dashboard|Feed|Reports|Memory|Missions)|Agents → Playbooks|Analytics → Workflows/, "retired UI paths: the Command Centre's Calendar and Activity tab, Knowledge Base → Memory, Agent Details → Reports, Assignments → Playbooks/Missions, Analytics → Missions"],
];
for (const [rx, rule] of RETIRED) {
  const hits = corpus.filter(({ text }) => rx.test(text)).map(({ p }) => p);
  ok(hits.length === 0, `${rule}${hits.length ? " — found in " + hits.join(", ") : ""}`);
}

// What the course must keep teaching, as the product ships it.
const m00 = read("public/content/automatos/platform-architect/m00-what-is-automatos.json");
ok(m00.includes("Summary, Board, Calendar, Activity, Watchlist, Questions, Governance"), "m00 names the seven Command Centre tabs");
ok(/\*\*Plugin\*\*/.test(m00), "m00 keeps Plugin as a core term");
const m10 = read("public/content/automatos/platform-architect/m10-marketplace.json");
ok(m10.includes("Packages, Applications, Agents, Playbooks, LLMs, Capabilities"), "m10 names the six Marketplace tabs, Packages first");
ok(m10.includes("Socials, Shopify Management and Shopify Development"), "m10 names the 3 packages");
ok(/70\+ plugins/.test(m10) && /400\+ skills/.test(m10), "m10 gives the hosted plugin and skill counts");
const m02 = read("public/content/automatos/platform-architect/m02-skills.json");
ok(m02.includes("140 skills") && m02.includes("18 top-level"), "m02 cites the open library as 140 skills in 18 top-level folders");
ok(!/Agent Details → Plugins/.test(m02), "m02 assigns skills in the Configure panel, not the retired Agent Details → Plugins path");
const m01 = read("public/content/automatos/platform-architect/m01-chat-first-agent.json");
ok(m01.includes("Config, Persona, Model, Tools, Capabilities"), "m01 teaches the five create steps as the dialog ships them");
ok(/voice is part of the \*\*Business\*\* plan/.test(m01), "m01 names the plan voice comes with on hosted Studio");
const m07 = read("public/content/automatos/platform-architect/m07-deliverables.json");
ok(/generate_document/.test(m07) && /branded PDF, DOCX and XLSX/.test(m07) && m07.includes("Deliverables → Templates"), "m07 teaches branded PDF, DOCX and XLSX generation from the Template Studio as shipped");
const m08 = read("public/content/automatos/platform-architect/m08-channels-surfaces.json");
ok(m08.includes("12 Shopify agent templates") && m08.includes("Shopify Management") && /Shopify app[^.]*next/.test(m08), "m08 teaches the 12 Shopify agent templates as shipped and the Shopify app as next");
ok(m08.includes("Settings → Channels"), "m08 connects and watches channels in Settings → Channels");
const m09 = read("public/content/automatos/platform-architect/m09-governance-ops.json");
ok(m09.includes("Command Centre → Governance → Policy") && /ships off/.test(m09), "m09 teaches the workspace spend ceiling and that enforcement ships off");

// The Automatos AI family row (Gerard, 19 Oct 2026; reverses the 6 Oct "no
// family column on product sites" rule): the last line of every footer, the
// four family sites in a fixed order, this site shown but not linked.
const index = read("public/index.html");
const footer = index.slice(index.indexOf("<footer"), index.indexOf("</footer>"));
const squash = (html) => html.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").trim();
const spaRow = (footer.match(/<nav class="ac-family"[\s\S]*?<\/nav>/) || [""])[0];
ok(FAMILY_LABEL === "The Automatos AI family" && FAMILY_ROW_HTML.includes(`>${FAMILY_LABEL}</span>`), 'family row is labelled "The Automatos AI family"');
ok(isDeepStrictEqual(FAMILY_SITES.map(({ name, href }) => [name, href]), [
  ["Automatos AI", "https://automatos.app"],
  ["Automatos Studio", "https://studio.automatos.app"],
  ["Automatos Academy", "https://academy.automatos.app"],
  ["Automatos Markets", "https://markets.automatos.app"],
]), "family sites in order: Automatos AI, Automatos Studio, Automatos Academy, Automatos Markets");
const rowEntries = [...FAMILY_ROW_HTML.matchAll(/<li>(?:<a href="([^"]+)">|<span aria-current="page">)([^<]+)</g)].map((m) => [m[2], m[1] || null]);
ok(isDeepStrictEqual(rowEntries, [
  ["Automatos AI", "https://automatos.app"],
  ["Automatos Studio", "https://studio.automatos.app"],
  ["Automatos Academy", null],
  ["Automatos Markets", "https://markets.automatos.app"],
]), 'the row links the other three and shows Automatos Academy as aria-current="page", not a self-link');
ok(!/nofollow|target=|rel=/.test(FAMILY_ROW_HTML + FAMILY_ROW_INLINE_HTML), "family links are plain <a> links (no rel, no target)");
ok(spaRow !== "" && squash(spaRow) === FAMILY_ROW_HTML, "the SPA footer's family row is the same markup as FAMILY_ROW_HTML");
ok(footer.lastIndexOf("© 2026 Automatos AI") < footer.indexOf('class="ac-family"') && squash(footer).endsWith("</ul></nav></div>"), "the family row is the last line of the SPA footer");
ok((footer.match(/class="ac-family"/g) || []).length === 1 && (footer.match(/href="https:\/\/markets\.automatos\.app"/g) || []).length === 1, "the family is listed once in the SPA footer");
ok(BRAND_FOOTER_HTML.trim().endsWith(FAMILY_ROW_HTML), "standalone pages (BRAND_FOOTER_HTML) end with the family row");
ok(FAMILY_ROW_INLINE_HTML.includes(`${FAMILY_LABEL}:`) && FAMILY_SITES.every(({ name, href }) => name === "Automatos Academy"
  ? FAMILY_ROW_INLINE_HTML.includes(`aria-current="page" style="font-weight:600;color:#1c2740;">${name}</span>`)
  : FAMILY_ROW_INLINE_HTML.includes(`<a href="${href}" style="color:#40506e;">${name}</a>`)), "the inline row (unsubscribe page) carries the same four entries");

// One Organization across the family sites, shared by @id; the Academy is an
// EducationalOrganization under it (public facts sheet, section 2: no legal
// name, no address, never Ltd, Lda or Labs).
const plain = (o) => JSON.parse(JSON.stringify(o));
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
  try { return JSON.parse(m[1]); } catch (e) { return { parseError: e.message }; }
});
const org = AUTOMATOS_ORGANIZATION;
ok(org["@type"] === "Organization" && org["@id"] === "https://automatos.app/#organization" && AUTOMATOS_ORG_ID === org["@id"]
  && org.name === "Automatos AI" && org.url === "https://automatos.app", "the Organization is https://automatos.app/#organization, Automatos AI, https://automatos.app");
ok(/^https:\/\/automatos\.app\/\S+\.(?:png|svg|jpg)$/.test(org.logo), "the Organization logo is an absolute image URL on automatos.app");
ok(org.sameAs.length > 0 && org.sameAs.every((u) => /^https:\/\//.test(u) && !/discord/i.test(u)), "sameAs lists public https profiles, never a Discord link");
ok(!["legalName", "address", "foundingDate", "foundingLocation", "founder"].some((k) => k in org) && !/\b(?:Ltd|Lda|Labs)\b/.test(JSON.stringify(org)), "no legal name, address or founding claims, never Ltd, Lda or Labs");

// Every JSON-LD block the Academy emits defines the shared Organization once
// and names the Academy only as an EducationalOrganization under it.
const nodesNamed = (o, name) => (o && typeof o === "object"
  ? [...(o.name === name ? [o] : []), ...Object.values(o).flatMap((v) => nodesNamed(v, name))]
  : []);
function checkGraph(ld, where) {
  const graph = Array.isArray(ld["@graph"]) ? ld["@graph"] : [];
  const orgs = graph.filter((n) => n["@id"] === AUTOMATOS_ORG_ID);
  ok(!ld.parseError && ld["@context"] === "https://schema.org" && orgs.length === 1 && isDeepStrictEqual(orgs[0], plain(org)), `${where}: JSON-LD parses and defines the shared Organization once`);
  const academy = nodesNamed(ld, "Automatos Academy");
  ok(academy.length > 0 && academy.every((n) => n["@type"] === "EducationalOrganization" && isDeepStrictEqual(n.parentOrganization, { "@id": AUTOMATOS_ORG_ID })), `${where}: Automatos Academy is an EducationalOrganization whose parentOrganization is the shared @id`);
  ok(academy.length > 0 && academy.every((n) => n["@id"] === "https://academy.automatos.app/#academy" && n.url === "https://academy.automatos.app"), `${where}: the Academy node's @id and url are pinned to https://academy.automatos.app, whatever host served the page`);
  ok(nodesNamed(ld, "Automatos AI").length === 1, `${where}: no second Automatos AI Organization`);
  return graph;
}

const spaLd = ldBlocks(index);
ok(spaLd.length === 1 && isDeepStrictEqual(spaLd[0], plain(siteJsonLd())), "the SPA shell's JSON-LD is siteJsonLd() from server/structured-data.js");
if (spaLd.length) checkGraph(spaLd[0], "SPA shell");

const trackShell = shellHtml({ trackId: "facts", vendorId: "automatos", vendorName: "Automatos" }, { name: "Facts track", summary: "A track.", domainFiles: [] });
const trackLd = ldBlocks(trackShell);
const course = trackLd.length ? checkGraph(trackLd[0], "track shell").find((n) => n["@type"] === "Course") : null;
ok(!!course && course.provider.name === "Automatos Academy" && course.isAccessibleForFree === true, "track shell: the Course is provided by Automatos Academy, free");
ok(trackShell.includes(FAMILY_ROW_HTML), "track shell carries the family row");

const wireShell = buildPostShellHtml({
  post: { slug: "facts", title: "Facts", summary: "S", type: "trend", byline: { agents: ["QUILL"] }, published_at: "2026-10-19T00:00:00Z", updated_at: "2026-10-19T00:00:00Z", sources: [], corrections: [], tags: [], body_html: "<p>b</p>" },
  // A Railway host, as a request reaching the service directly would carry:
  // the page URLs follow it, the Academy's identity must not.
  baseUrl: "http://automatos-academy-production.up.railway.app", label: "L",
});
const wireLd = ldBlocks(wireShell);
const posting = wireLd.length ? checkGraph(wireLd[0], "Wire post shell").find((n) => n["@type"] === "BlogPosting") : null;
ok(!!posting && posting.publisher.name === "Automatos Academy", "Wire post shell: the BlogPosting is published by Automatos Academy");
ok(!!posting && posting.publisher["@id"] === ACADEMY_ORG_ID && ACADEMY_ORG_ID === "https://academy.automatos.app/#academy"
  && posting.url === "http://automatos-academy-production.up.railway.app/wire/facts/", "Wire post shell: the publisher keeps the Academy @id on another host; only the page URL follows the request");
ok(wireShell.includes(FAMILY_ROW_HTML), "Wire post shell carries the family row");

console.log(`\npublic-facts: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
