#!/usr/bin/env node
// LX-6 — mdInline(): overview/summary fields render markdown through the same
// hardened path as lesson bodies. Escape-first, no raw HTML, schemes allowlisted.
import { mdInline } from "../public/js/markdown.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

ok(mdInline("It tests whether you can *place* every feature") ===
   "It tests whether you can <em>place</em> every feature", "single-star italics render");
ok(mdInline("sold as **GitHub Secret Protection** now") ===
   "sold as <strong>GitHub Secret Protection</strong> now", "double-star bold renders");
ok(mdInline("run `gh api` first") === "run <code>gh api</code> first", "backtick code renders");
ok(mdInline("<img onerror=x> **b**") === "&lt;img onerror=x&gt; <strong>b</strong>",
   "HTML is escaped before formatting — no raw HTML, ever");
const badScheme = mdInline("[docs](javascript:alert(1))");
ok(!badScheme.includes("<a") && !badScheme.includes("javascript:"), "bad scheme refused — no link, no javascript:");
ok(mdInline("[guide](https://docs.github.com)").includes('href="https://docs.github.com"'),
   "http(s) links allowed");
// loose-star arithmetic must NOT italicise: "2 * 3 * 4"
ok(!mdInline("2 * 3 * 4").includes("<em>"), "spaced asterisks stay literal (arithmetic-safe)");
ok(mdInline("") === "" && mdInline(undefined) === "", "empty and undefined are safe");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
