#!/usr/bin/env node
// /privacy + /support — the URLs the App Store / Play listings and the mobile
// app's privacy screen depend on. Proves: the copy renders through the
// hardened md() path, carries the disclosures store review checks for, and
// the pages are reachable (routes registered, footer links, sitemap).
import { readFileSync } from "node:fs";
import { md } from "../public/js/markdown.js";
import { PRIVACY_MD, SUPPORT_MD, SUPPORT_EMAIL, POLICY_UPDATED } from "../public/js/legal-copy.js";
import { generateShells } from "../scripts/generate-shells.mjs";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const privacy = md(PRIVACY_MD);
const support = md(SUPPORT_MD);

ok(privacy.length > 2000 && support.length > 500, "both pages render to non-trivial HTML");
ok(!privacy.includes("${") && !support.includes("${"), "no unresolved template placeholders");
ok(privacy.includes(SUPPORT_EMAIL) && support.includes(SUPPORT_EMAIL), "contact email on both pages");
ok(privacy.includes(POLICY_UPDATED), "policy states its last-updated date");

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

// generateShells writes the (gitignored) public/sitemap.xml — an empty
// index is enough to see the static pages listed.
generateShells({ manifest: { data: { vendors: [] } }, tracks: new Map() }, {});
const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
ok(sitemap.includes("/privacy</loc>") && sitemap.includes("/support</loc>"), "sitemap lists /privacy and /support");

console.log(`\nlegal: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
