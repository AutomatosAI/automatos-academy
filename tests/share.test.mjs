#!/usr/bin/env node
// Share-card tests (PRD-COMMUNITY S1) — zero-framework style, no DB needed:
// payload codec round-trips + strict rejection, HMAC signing round-trip,
// SVG/page template escaping and honesty rules (the "verified" grep-ban,
// prep-track binding, independence footer), the share attestor over fake
// pool/verifier seams, and a real resvg-wasm render smoke test (CI installs
// the pinned wasm dependency; there is no native toolchain to break).
import { encodeShare, decodeShare, streakMilestone, STREAK_MILESTONES } from "../public/js/engine/sharecard.js";
import { encodeCert, decodeCert } from "../public/js/engine/certificate.js";
import { createSigner } from "../server/signing.js";
import {
  initCardRenderer, cardsAvailable, renderCardPng,
  streakCardSvg, readinessCardSvg, certCardSvg, INDEPENDENCE_LINE,
} from "../server/share-cards.js";
import { sharePageHtml, shareCopy, shareTrackMeta, SHARE_FOOTER } from "../server/share-routes.js";
import { createShareAttestor, serverTrackPct } from "../server/share-attest.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

// ── payload codec ────────────────────────────────────────────────────────
console.log("share codec");
const today = "2026-07-17";
const streakP = encodeShare({ kind: "streak", n: 30, date: today });
const s1 = decodeShare(streakP);
ok(!!s1 && s1.kind === "streak" && s1.n === 30 && s1.date === today && s1.name === "", "streak round-trip, no name by default");
const readyP = encodeShare({ kind: "readiness", n: 68, vendorId: "anthropic", trackId: "cca-f", date: today, name: "Ada L." });
const r1 = decodeShare(readyP);
ok(!!r1 && r1.kind === "readiness" && r1.n === 68 && r1.vendorId === "anthropic" && r1.trackId === "cca-f" && r1.name === "Ada L.", "readiness round-trip with opt-in name");
ok(decodeShare(streakP.slice(0, -1) + (streakP.endsWith("0") ? "1" : "0")) === null, "tampered checksum → null");
{
  const dot = readyP.lastIndexOf(".");
  const forged = `${readyP.slice(0, dot)}x.${readyP.slice(dot + 1)}`;
  ok(decodeShare(forged) === null, "edited body under old checksum → null");
}
ok(decodeShare("") === null && decodeShare(null) === null && decodeShare("abc") === null, "garbage → null");
const mk = (o) => { // hand-rolled payload with a valid checksum, to probe field validation
  const body = Buffer.from(JSON.stringify(o), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  let h = 5381; const s = "automatos-academy-share-v1" + body;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `${body}.${h.toString(36)}`;
};
ok(decodeShare(mk({ k: "x", n: 5, d: today })) === null, "unknown kind → null");
ok(decodeShare(mk({ k: "s", n: 0, d: today })) === null, "streak 0 → null");
ok(decodeShare(mk({ k: "s", n: 10000, d: today })) === null, "streak over cap → null");
ok(decodeShare(mk({ k: "s", n: 7.5, d: today })) === null, "non-integer → null");
ok(decodeShare(mk({ k: "r", n: 101, d: today, v: "a", t: "b" })) === null, "readiness >100 → null");
ok(decodeShare(mk({ k: "r", n: -1, d: today, v: "a", t: "b" })) === null, "readiness <0 → null");
ok(decodeShare(mk({ k: "r", n: 50, d: today })) === null, "readiness without track → null");
ok(decodeShare(mk({ k: "r", n: 50, d: today, v: "a/../b", t: "c" })) === null, "track id with path chars → null");
ok(decodeShare(mk({ k: "s", n: 5, d: "17/07/2026" })) === null, "malformed date → null");
ok(decodeShare(mk({ k: "s", n: 5, d: today, m: "a\u0007b" })) === null, "control chars in name → null");
ok(decodeShare(mk({ k: "s", n: 5, d: today, m: "x".repeat(61) })) === null, "name over 60 chars → null");
ok(decodeShare(mk({ k: "s", n: 5, d: today, m: " padded " })) === null, "untrimmed name → null");

// The two codecs never accept each other's payloads (different salts).
const certP = encodeCert({ name: "Ada", vendorId: "anthropic", trackId: "cca-f", code: "CCA-F", date: today });
ok(decodeShare(certP) === null, "cert payload → decodeShare null");
ok(decodeCert(streakP) === null, "share payload → decodeCert null");

console.log("milestones");
ok(streakMilestone(6) === null, "6 days → below first milestone");
ok(streakMilestone(7) === 7 && streakMilestone(29) === 7, "7–29 days → milestone 7");
ok(streakMilestone(30) === 30 && streakMilestone(365) === 365, "tier boundaries hit");
ok(STREAK_MILESTONES[0] === 7, "first milestone is 7 (affordance gate)");

// ── signing round-trip ───────────────────────────────────────────────────
console.log("signing");
const signer = createSigner("test-secret");
const sig = signer.sign(streakP);
ok(/^[0-9a-f]{64}$/.test(sig), "sig is 64 lowercase hex chars");
ok(signer.matches(streakP, sig), "round-trip verifies");
ok(!signer.matches(readyP, sig), "sig bound to its payload");
ok(!signer.matches(streakP, sig.slice(0, 63) + (sig.endsWith("0") ? "1" : "0")), "tampered sig refused");
ok(!signer.matches(streakP, "") && !signer.matches(streakP, "zz"), "malformed sig refused");
ok(!createSigner("other-secret").matches(streakP, sig), "different secret refuses");

// ── card templates: escaping + honesty ──────────────────────────────────
console.log("card templates");
const svgs = {
  streak: streakCardSvg({ n: 30, date: today, signed: true }),
  readiness: readinessCardSvg({ n: 68, code: "GH-500", trackName: "GitHub Actions", isExam: true, date: today, name: "Ada", signed: false }),
  skills: readinessCardSvg({ n: 40, code: "APA", trackName: "Automatos Practitioner", isExam: false, date: today }),
  cert: certCardSvg({ name: "Ada <Lovelace> & 'co\"", trackName: "GitHub Actions", date: today, certId: "abc123", signed: true }),
};
ok(svgs.streak.includes("day study streak") && svgs.streak.includes(">30<"), "streak card carries the numeral + copy");
ok(svgs.readiness.includes("68%") && svgs.readiness.includes("readiness · GH-500 prep track"), "readiness card binds to the PREP TRACK");
ok(!svgs.readiness.includes("ready for"), "no pass-prediction copy");
ok(svgs.readiness.includes("not a pass prediction"), "readiness caption disclaims prediction");
ok(svgs.skills.includes("complete · Automatos Practitioner"), "skills card says complete, not readiness");
ok(svgs.readiness.includes(INDEPENDENCE_LINE.slice(0, 30)) && svgs.cert.includes(INDEPENDENCE_LINE.slice(0, 30)), "vendor-naming cards carry the independence line");
ok(!svgs.cert.includes("<Lovelace>") && svgs.cert.includes("&lt;Lovelace&gt;"), "card text slots are XML-escaped");
for (const [k, svg] of Object.entries(svgs)) {
  ok(!/verified/i.test(svg), `${k} card never says "verified"`);
  ok(svg.includes("Signed by the Academy") === (k === "streak" || k === "cert"), `${k} signed chip tracks the sig`);
}

// ── share page + copy ────────────────────────────────────────────────────
console.log("share page");
const fakeIndexEntry = (exam) => ({
  track: { data: { name: "GitHub Actions", code: "GH-500", summary: "Prep for the GH-500 exam.", exam: exam ? { questionCount: 60 } : undefined } },
  domains: new Map(),
});
const fakeIndex = {
  tracks: new Map([["github/gh-500", fakeIndexEntry(true)]]),
  manifest: { data: { vendors: [{ id: "github", name: "GitHub", tracks: [{ trackId: "gh-500", name: "GitHub Actions", summary: "Prep for the GH-500 exam." }] }] } },
};
const meta = shareTrackMeta(fakeIndex, "github", "gh-500");
ok(meta.trackName === "GitHub Actions" && meta.code === "GH-500" && meta.isExam === true, "trackMeta reads the index");
ok(shareTrackMeta(fakeIndex, "nope", "gone").known === false, "unknown track → honest fallback meta");
const shareObj = { kind: "readiness", n: 68, vendorId: "github", trackId: "gh-500", date: today, name: "<img src=x onerror=alert(1)>" };
const page = sharePageHtml({ share: shareObj, meta, pageUrl: "https://a.example/s/x", imageUrl: "https://a.example/s/x/card.png", signed: true });
ok(!page.includes("<img src=x") && page.includes("&lt;img"), "page escapes the name slot");
ok(page.includes('og:image" content="https://a.example/s/x/card.png"'), "og:image points at the card");
ok(page.includes("Start this track →") && page.includes(SHARE_FOOTER), "landing CTA + independence footer on the page");
ok(!/verified/i.test(page), 'share page never says "verified"');
ok(page.includes("Signed by the Academy"), "attested page shows the signed chip");
const streakPage = sharePageHtml({ share: { kind: "streak", n: 30, date: today, name: "" }, meta: { trackName: "", code: "", summary: "", isExam: false }, pageUrl: "u", imageUrl: "i", signed: false });
ok(streakPage.includes("Find your track →") && !streakPage.includes("Signed by the Academy"), "streak page: CTA present, no chip unsigned");
ok(shareCopy({ kind: "readiness", n: 68, date: today }, meta).sub.includes("not a pass prediction"), "readiness page copy disclaims prediction");

// ── attestor (fake pool + verifier seams) ────────────────────────────────
console.log("share attestor");
const attIndex = {
  tracks: new Map([
    ["github/gh-500", {
      track: { data: { name: "GitHub Actions", code: "GH-500", exam: { questionCount: 4 } } },
      domains: new Map([["d1", { data: { id: "d1", weight: 1, lessons: [{ id: "l1" }], questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }] } }]]),
    }],
    ["auto/apa", {
      track: { data: { name: "APA", code: "APA" } }, // no exam → skills
      domains: new Map([["d1", { data: { id: "d1", weight: 1, lessons: [{ id: "s1" }, { id: "s2" }], questions: [] } }]]),
    }],
  ]),
  manifest: { data: { vendors: [] } },
};
// One user with: full lesson, all 4 questions seen 1/correct 1 → mastery =
// 0.35·1 + 0.65·(1 × min(1, 4/4)) = 1.0 → 100%; and 1 of 2 skills lessons.
const fakePool = {
  query: async (sql, params) => {
    if (sql.includes("FROM users")) {
      return params[0] === "clerk_known" ? { rows: [{ id: "u1" }] } : { rows: [] };
    }
    if (sql.includes("runs")) return { rows: [{ best: 30, current: 5 }] }; // STREAK_SQL
    if (sql.includes("FROM progress")) {
      const [, vendorId] = params;
      if (vendorId === "github") {
        return { rows: ["q1", "q2", "q3", "q4", "l1"].map((id) => ({ item_id: id, seen: 1, correct: 1 })) };
      }
      return { rows: [{ item_id: "s1", seen: 1, correct: 0 }] };
    }
    throw new Error("unexpected SQL in fake pool: " + sql.slice(0, 40));
  },
};
const verifier = async (token) => {
  if (token === "good") return { sub: "clerk_known" };
  if (token === "stranger") return { sub: "clerk_unknown" };
  throw new Error("bad token");
};
const attest = createShareAttestor({ pool: fakePool, verifier, getIndex: () => attIndex });
const reqWith = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} });
const shr = (o) => ({ name: "", ...o });

ok((await attest(reqWith(null), shr({ kind: "streak", n: 5 }))).error === "missing_token", "no token → refused");
ok((await attest(reqWith("bad"), shr({ kind: "streak", n: 5 }))).error === "invalid_token", "unverifiable token → refused");
ok((await attest(reqWith("stranger"), shr({ kind: "streak", n: 5 }))).error === "not_attested", "no synced data → refused");
ok((await attest(reqWith("good"), shr({ kind: "streak", n: 30 }))).ok === true, "streak ≤ best → attested");
ok((await attest(reqWith("good"), shr({ kind: "streak", n: 31 }))).error === "not_attested", "streak above best → refused, reason not leaked");
ok((await attest(reqWith("good"), shr({ kind: "readiness", n: 100, vendorId: "github", trackId: "gh-500" }))).ok === true, "exam readiness ≤ server number → attested");
ok((await attest(reqWith("good"), shr({ kind: "readiness", n: 68, vendorId: "github", trackId: "gh-500" }))).ok === true, "under-claiming is honest → attested");
ok((await attest(reqWith("good"), shr({ kind: "readiness", n: 51, vendorId: "auto", trackId: "apa" }))).error === "not_attested", "skills: 51% claimed on 1/2 lessons → refused");
ok((await attest(reqWith("good"), shr({ kind: "readiness", n: 50, vendorId: "auto", trackId: "apa" }))).ok === true, "skills: 50% on 1/2 lessons → attested");
ok((await attest(reqWith("good"), shr({ kind: "readiness", n: 10, vendorId: "no", trackId: "such" }))).error === "not_attested", "unknown track → refused");
ok(await serverTrackPct(fakePool, attIndex, "u1", "github", "gh-500") === 100, "server pct mirrors the ported readiness math");

// ── rasteriser smoke (real resvg-wasm, pinned) ───────────────────────────
console.log("card rasteriser");
const inited = await initCardRenderer();
ok(inited && cardsAvailable(), "resvg-wasm + committed fonts initialise");
if (cardsAvailable()) {
  for (const [k, svg] of Object.entries(svgs)) {
    const png = renderCardPng(svg);
    ok(png && png.length > 2000 && png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47, `${k} card renders a real PNG (${png ? png.length : 0} bytes)`);
  }
}

console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
