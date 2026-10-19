#!/usr/bin/env node
// Public facts sheet of 19 Oct 2026 — the Automatos tracks and the site shell
// must not drift back to claims the sheet retired, and must keep teaching the
// product as it ships (Command Centre tabs, Marketplace tabs, plugins, the
// open skills library). Static: reads the content tree, no server.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
const m08 = read("public/content/automatos/platform-architect/m08-channels-surfaces.json");
ok(m08.includes("12 Shopify agent templates") && m08.includes("Shopify Management") && /Shopify app[^.]*next/.test(m08), "m08 teaches the 12 Shopify agent templates as shipped and the Shopify app as next");
ok(m08.includes("Settings → Channels"), "m08 connects and watches channels in Settings → Channels");
const m09 = read("public/content/automatos/platform-architect/m09-governance-ops.json");
ok(m09.includes("Command Centre → Governance → Policy") && /ships off/.test(m09), "m09 teaches the workspace spend ceiling and that enforcement ships off");

console.log(`\npublic-facts: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
