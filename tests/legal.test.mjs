#!/usr/bin/env node
// /privacy + /support — the URLs the App Store / Play listings and the mobile
// app's privacy screen depend on. Proves: the copy renders through the
// hardened md() path, carries the disclosures store review checks for, and
// the pages are reachable (routes registered, footer links, sitemap).
import { readFileSync } from "node:fs";
import { md } from "../public/js/markdown.js";
import { PRIVACY_MD, SUPPORT_MD, SUPPORT_EMAIL, POLICY_UPDATED, CONTACT_URL } from "../public/js/legal-copy.js";
import { generateShells } from "../scripts/generate-shells.mjs";
import { BRAND_FOOTER_HTML } from "../server/brand-footer.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const privacy = md(PRIVACY_MD);
const support = md(SUPPORT_MD);

ok(privacy.length > 2000 && support.length > 500, "both pages render to non-trivial HTML");
ok(!privacy.includes("${") && !support.includes("${"), "no unresolved template placeholders");
ok(privacy.includes(SUPPORT_EMAIL) && support.includes(SUPPORT_EMAIL), "contact email on both pages");
// Public facts sheet 8b: the one contact route is the company contact form.
// The role address stays as the second option (a data-rights contact).
const contactLink = `<a href="${CONTACT_URL}" target="_blank" rel="noopener">`;
ok(CONTACT_URL === "https://automatos.app/contact" && privacy.includes(contactLink) && support.includes(contactLink), "both pages link the contact form at https://automatos.app/contact");
ok(/through the contact form at <a [^>]+>automatos\.app\/contact<\/a> or by emailing/.test(privacy), "data-rights requests: the contact form, or the email address");
const views = readFileSync(new URL("../public/js/views/legal.js", import.meta.url), "utf8");
ok((views.match(/contactButton\(\)/g) || []).length === 2, "/privacy and /support both lead with the contact form button");
ok(privacy.includes(POLICY_UPDATED), "policy states its last-updated date");
ok(support.includes("We reply within two working days.") && privacy.includes("We reply within two working days."), "reply-time line is the facts-sheet wording on both pages");

// the disclosures App Review / App Privacy ask for, by heading
for (const id of ["what-we-collect", "who-helps-us-run-it", "how-long-we-keep-it", "your-choices-and-rights", "children"]) {
  ok(privacy.includes(`id="${id}"`), `privacy has the "${id}" section`);
}
ok(/Delete your account/.test(privacy), "privacy explains account deletion");
ok(/16 and over/.test(privacy), "privacy states the 16+ age floor the app enforces");
for (const name of ["Clerk", "Railway", "Amazon Web Services", "Anthropic", "Google Fonts"]) {
  ok(privacy.includes(name), `privacy names processor: ${name}`);
}

// reachable: client routes, footer links, sitemap
const app = readFileSync(new URL("../public/js/app.js", import.meta.url), "utf8");
ok(/route\("\/privacy", privacyView\)/.test(app) && /route\("\/support", supportView\)/.test(app), "routes registered");
const index = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const footer = index.slice(index.indexOf("<footer"), index.indexOf("</footer>"));
ok(footer.includes('href="/privacy"') && footer.includes('href="/support"'), "footer links both pages");

// public facts sheet of 19 Oct 2026: the SPA footer carries the outlet pill
// and the one copyright form, labels the legal link "EU AI Act", and points
// Terms and Cookies at automatos.app (the Academy has no pages of its own).
ok(footer.includes('class="ac-powered"') && footer.includes("Powered by <strong>Automatos AI</strong>"), "footer carries the Powered by pill");
ok(footer.includes("© 2026 Automatos AI") && !/Ltd|Lda|Labs/.test(footer), "footer uses the one copyright form");
ok(/<a href="https:\/\/automatos\.app\/eu-ai-act"[^>]*>EU AI Act<span aria-hidden="true"> ↗<\/span><\/a>/.test(footer) && !/EU AI Act posture/i.test(footer), 'footer labels the EU AI Act link "EU AI Act" (the new-tab ↗ is aria-hidden)');
ok(footer.includes('href="https://automatos.app/terms"') && footer.includes('href="https://automatos.app/cookies"'), "footer links Terms and Cookies on automatos.app");
ok(!footer.includes("Built on Automatos agents"), "footer drops the old 'Built on Automatos agents' line (the pill replaces it)");
ok(!/Automatos AI Academy/.test(PRIVACY_MD + SUPPORT_MD) && PRIVACY_MD.includes("**Automatos Academy**"), 'legal copy names the product "Automatos Academy"');

// EU AI Act Article 50(1) (applies since 2 Aug 2026, taught in the AIGP
// track): every widget-embed example the course teaches labels the bot as an
// AI in the header `title` (what visitors see). The chat widget never renders
// `greeting` (automatos-widget-sdk packages/chat-widget passes only
// config.title to the header), so a greeting cannot carry the disclosure.
const strings = (o) => (typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(strings) : []);
for (const file of ["m08-channels-surfaces.json", "m10-marketplace.json"]) {
  const doc = JSON.parse(readFileSync(new URL(`../public/content/automatos/platform-architect/${file}`, import.meta.url), "utf8"));
  const inits = strings(doc).flatMap((s) => [...s.matchAll(/AutomatosWidget\.init\(\{([\s\S]*?)\}\)/g)].map((m) => m[1])).filter((b) => b.includes("apiKey:"));
  ok(inits.length > 0 && inits.every((b) => /title:\s*(["'])[^"']*\bAI\b[^"']*\1/.test(b)), `${file}: every widget embed example puts "AI" in the header title`);
  ok(inits.every((b) => !/greeting:/.test(b)), `${file}: no widget embed example relies on greeting (the chat widget never displays it)`);
}

// generateShells writes the (gitignored) public/sitemap.xml — an empty
// index is enough to see the static pages listed.
generateShells({ manifest: { data: { vendors: [] } }, tracks: new Map() }, {});
const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
ok(sitemap.includes("/privacy</loc>") && sitemap.includes("/support</loc>"), "sitemap lists /privacy and /support");

// the one copyright form every standalone page carries (track shells, /cert,
// share and Wire pages all render BRAND_FOOTER_HTML)
ok(BRAND_FOOTER_HTML.includes('class="ac-powered"') && BRAND_FOOTER_HTML.includes("Powered by"), "brand footer carries the Powered by pill");
ok(BRAND_FOOTER_HTML.includes("© 2026 Automatos AI") && !/Ltd|Lda|Labs/.test(BRAND_FOOTER_HTML), "brand footer uses the one copyright form");

console.log(`\nlegal: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
