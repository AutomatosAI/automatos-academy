#!/usr/bin/env node
// Card contract tests (PRD-WAVE-LIVING-ACADEMY LA-1 + the LA-2 concept keys
// cards are built on). Same zero-framework style as the other suites, run
// against the REAL content tree — the proof that today's questions project
// into typed cards with no content duplication and no authoring changes.
import { readFileSync, rmSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { createHash } from "crypto";
import express from "express";
import { buildContentIndex, createCatalogRouter } from "../server/catalog.js";
import {
  conceptKey, parseConceptKey, isConceptKey, conceptAncestors,
  domainConceptKey, trackKeyOf, normalizeConceptKeys, conceptKeysForItem,
  CONCEPT_KEY_MAX,
} from "../server/concepts/keys.js";
import {
  CARD_TYPES, DEFAULT_LOCALE, validateCard, validateCards,
  normalizeLocale, localeMatches, isCardType, isMediaCardType,
} from "../server/cards/types.js";
import { cardsFromDomain, cardsFromTrack, quizCardFromQuestion } from "../server/cards/map.js";
import { collectCards, resolveLocale, parseTypeFilter } from "../server/cards/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "public", "content");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

let pass = 0, fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log("  ✓ " + msg)) : (fail++, console.error("  ✗ " + msg)));

const scratch = mkdtempSync(join(tmpdir(), "cards-test-"));
const idx = buildContentIndex(CONTENT, join(scratch, "journal.json"));

// ── concept keys (LA-2 core, LA-1 depends on it) ───────────────────────
console.log("concept keys");
ok(conceptKey({ vendorId: "anthropic", trackId: "cca-f", domainId: "d3" }) === "anthropic/cca-f/d3", "domain key");
ok(conceptKey({ vendorId: "anthropic", trackId: "cca-f", domainId: "d3", lessonRef: "l1-memory" }) === "anthropic/cca-f/d3/l1-memory", "lesson key");
ok(conceptKey({ vendorId: "Anthropic", trackId: "CCA-F" }) === "anthropic/cca-f", "track key, case-normalised");
ok(conceptKey({ vendorId: "anthropic" }) === null, "a key needs at least vendor + track");
ok(conceptKey({ vendorId: "an/thropic", trackId: "t" }) === null, "a slash inside a segment is rejected (keys must parse unambiguously)");
ok(conceptKey({ vendorId: "a", trackId: "b", lessonRef: "l1" }) === "a/b", "a lesson without a domain is dropped, not spliced");
ok(conceptKey({ vendorId: "a", trackId: "b".repeat(CONCEPT_KEY_MAX) }) === null, "over-long keys are refused");

const parsed = parseConceptKey("anthropic/cca-f/d3/l1-memory");
ok(parsed && parsed.domainId === "d3" && parsed.lessonRef === "l1-memory" && parsed.level === "lesson", "parse round-trips ids + level");
ok(parseConceptKey("anthropic/cca-f").level === "track", "track-level key");
ok(parseConceptKey("a/b/c/d/e") === null && parseConceptKey("a") === null, "wrong arity rejected");
ok(!isConceptKey("Anthropic/CCA-F"), "uppercase is not a key (keys are ids, minted lowercase)");
ok(JSON.stringify(conceptAncestors("a/b/c/d")) === JSON.stringify(["a/b/c/d", "a/b/c", "a/b"]), "ancestors finest → coarsest");
ok(conceptAncestors("nope").length === 0, "ancestors of a malformed key is empty, not a throw");
ok(domainConceptKey("a/b/c/d") === "a/b/c" && domainConceptKey("a/b") === null, "domain key of a lesson key");
ok(trackKeyOf("a/b/c/d") === "a/b", "track prefix");
ok(JSON.stringify(normalizeConceptKeys(["A/B", "a/b", "bad key", 7, "a/c"])) === JSON.stringify(["a/b", "a/c"]), "normalize lowercases, dedupes, drops junk");
ok(normalizeConceptKeys("nope").length === 0, "normalize of a non-array is empty");
ok(JSON.stringify(conceptKeysForItem({ vendorId: "a", trackId: "b", domainId: "c", lessonRef: "l1" })) === JSON.stringify(["a/b/c/l1", "a/b/c"]), "item concepts are finest-first");

// ── card validation ────────────────────────────────────────────────────
console.log("card validation");
const SCOPE = { vendorId: "anthropic", trackId: "cca-f", domainId: "d3" };
const base = {
  id: "fc-1", type: "flashcard",
  payload: { front: "What is X?", back: "X is Y." },
  source: { lessonRef: "l1-memory", chunkRef: "chunk-7" },
};
const good = validateCard(base, { scope: SCOPE });
ok(good.ok, "a well-formed flashcard validates");
ok(good.card.uid === "anthropic/cca-f/fc-1", "uid is scope-qualified");
ok(good.card.id === "fc-1", "id stays the ITEM id (progress rows key on it)");
ok(good.card.locale === DEFAULT_LOCALE, 'absent locale defaults to "en"');
ok(JSON.stringify(good.card.conceptKeys) === JSON.stringify(["anthropic/cca-f/d3/l1-memory", "anthropic/cca-f/d3"]), "conceptKeys default to the card's own position");
ok(good.card.source.refs.length === 0, "source.refs defaults to []");
ok(good.card !== base, "validation returns a new object (the source document is never captured)");

ok(validateCard(base, {}).error === "bad_scope", "a card with no scope is refused");
ok(validateCard({ ...base, id: "" }, { scope: SCOPE }).error === "bad_card_id", "empty id");
ok(validateCard({ ...base, id: "a/b" }, { scope: SCOPE }).error === "bad_card_id", "id may not contain a slash");
ok(validateCard({ ...base, type: "podcast" }, { scope: SCOPE }).error === "unknown_card_type", "unknown type");
ok(validateCard({ ...base, locale: "english" }, { scope: SCOPE }).error === "bad_locale", "malformed locale");
ok(validateCard({ ...base, payload: [] }, { scope: SCOPE }).error === "payload_not_object", "array payload");
ok(validateCard({ ...base, source: undefined }, { scope: SCOPE }).error === "source_required", "source is required (FR-2)");
ok(validateCard({ ...base, payload: { big: "x".repeat(70_000) } }, { scope: SCOPE }).error === "payload_too_large", "payload ceiling");
ok(validateCard({ ...base, media: { slotId: "ig-d3-1" } }, { scope: SCOPE }).error === "media_slot_not_allowed", "a Lane-1 card may not carry a media slot");
ok(validateCard({ ...base, type: "infographic" }, { scope: SCOPE }).error === "media_slot_required", "a Lane-2 card without a slot has nothing to render");
ok(validateCard({ ...base, type: "infographic", media: { slotId: "ig-d3-1" } }, { scope: SCOPE }).ok, "infographic + slot validates");
ok(validateCard({ ...base, type: "minivideo", media: { slotId: "bad slot" } }, { scope: SCOPE }).error === "bad_media_slot", "slot ids are ids");

const declared = validateCard({ ...base, conceptKeys: ["anthropic/cca-f/d3/l9-custom"] }, { scope: SCOPE });
ok(declared.ok && declared.card.conceptKeys.length === 1, "declared conceptKeys win over the default (the D-LA3 enrichment seam)");

const nullSource = validateCard({ ...base, source: { lessonRef: null } }, { scope: SCOPE });
ok(nullSource.ok && nullSource.card.source.lessonRef === null, "a standalone item honestly has no lessonRef");

ok(normalizeLocale("PT-br") === "pt-BR" && normalizeLocale("EN") === "en", "locale tags normalise to one canonical form");
ok(normalizeLocale("") === null && normalizeLocale("zzzzz-") === null, "junk locales are null");
ok(localeMatches("pt-BR", "pt") && localeMatches("pt", "pt-BR") && !localeMatches("es", "pt"), "locale matching is base-language aware");
ok(CARD_TYPES.every(isCardType) && !isCardType("nope"), "the type registry answers for its own members");
ok(isMediaCardType("infographic") && isMediaCardType("minivideo") && !isMediaCardType("quiz"), "Lane 2 is exactly the two rendered types");

const batch = validateCards([base, { ...base }, { ...base, id: "fc-2" }, { id: "x" }], { scope: SCOPE });
ok(batch.cards.length === 2, "duplicate ids collapse to the first");
ok(batch.errors.length === 2, "every error is collected, not just the first");
ok(validateCards(undefined, { scope: SCOPE }).cards.length === 0, "an absent cards[] is not an error");
ok(validateCards("nope", { scope: SCOPE }).errors.length === 1, "a non-array cards[] is one clear error");

// ── mapping real content ───────────────────────────────────────────────
console.log("question → quiz mapping (real CCA-F content)");
const D3 = readJson(join(CONTENT, "anthropic", "cca-f", "d3-agent-ops-claude-code.json"));
const mapped = cardsFromDomain(D3, SCOPE);
const kcCount = (D3.lessons || []).reduce((n, l) => n + (l.knowledgeCheck || []).length, 0);
ok(mapped.errors.length === 0, "real content projects with zero errors");
ok(mapped.cards.length === kcCount + D3.questions.length, `every question + knowledge check becomes a card (${mapped.cards.length})`);
ok(mapped.cards.every((c) => c.type === "quiz"), "all derived cards are quiz cards");
ok(mapped.cards.every((c) => c.conceptKeys.includes("anthropic/cca-f/d3")), "every card carries its domain concept");

const firstKc = mapped.cards[0];
const srcKc = D3.lessons[0].knowledgeCheck[0];
ok(firstKc.id === srcKc.id, "knowledge checks come first, ids verbatim");
ok(firstKc.source.lessonRef === D3.lessons[0].id, "a knowledge check cites its lesson");
ok(firstKc.conceptKeys[0] === `anthropic/cca-f/d3/${D3.lessons[0].id}`, "and gets the finer lesson concept");
ok(firstKc.payload.stem === srcKc.stem, "stem carried verbatim — no content duplication, a projection");
ok(firstKc.payload.correctOptionIds.length >= 1 && firstKc.payload.options.length === srcKc.options.length, "answer key + options project");
ok(JSON.stringify(firstKc.source.refs) === JSON.stringify(srcKc.sourceRefs || []), "sourceRefs ride through as source.refs");

const standalone = mapped.cards.find((c) => c.id === D3.questions[0].id);
ok(standalone && standalone.source.lessonRef === null, "a standalone question has no lessonRef (null, not invented)");
ok(standalone.conceptKeys.length === 1, "and only the domain concept");

ok(quizCardFromQuestion({ id: "q", options: [{ id: "a", correct: true }] }, SCOPE) === null, "a one-option question is not an answerable card");
ok(quizCardFromQuestion({ id: "q", options: [{ id: "a" }, { id: "b" }] }, SCOPE) === null, "no correct option → not a card");
ok(quizCardFromQuestion(null, SCOPE) === null, "a malformed item returns null, never throws");
const multi = quizCardFromQuestion({ id: "q", type: "single", explanation: "e", stem: "s", options: [{ id: "a", correct: true }, { id: "b", correct: true }] }, SCOPE);
ok(multi.payload.multi === true, "multi is derived from the answer key, not the declared type");

// authored cards merge over derived ones, in place
const withAuthored = {
  ...D3,
  cards: [
    { id: srcKc.id, type: "flashcard", payload: { front: "f", back: "b" }, source: { lessonRef: null } },
    { id: "fc-new", type: "flashcard", payload: { front: "n", back: "n" }, source: { lessonRef: null } },
    { id: "bad", type: "nope", payload: {}, source: {} },
  ],
};
const merged = cardsFromDomain(withAuthored, SCOPE);
ok(merged.cards[0].id === srcKc.id && merged.cards[0].type === "flashcard", "an authored card REPLACES the derived one of the same id, in place");
ok(merged.cards.length === mapped.cards.length + 1, "and a new authored card appends");
ok(merged.cards[merged.cards.length - 1].id === "fc-new", "appended at the end, order otherwise untouched");
ok(merged.errors.length === 1, "the malformed authored card is one reported error, not a crash");
ok(cardsFromTrack({ cards: [{ id: "cl-1", type: "changelog", payload: { entry: "x" }, source: {} }] }, SCOPE).cards[0].scope.domainId === null, "track-scope cards belong to no domain");
ok(cardsFromDomain(null, SCOPE).cards.length === 0, "a null document yields no cards");

// ── locale resolution (FR-6) ───────────────────────────────────────────
console.log("locale resolution");
const mk = (uid, locale) => ({ uid, id: uid.split("/").pop(), locale, type: "quiz" });
const variants = [mk("a/b/c1", "en"), mk("a/b/c1", "pt-BR"), mk("a/b/c2", "en"), mk("a/b/c3", "pt")];
ok(resolveLocale(variants, "pt-BR").find((c) => c.uid === "a/b/c1").locale === "pt-BR", "exact locale wins");
ok(resolveLocale(variants, "pt-BR").find((c) => c.uid === "a/b/c2").locale === "en", "untranslated cards fall back to en, card by card");
ok(resolveLocale(variants, "pt-BR").find((c) => c.uid === "a/b/c3").locale === "pt", "same base language beats the en fallback");
ok(resolveLocale(variants, "es").find((c) => c.uid === "a/b/c3").locale === "pt", "a card that exists in NO requested/fallback locale is still served, labelled");
ok(resolveLocale(variants, "pt-BR").length === 3, "one card per uid");
ok(JSON.stringify(resolveLocale(variants, "en").map((c) => c.uid)) === JSON.stringify(resolveLocale(variants, "pt-BR").map((c) => c.uid)), "switching locale never reshuffles serve order");

// The reason resolution keys on uid: item ids repeat across tracks.
const collide = [mk("v1/t1/q-m00-1", "en"), mk("v2/t2/q-m00-1", "en")];
ok(resolveLocale(collide, "en").length === 2, "identical item ids in different tracks are two distinct cards");

ok(parseTypeFilter("quiz,flashcard").size === 2, "type filter parses a list");
ok(parseTypeFilter("quiz,nope").size === 1, "an unknown type in the filter is dropped, not a 400");
ok(parseTypeFilter("") === null && parseTypeFilter(undefined) === null, "no filter means all types");
ok(parseTypeFilter("nope").size === 0, "a filter of only-unknown types matches nothing (honest empty, not everything)");

// ── collection over the whole index ────────────────────────────────────
console.log("collection");
const all = collectCards(idx);
ok(all.count > 800, `whole catalog projects ${all.count} cards (uid-keyed — id-keyed would collapse to ~864)`);
ok(new Set(all.cards.map((c) => c.uid)).size === all.count, "every uid in a response is unique");
ok(all.invalidCards === 0, "the shipped content yields no invalid cards");
const oneTrack = collectCards(idx, { vendorId: "anthropic", trackId: "cca-f" });
ok(oneTrack.count < all.count && oneTrack.cards.every((c) => c.scope.trackId === "cca-f"), "track narrowing");
const oneDomain = collectCards(idx, { vendorId: "anthropic", trackId: "cca-f", domainId: "d3-agent-ops-claude-code" });
ok(oneDomain.count === mapped.cards.length, "domain narrowing matches the direct projection");
ok(collectCards(idx, { types: new Set(["flashcard"]) }).count === 0, "no flashcards ship yet — the filter says so honestly");
ok(collectCards(idx, { types: new Set(["quiz"]) }).count === all.count, "everything shipping today is a quiz card");
ok(all.hash !== oneTrack.hash, "the ETag basis varies with scope");
ok(collectCards(idx, { locale: "pt-BR" }).hash !== all.hash, "and with locale");

// an approved draft changes the cards (LA-1 AC3) — same overlay, no republish
const draftDoc = { ...D3, questions: D3.questions.slice(0, 1), lessons: [] };
const canonical = JSON.stringify(draftDoc);
const overridden = collectCards(idx, {
  vendorId: "anthropic", trackId: "cca-f", domainId: "d3-agent-ops-claude-code",
  getOverride: (kind, v, t, d) =>
    kind === "domain" && d === "d3-agent-ops-claude-code"
      ? { canonical, sha256: createHash("sha256").update(canonical).digest("hex") }
      : null,
});
ok(overridden.count === 1, "an approved draft's document is what the cards are built from");
ok(overridden.hash !== oneDomain.hash, "and the ETag moves with it");

// media resolution — a bound slot fills the url; an unbound one still serves
const mediaDoc = {
  ...D3,
  cards: [
    { id: "mv-d3-1", type: "minivideo", payload: { title: "Memory in 30s" }, media: { slotId: "mv-d3-1" }, source: {} },
    { id: "ig-d3-1", type: "infographic", payload: { title: "Precedence" }, media: { slotId: "ig-d3-1" }, source: {} },
  ],
};
const mCanonical = JSON.stringify(mediaDoc);
const withMedia = collectCards(idx, {
  vendorId: "anthropic", trackId: "cca-f", domainId: "d3-agent-ops-claude-code",
  types: new Set(["minivideo", "infographic"]),
  getOverride: (kind, v, t, d) =>
    kind === "domain" && d === "d3-agent-ops-claude-code"
      ? { canonical: mCanonical, sha256: createHash("sha256").update(mCanonical).digest("hex") }
      : null,
  getBindings: (v, t) =>
    v === "anthropic" && t === "cca-f"
      ? { version: "abc123", bySlot: new Map([["mv-d3-1:video", { url: "https://cdn.example/mv.mp4", contentType: "video/mp4" }]]) }
      : null,
});
const mv = withMedia.cards.find((c) => c.id === "mv-d3-1");
const ig = withMedia.cards.find((c) => c.id === "ig-d3-1");
ok(mv.media.url === "https://cdn.example/mv.mp4" && mv.media.kind === "video", "a bound minivideo slot resolves to its CDN url");
ok(ig.media.url === undefined && ig.media.slotId === "ig-d3-1", "an unbound infographic still serves its slot (LA-9 binds the pixels)");

// ── HTTP contract ──────────────────────────────────────────────────────
console.log("GET /api/catalog/cards");
const app = express();
app.use("/api/catalog", createCatalogRouter(idx));
const server = createServer(app);
await new Promise((r) => server.listen(0, r));
const baseUrl = `http://127.0.0.1:${server.address().port}/api/catalog`;
const get = async (path, headers = {}) => {
  const res = await fetch(baseUrl + path, { headers });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
};

const r1 = await get("/cards?vendor=anthropic&track=cca-f");
ok(r1.status === 200 && r1.body.version === 1, "200 + versioned envelope");
ok(r1.body.count === r1.body.cards.length && r1.body.count === oneTrack.count, "count matches the payload and the pure collector");
ok(r1.body.locale === "en", "default locale reported back");
ok(r1.headers.get("x-content-version") === idx.contentVersion, "X-Content-Version rides cards like every other scope");
ok(r1.headers.get("cache-control") === "public, max-age=300", "same cache posture as the rest of the catalog");
ok(r1.headers.get("access-control-allow-origin") === "*", "public CORS");

const etag = r1.headers.get("etag");
const r304 = await get("/cards?vendor=anthropic&track=cca-f", { "If-None-Match": etag });
ok(r304.status === 304, "ETag revalidation → 304");
const rWiderScope = await get("/cards");
ok(rWiderScope.headers.get("etag") !== etag, "a wider scope gets a different ETag");
// anthropic ships exactly one track, so ?vendor=anthropic and
// ?vendor=anthropic&track=cca-f are built from an identical document set —
// an ETag is a statement about bytes, so they SHOULD match.
const rSameContent = await get("/cards?vendor=anthropic");
ok(rSameContent.headers.get("etag") === etag, "two scopes resolving to identical documents share an ETag");

const rType = await get("/cards?vendor=anthropic&track=cca-f&type=quiz");
ok(rType.body.count === r1.body.count, "type=quiz is everything today");
const rNone = await get("/cards?vendor=anthropic&track=cca-f&type=flashcard");
ok(rNone.status === 200 && rNone.body.count === 0, "a type with no content is an empty 200, not a 404");
const rUnknownType = await get("/cards?vendor=anthropic&track=cca-f&type=hologram");
ok(rUnknownType.status === 200 && rUnknownType.body.count === 0, "a type this deploy doesn't know is a clean empty, never a 400 (FR-1 both ways)");

const rDomain = await get("/cards?vendor=anthropic&track=cca-f&domain=d3-agent-ops-claude-code");
ok(rDomain.body.count === mapped.cards.length, "domain filter over HTTP");
const rBadDomain = await get("/cards?domain=d3-agent-ops-claude-code");
ok(rBadDomain.status === 400 && rBadDomain.body.error === "domain_needs_vendor_and_track", "a domain id is only unique inside its track — say so");

const rLocale = await get("/cards?vendor=anthropic&track=cca-f&locale=pt-BR");
ok(rLocale.body.locale === "pt-BR" && rLocale.body.count === r1.body.count, "an untranslated track serves its en cards under a pt-BR request (FR-6)");
const rJunkLocale = await get("/cards?vendor=anthropic&track=cca-f&locale=klingon!");
ok(rJunkLocale.body.locale === "en", "an unusable locale falls back to en rather than 400ing a content read");

const sample = r1.body.cards[0];
ok(["uid", "id", "type", "scope", "conceptKeys", "locale", "payload", "source"].every((k) => k in sample), "the wire card carries the full contract");
const domainBody = (await get("/anthropic/cca-f/d3-agent-ops-claude-code")).body;
ok(JSON.stringify(domainBody) === JSON.stringify(D3), "the domain endpoint still serves its document byte-identically — cards add a view, they change nothing");

const rMissingTrack = await get("/cards?vendor=anthropic&track=does-not-exist");
ok(rMissingTrack.status === 200 && rMissingTrack.body.count === 0, "an unknown track is an empty feed, not a 404 (a feed asks, it doesn't assert)");

server.close();
rmSync(scratch, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
