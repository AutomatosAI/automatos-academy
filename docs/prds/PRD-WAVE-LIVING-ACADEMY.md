# PRD-WAVE-LIVING-ACADEMY — the feed that knows you, content that stays alive

**Status:** 2026-07-25 · **P1 BUILT** (LA-1/LA-2/LA-3) · **P2 BUILT** (LA-4, LA-5 — LA-6 pilot needs Gerard's device) · **P3 half** (LA-8, LA-9 built; LA-7 — the factory itself — blocked, §11) · **P4 started** (LA-12 built with two gaps) · **D-LA1..D-LA9 all decided** (§9)
**Not built:** LA-6 (device), LA-7 (blocked), LA-10, LA-11, LA-13, LA-14. **Nothing in this wave is observable in production yet** — see §11.
**Owner:** Academy (Gerard approves all factory output in P3; autonomy is earned per §6)
**Repos:** `automatos-academy` (contracts, factory seams, renderers' CI) + `automatos-academy-app` (card registry, feed, new card types) + `automatos-ai` (playbooks/missions — **flagged cross-pod, not built from this pod**)
**Grounding:** repo state @ `db77445` (post-#66); the [Content & Data Plane flow map](https://claude.ai/code/artifact/b58e5d29-07e7-42ba-a16a-b49a93df343c) (verified 2026-07-24: SPINE lit, `content_drafts` live, 66 videos + GAIL podcast on CDN)
**North star (Gerard's frame):** *"The plan makes Academy richer; the five loops make it alive. Content everyone will eventually have. A feed that knows you, a tutor that coaches you, content that provably stays current — that's the standout."* Engine first: *"get the engine running smooth and slowly add the factory production. I approve and gauge quality… once running we start to allow more auto approvals."*

---

## 1. Overview

The mobile app today is a competent Q&A feed: SM-2 spaced repetition, competence/decay models, a 4-bucket selector, streaks and readiness gates already live as tested pure-TS engines (`automatos-academy-app/src/engine`, built per PRD-MT-03; Engagement + Delight waves shipped the surfaces). The academy backend has a full content plane: one read contract (`/api/catalog/*`), a drafts→approve→overlay write-back (#65), a media plane with slot bindings (#49–#52), and the tutor corpus synced per-course into the Automatos KG (#53).

What's missing is what makes it *alive* rather than *rich*:

1. **Card diversity with a brain** — the feed serves one card shape (Q&A). There is no registry for mixed card types (flashcard, infographic, mini-video, explain-back, changelog), and the SM-2 state is keyed per item with no concept rollup, so the scheduler can't reason about *topics*.
2. **A factory** — no production pipeline fills the feed. The drafts seam exists but nothing drafts into it on a cadence, and there is no approval-throughput design for when something does.
3. **The five loops** — memory (partially built), personal coach context, explain-it-back, visible freshness, and the quality flywheel are not wired.

**This is an extension wave, not a rebuild** (CLAUDE.md §3 framing, same discipline as PRD-VOICE-PIPELINE): the SM-2 engine, the drafts seam, the media plane, the voice pipeline, and the corpus sync are all reused as-is. Net-new is confined to: the card-type registry, concept keys + rollups, four new card types, the factory playbooks + approval ladder, two renderers, and item-stats aggregation.

### Relationship to sibling PRDs (reference, don't duplicate)

| Sibling | What it owns | What this wave does with it |
|---|---|---|
| [PRD-MT-12](./PRD-MOBILE-TUTOR/build/PRD-MT-12-daily-loop.md) | Today mission, streaks, nudges, widget | The composer (LA-4) feeds richer cards into MT-12's existing loop — no new nudge mechanics here |
| [PRD-VOICE-PIPELINE](./PRD-VOICE-PIPELINE.md) | content-addressed TTS (Kokoro, D-A4 decided) | Factory text output becomes listenable **automatically** (content-addressed = idempotent); zero new audio work in this wave |
| [PRD-OPS-FRESHNESS](./PRD-OPS-FRESHNESS.md) | `verification{}` chip, quarterly runbook, cert-watch | LA-11 activates it as product surface + feed card; cert-watch mission is the CONTENT-LIFECYCLE platform half |
| [PRD-CONTENT-LIFECYCLE](./PRD-CONTENT-LIFECYCLE.md) | drafts write-back + overlay (built); daily mission (cross-pod) | The factory (LA-7..LA-9) IS that daily mission, made concrete with formats + the approval ladder |
| [PRD-COMMUNITY](./PRD-COMMUNITY.md) | share cards → percentiles → Discord | LA-13 (topic voting) is demand capture, deliberately *not* a social surface; honesty rules inherited verbatim |
| [PRD-WIRE](./PRD-WIRE.md) | agent-written daily news surface | The "what changed" changelog card (LA-11) can ride Wire's ingest seam if Wire ships first (D-LA6) |

**Superseded invariant, stated explicitly:** the Engagement-wave rule "course content is git-canonical; no runtime path mutates it" (2026-07-16) is superseded by CONTENT-LIFECYCLE (#65) + the pending `CONTENT_SOURCE=db` flip: approved drafts now legitimately change served content at runtime, behind the human gate.

## 2. Goals

- One card contract that lets new content *types* ship without an app release (new *renderers* still need one — forward-compatible skipping makes that safe).
- Concept-aware scheduling: the feed can say "D3 retrieval-filtering is weak" and act on it, across card types.
- A factory drip running end-to-end on CCA-F: playbook → draft → Gerard approves → overlay → catalog → feed, at 20–30 cards/week, with reject-rate measured from day one.
- An approval ladder with explicit graduation criteria, so autonomy is earned per playbook×format, never assumed.
- Freshness visible in-product; item-quality stats flowing back into revision drafts.
- Every P1 contract carries a locale dimension so multi-language later is a content project, not a schema migration (§7).

**Non-goals (this wave):** forums/discussion; leaderboards or any new gamification beyond what MT-12 shipped; replacing SM-2 with FSRS (D-LA2 records the option); per-user graph.json blobs (learner state is rows keyed to shared concepts — decided 2026-07-24); voice explain-back (text first); building translated content (contracts only); NotebookLM for structured payloads (it keeps long-form video/podcast); any auto-approval before P4 graduation criteria are met.

## 3. The architecture rule the whole wave obeys

**Agents write verified payloads; renderers write pixels; nothing else touches the apps.**

- Structured payloads (flashcards, quiz items, explain-back rubrics, changelog entries) travel **Lane 1**: playbook → `POST /api/admin/content` → `content_drafts` → Gerard approves in `#/admin` → serve-time overlay → `/api/catalog`.
- Rendered media (infographics, mini-videos, narration) travel **Lane 2**: CI renderer → S3 (`deploy-media` pattern) → `media_bindings` slot → overlay → `/api/catalog`. Agents have **no** media write path (the flow map's dash), by design.
- Narration is Lane 2 with zero marginal work: the voice pipeline hashes published text and fills only missing files.

## 4. Phases and stories

Slices are test-first; **CI is the only gate** (nothing runs on Gerard's machine). App stories verify via vitest in CI + Gerard on device (Expo); academy stories via node tests in CI + the deployed site.

### P0 — Activation (owner, ~15 min; tracked in STATUS.md, listed for sequence only)

- `ACADEMY_ADMIN_CLERK_IDS` — without it the drafts approve queue (the factory's human gate) is behind the "Not authorized" wall.
- `CONTENT_SOURCE=db` when the 7-day dual-run closes — a daily factory must ship without redeploys.
- Voice pod URL + media env (unblocks PRD-VOICE-PIPELINE, which this wave leans on for audio).

### P1 — Contracts (no new content, no new UI)

**LA-1 · Card-type registry in the catalog contract** `[academy]` — ✅ **BUILT**
As the platform, I serve typed cards so any client can render a mixed feed.
- [x] Schema: `card{uid, id, type, scope{}, conceptKeys[], locale (default "en"), payload, media?{slotId}, source{lessonRef, chunkRef, refs[]}}`; all six types registered (`server/cards/types.js`)
- [x] Existing questions/knowledge-checks exposed as `quiz` cards via a pure projection — 1 691 cards, zero content duplication (`server/cards/map.js`); validator extended
- [x] Cards flow through the #65 overlay exactly like other course text; an approved draft adds/replaces cards, and an authored `cards[]` replaces a derived card in place
- [x] `GET /api/catalog/cards` + [CARD-CONTRACT.md](./PRD-MOBILE-TUTOR/build/CARD-CONTRACT.md); 113 assertions in `tests/cards.test.mjs`

**LA-2 · Concept keys + Spine rollups** `[academy]` — ✅ **BUILT**
As the scheduler, I need topic-level state, not just item-level.
- [x] Concept key = `vendor/track/domain[/lessonRef]`, language-neutral (`server/concepts/keys.js`); membership derived from the served index (`server/concepts/membership.js`)
- [x] Spine derives `user_concept_state` (mastery, coverage, accuracy, itemsSeen/Total, due pressure, next-due, lapses) in the SAME transaction as the progress upsert — **rows keyed to shared concept ids**, no per-user blobs
- [x] Additive `conceptState[]` on `/api/me/state` AND on the progress ack; rides export + the one canonical wipe; aggregate-only stays the boundary
- [x] Migration `1784830000000_user-concept-state.js` uses `export async function up/down`; the rollup math is proven ≡ the pinned domain math

**LA-3 · Binary review grade event** `[app]` `[academy]` — ✅ **BUILT**
As a learner, I grade cards with one thumb: Got it / Missed it.
- [x] `card_review` telemetry event (cardId, cardType, grade: got|missed, msOnCard, skipped, surface) via existing `/api/sync/telemetry`; `grade` enforced as a closed set at the boundary. **`conceptKeys[]` is NOT on the wire** — the server derives them (§9 build note 2)
- [x] SM-2 consumes binary grades unchanged: got → `correct: true`. A SKIPPED card sends telemetry only and never moves SM-2 state
- [x] `gradeToCorrect` mapping + `cardReview` outcome on the app's one write path; vitest green

### P2 — Feed v1 on CCA-F (user zero = Gerard)

**LA-4 · Composer: extend the 4-bucket selector to mixed types** `[app]` — ✅ **BUILT** (app #43)
As a learner, my daily session has a rhythm, not a shuffle.
- [x] Session template (`src/feed/template.ts`): hook → concept → check, with the **recap beat deliberately left to `loop.ts`**, which already inserts it — the template does not duplicate a beat that exists
- [x] Degradation is slot-by-slot and silent: no hook available → the session opens on the concept, no error, no gap
- [x] Review-due cards take priority *inside* the check beat (`roleOf` routes a `due` fact to check, everything else to hook)
- [x] Unknown card types are skipped without error (forward compatibility — old app builds survive new content)
- [x] Selector stays on-device pure TS with tests; MT-12's Today surface consumes it unchanged

**LA-5 · Card components: flashcard flip + registry renderer** `[app]` — ✅ **BUILT** (app #42)
- [x] Renderer registry (`src/feed/registry.tsx` + pure `registryCore.ts`) maps kind → renderer; `flashcard` (flip, binary grade) new, `quiz` rewired, `minivideo` via the existing CDN clip player, `changelog` as a text card. **Coverage is compile-enforced**, not tested-and-hoped
- [x] Unknown kinds render NOTHING (FR-1). The chain this replaced ended in a bare `else` that rendered the SUMMARY card — an unrecognised kind would have shown a learner their session summary mid-session
- [x] RTL from birth: pure `rtl.ts` (takes `rtl` as an argument, so both directions are actually tested) + `rtlRuntime.ts` as the only `I18nManager` touchpoint
- [x] **Dev card gallery** (`app/dev/cards.tsx`) draws PRODUCTION `/api/catalog/cards` through the adapter + registry — the first surface where P1 is visible end to end on a device
- [ ] Instrumentation: grade/skip/time already rides `card_review` from LA-3; PILOT-METRICS.md not yet extended
- [x] Vitest 1076 green, tsc + eslint clean · ⏳ Gerard verifies on device via Expo (Settings → Dev · cards)

**Deferred out of LA-5, deliberately:** `infographic` and `explainback` renderers (LA-9 / LA-10 own them; the adapter drops both today), and mixing typed cards into real sessions — that is LA-4's composer, so flashcards currently appear in the gallery only.

**LA-6 · Pilot: two weeks, CCA-F, user zero** `[both]`
- [ ] CCA-F's 124 questions + live videos flow through the registry into daily sessions
- [ ] Pilot metrics captured (sessions/week, cards/session, skip rate by type, grade distribution) — this is the "engine running smooth" evidence gate for P3
- [ ] Exit review with Gerard: proceed / adjust template / adjust volume

### P3 — Factory drip (one format, one track, full human gate)

**LA-7 · Flashcard playbook** `[automatos-ai — cross-pod]` `[academy seam ready]`
As the factory, I draft grounded flashcards; every card cites or dies.
- [ ] Playbook: drafter (per CCA-F domain, N cards with conceptKeys + sourceRef) → **fact-checker must cite the KB chunk supporting each card or the card is dropped** → curator (dedupe across track, difficulty balance) → `POST /api/admin/content` as a draft batch
- [ ] Batch size 20–30/week (D-LA4); every batch carries provenance metadata (playbook version, model, corpus snapshot date)
- [ ] Gerard reviews in the existing `#/admin` Content tab; **reject rate per batch is recorded** — this number drives §6
- [ ] Cross-pod build flagged to the automatos-ai session; academy accepts the payloads with zero new endpoints

**LA-8 · Batch review ergonomics** `[academy]` — ✅ **BUILT** (#73)
As the approver, I judge fifty cards in minutes, not an evening.
- [x] Batch view with approve-all, batch rollup counts, and provenance surfaced per batch (`migrations/…draft-batches-and-reject-reasons.js`, `server/content/routes.js`, `public/js/views/admin-content.js`)
- [x] Reject reasons are a **closed set** (wrong-fact / bad-pedagogy / style / duplicate), required on a verdict — a free-text reason is refused, because a reason that cannot be counted cannot calibrate anything
- [x] Reject rate computed over **DECIDED** cards, never the whole batch: one card in with that one rejected is 100%, not 4%, and §6 graduates playbooks on this number
- [x] Approve-all replays same-scope drafts in write order, so the newest wins the scope exactly as approving them one at a time would
- [x] Node tests green
- [ ] **Card-level diff against the cited chunk — NOT built.** The approver sees the card, not the evidence it claims. This is the bullet that makes cite-or-die checkable by a human, and LA-7's whole quality argument leans on it
- [ ] **Keyboard flow — NOT built.** Mouse-only review of a 25-card batch is the difference between the <10 min §8 target and an evening
- [ ] Deployed-site verification blocked: `ACADEMY_ADMIN_CLERK_IDS` unset (§11)

**LA-9 · Renderer #1: infographics via the social template system** `[academy CI]` `[Automatos-AI-Platform templates]` — ✅ **BUILT** (#74, hardened #76)
- [x] Ported the social renderer's harness as a CI job: verified JSON payload → 1080×1350 portrait PNG → S3 via the `deploy-media` pattern. Default run needs **no secrets and publishes nothing** — it uploads the PNGs as an artifact, because the first question about a renderer is "does it look right?" and answering it should not require credentials
- [x] `ig-<domain>-<n>` slots; `mv-*` reserved; audio stays voice-pipeline-owned
- [x] Payloads travel Lane 1 before rendering — a card that cannot be drawn correctly is a rejected payload, never a clipped render
- [x] **Eyeball gate passed (D-LA7), and it found two real defects** (#76): a dense card pushed the footer — the attribution — off the frame; and every sparse card wasted ~40% of itself, because the frame is sized for five points while the limits allow two. Both fixed. A `d3-1` fixture at the payload limits was added, since every existing sample was sparse and nothing in the repo could exercise the dense case
- [x] **A set renders at one type size.** Each card measures the largest type it could hold; the renderer imposes the smallest across the batch. A card is one slide of a drip or one frame of an LA-14 video, and type that changes size between slides reads as a mistake, not as fit. **LA-14 inherits this contract**
- [ ] First 3 CCA-F infographic cards live in the pilot feed — **not done**: needs an approved Lane-1 payload, which needs the approve queue, which needs §11

### P4 — Widen and earn autonomy

**LA-10 · Explain-it-back (text)** `[app]` `[automatos-ai grader — cross-pod]`
- [ ] `explainback` card: "Explain X in your own words" (typed, 60–90s); grader playbook scores against the concept's KG subgraph → covered / missed / misconceived
- [ ] Missed → concept scheduled for review; misconceived → the contrast card queued; result shown to the learner with the *why*
- [ ] **Advisory-only**: does not move readiness/A+ math this wave (D-LA5)
- [ ] Spoken version explicitly deferred to a VOICE follow-up

**LA-11 · Freshness as product surface** `[academy]` `[cert-watch cross-pod]`
- [ ] `verification{}` chip rendered per OPS-FRESHNESS §2 (track home + exam surfaces), with a tappable `content_changelog` (date, track, what changed, what we did — **no-change checks logged too**)
- [ ] Cert-watch scheduled mission (the CONTENT-LIFECYCLE platform half): fetch-and-diff official blueprint pages weekly; LLM summarizes only on real change; files changelog entry + revision draft
- [ ] `changelog` feed card ships the week's entry (via Wire's seam if Wire is live — D-LA6)

**LA-12 · Quality flywheel v1** `[academy]` `[revision playbook cross-pod]` — ✅ **BUILT** (#75), with two gaps stated below
- [x] Per-item aggregates from sync events: attempts, correct %, skip rate, median msOnCard, naive discrimination (`server/content/item-stats.js`)
- [x] Discrimination returns **null, not zero**, when either group is too small — zero is a real and damning value here (the item separates nobody), so returning it for "we don't know yet" would manufacture the worst finding out of missing data
- [x] Flags with evidence attached: `too-easy` (≥98%), `dead` (skip ≥40%), `backwards` (passers do worse than non-passers), each gated behind `minAttempts: 20`
- [ ] **`ambiguous` is built but can never fire.** It needs the dominant wrong answer, and `card_review` deliberately carries no `chosenOptionId` — so `topWrongCount` is hardcoded `null` (`routes.js:362`). The rule is written, tested, and dormant pending a wire-contract decision (§10). It is the flag that catches a *bad question*, as opposed to a hard or ignored one
- [ ] **Aggregates are on-demand, not nightly.** Computed per request. Fine at this volume; the trigger to materialise is the query getting slow, which is measurable rather than a feeling
- [ ] **No admin UI.** The report is an API route with evidence attached, not a surface. The PRD promised "visible in admin" and that is not what shipped
- [ ] Revision playbook (cross-pod) not started

**LA-13 · Topic voting (thin)** `[academy]`
- [ ] "Suggest a topic / vote" on track + coming-soon surfaces, reusing the notify-me demand-capture muscle; counts visible to admin only (real-numbers honesty rule — no fake social proof)
- [ ] Explicitly not a discussion surface; PRD-COMMUNITY owns anything social

**LA-14 · Renderer #2: mini-videos** `[academy CI]` — gated on D-LA7 (tooling)
- [ ] 20–40s vertical concept videos from card payloads: template (hook line, animated points, brand colours) + voice-pipeline narration + timed captions
- [ ] Same Lane 2 path as infographics; `mv-*` slots; first 2 CCA-F minivideo cards in the feed

## 5. Functional requirements

- FR-1: The catalog serves typed cards (LA-1 schema); unknown types must be skippable by clients without error.
- FR-2: Every factory-produced card carries `source{lessonRef, chunkRef}`; the app renders a tap-through citation ("source: lesson X").
- FR-3: All learner scheduling state is server-derivable from raw sync events (device cache remains a mirror, never the record).
- FR-4: Approved drafts are the **only** runtime path by which content changes; every approval/rejection is audit-logged with actor + reason.
- FR-5: Renderers are deterministic: same payload → same output; they run only in CI, credentialed via existing `AWS_SDK_DEPLOY_*` / `X-Admin-Key` machine paths.
- FR-6: All new content documents, cards, and media bindings carry `locale` (default `"en"`); readers resolve requested locale → `en` fallback.
- FR-7: Reject-rate and item-quality metrics are queryable per playbook×format×batch — the data autonomy decisions are made from.

## 6. The approval ladder (Gerard's operating model, made explicit)

| Tier | Who approves | Entry criteria |
|---|---|---|
| T0 Manual | Gerard, every item (batch UX from LA-8) | Default for every new playbook×format |
| T1 Sampled | Gerard reviews a random ≥20% sample; rest auto-approve on a 48h delay | ≤5% reject rate over 4 consecutive batches **and** zero `wrong-fact` rejects in those batches (thresholds = D-LA1) |
| T2 Spot-audit | Auto-approve; weekly random audit | ≥4 weeks at T1 with sustained criteria; **never** for net-new lesson prose |
| Demotion | — | Any `wrong-fact` reject → immediate return to T0 for that playbook×format |

Everything auto-approved is tagged as such in the audit log and revertible via the drafts overlay (approve a superseding draft / reject retroactively).

## 7. Multi-language: design decisions binding NOW, build later (Gerard, 2026-07-24: "every new language opens up a new world of customers — pt, es, Indian languages, Middle East")

The localization build is its own future wave (PRD-LOCALIZATION, unwritten). What *this* wave must not get wrong:

1. **Locale is a variant dimension, never a fork.** Content documents key as `(docPath, locale)`; media bindings as `(slotId, locale)`; cards carry `locale`. Resolution: requested locale → `en`. One catalog, no per-language repos/tracks.
2. **Concept ids are language-neutral.** Learner state keys off concept ids, so a learner switching language keeps their mastery. Labels localize; keys never do.
3. **RTL from birth** (LA-5): Arabic is on the target list; components built with logical properties now cost nothing — retrofitting costs a wave.
4. **Voice already solved its half:** `VOICE_KEY` namespaces per PRD-VOICE-PIPELINE (`kokoro-af-v1` → e.g. `kokoro-pt-v1`); Kokoro covers pt/es/hi among others, ElevenLabs multilingual covers Arabic + Indic when the premium tier lands.
5. **Translation is a factory format** — translate → verify-against-English-source (grounding check, same cite-or-die bar) → native-style lint → locale-scoped drafts queue. It's the same engine this wave builds, pointed at a new output dimension. Media re-render from translated payloads via the same renderers; NotebookLM video/audio regenerates per language natively.
6. **Teach in locale, drill exam vocabulary in exam language.** Most target certs examine in English: lessons/coaching localize; exam-critical terms stay bilingual (a glossary card type later). Recorded now as pedagogy principle so translated tracks don't silently break exam readiness.

## 8. Success metrics

- **Engine smooth (P2 gate):** user zero completes ≥5 sessions/week for 2 weeks; median session ≥8 cards; skip rate <25% overall.
- **Factory quality (P3):** reject rate trending down across 4 batches; ≥100 approved flashcards live on CCA-F; time-to-review a 25-card batch <10 min with LA-8.
- **Loops live (P4):** ≥1 playbook×format at T1; freshness chip + ≥4 changelog entries (incl. no-change checks); ≥10 flywheel-flagged items with ≥3 revision drafts approved; explain-back graded ≥20 times with sensible covered/missed output.
- **Cost sanity:** factory + renderers + watchers stay within agreed spend (D-LA8) — measured, not assumed.

## 9. Decision boxes (Gerard)

**D-LA1..D-LA6 DECIDED 2026-07-24** — Gerard took the recommendations as they
stood.

**D-LA7, D-LA8, D-LA9 DECIDED 2026-07-25 on Gerard's behalf**, under his
standing delegation ("I trust you to answer for me based on research"). Each
carries its reasoning so it can be overturned on the reasoning rather than on
authority. D-LA7 is now settled by evidence rather than research — the
renderer was built, run, and looked at (#74/#76).

| # | Decision | Outcome |
|---|---|---|
| D-LA1 | T1 graduation thresholds (§6) | ✅ **≤5% reject over 4 consecutive batches, zero `wrong-fact` rejects** |
| D-LA2 | SM-2 → FSRS upgrade | ✅ **Keep SM-2** (built, tested, and binary grades map onto it unchanged — LA-3 proved it). Revisit only if the pilot shows retention-scheduling pain |
| D-LA3 | Concept granularity | ✅ **`vendor/track/domain[/lesson]` from existing tags.** KG-extracted fine concepts become a FOURTH key segment via a later enrichment playbook, so nothing built on these keys has to move |
| D-LA4 | Drip volume | ✅ **20–30 cards/week during P3**, sized to review time, not factory capacity |
| D-LA5 | Explain-back affects readiness? | ✅ **Advisory-only** this wave; reconsider once grader precision is trusted |
| D-LA6 | Changelog card transport | ✅ **Ride PRD-WIRE's seam if Wire ships first**; else a plain `changelog` card from the drafts queue |
| D-LA7 | Mini-video tooling | ✅ **ffmpeg-composited slides on the LA-9 renderer.** **Remotion is disqualified**, not merely flagged: it is free only to ≤3 people and combined headcount counts in collaborations — a licence tripwire under load-bearing infra is not worth the React ergonomics. **Motion Canvas is disqualified** on FR-5: it still expects a UI button press to render, and renderers must run in CI. The LA-9 harness already produces brand-correct portrait PNGs headlessly, and #76 proved it survives contact with real payloads at both extremes. Upgrade path if motion quality bites is **Revideo** (MIT, headless-native), never Remotion. **LA-14 inherits LA-9's set-fit contract** — one type size across a batch, which is exactly what a video needs so type does not jump between frames |
| D-LA8 | Monthly spend ceiling for factory + watchers + renderers | ✅ **No currency figure — a ratio.** A fixed monthly number was rejected before and would either throttle a working factory or wave through a broken one. The tripwire is **cost per *approved* card**: batch 1 sets the baseline, the first four batches are metered, and the factory pauses on drift. Cost per *approved*, never per *generated* — measured per generated card, slop is cheap and a careful playbook looks expensive, which inverts the signal §6 graduates on |
| D-LA9 | Which track the P3 factory drips into | ✅ **AIX (`automatos/ai-explained`) for the factory; CCA-F stays the LA-6 pilot track.** Gerard's lens is the new user who wants to learn AI, and AIX is the widest door. It is also the best-*grounded* target, which reverses the obvious worry: AIX carries **116 519 characters** of lesson prose against CCA-F's 41 007 (2.8×), and every question in all three tracks already has `sourceRefs`, so cite-or-die has more to bite on, not less. The "AIX needs a corpus sync first" concern was checked and is wrong. **Consequence not yet applied to this doc:** LA-7 and §8 still say CCA-F throughout |

### Build notes that came out of P1 (things the PRD did not anticipate)

1. **`uid` vs `id`.** Item ids are unique only *within* a track — 827 of the
   catalog's 864 ids repeat across tracks (`q-m00-1` exists in several). Cards
   therefore carry both: `id` (the item id, so a grade writes `progress` with
   no translation) and `uid` = `vendorId/trackId/id` (the globally unique
   handle everything else keys on). A whole-catalog pull deduped by `id` would
   have silently discarded half the feed.
2. **`card_review` does not carry `conceptKeys[]`.** The server already holds
   the content index, so it derives an item's concepts itself — the client
   cannot mis-attribute mastery, and the PII-minimized flat-scalar payload rule
   stays intact. An optional singular `conceptKey` remains for a card that
   declares a concept the tree can't derive (the D-LA3 seam).
3. **`scope` is stamped by the server**, never read from a card body — a draft
   cannot lie about which track it belongs to, because the document it arrived
   in already answered that.

### Build notes from P2/P3 (2026-07-25)

4. **A clean merge is not a correct merge.** Merging `main` into the LA-12
   branch auto-resolved two contested lines by taking one side wholesale and
   raised no conflict. It dropped `validateRejection` from an import while the
   call site and the export both remained — every reject-with-reason would
   have 500'd in production — and it replaced `infographic.test.mjs` with
   `item-stats.test.mjs` in the `npm test` line instead of joining them, which
   would have silently removed LA-9's test from CI on main. `merge-base
   --is-ancestor` said the branch was up to date and `merge-tree` reported no
   conflict; both were true and neither helped. **When two branches touch one
   line, read the merged line.** Caught by CI, on the way to being merged.
5. **A fit test must measure the content, not the box.** `scrollHeight` is
   clamped to at least `clientHeight`, so for a list smaller than its box it
   reports the box. `scrollHeight > clientHeight` was therefore false until
   content genuinely overflowed — accidentally correct — but subtracting a
   breathing-room allowance made it true on the first iteration, pinning every
   card to the type floor. **The failure is invisible in the output:** a card
   held at the floor looks exactly like a card with no room to grow, so it
   passed both a render and an eyeball.
6. **A renderer should state its decision, not only draw it.** What caught
   note 5 was the run log printing the chosen type size — a number to check
   against, where there had previously been only a picture to look at. Any
   renderer that picks something at runtime should say what it picked.

## 10. Open questions

**Gerard's to answer — these change what gets built:**

- **Does `card_review` gain `chosenOptionId`?** Without it LA-12's `ambiguous`
  flag can never fire, and `ambiguous` is the one that catches a *bad
  question* rather than a hard or ignored one. The payload is deliberately a
  closed flat-scalar set (`itemId, correct, timeMs, bucket, surface`) for PII
  reasons, and the option index is a genuine widening of it. Two repos change
  if yes. **Recommendation: yes, as an option *index*, never the text** — an
  index is not personal data and is all the rule needs.
- **LA-8's two unbuilt bullets** — diff-against-cited-chunk and keyboard flow.
  Both were scoped into LA-8 and neither shipped. The diff is the one that
  makes cite-or-die checkable by a human instead of taken on trust, which is
  the entire quality argument for letting LA-7 draft at volume.

**Answerable by measurement, not opinion — deliberately left until they bite:**

- Nightly materialisation of item-quality aggregates: on-demand today; the
  trigger to change is the query getting slow.
- Server-side session composer (a push payload "your 7-min session is ready"
  needs the server to know the session): MT-12 owns nudges; revisit when
  notifications want card-level content.

**Owned by another PRD — recorded here so they are not re-litigated:**

- Percentile/compare surfaces (PRD-COMMUNITY S2) consuming `user_concept_state`.
- First localization target (pt-BR vs es), and whether AIX is the pilot
  localization track (PRD-LOCALIZATION).
- NotebookLM per-language video regeneration quotas at 8 tracks × N languages.

## 11. What is actually blocking this wave

Everything in P2/P3 that is built is built and green. **None of it is
observable in production**, and the reasons are not code:

1. **`ACADEMY_ADMIN_CLERK_IDS` is unset on Railway.** The approve queue is
   the factory's human gate, so LA-8 and LA-12 ship invisible and P3 cannot
   start no matter what is merged. This is the single highest-leverage item in
   the wave and it is an env var.
2. **LA-7 is blocked cross-pod.** `automatos-ai` #608 is unmerged, so main's
   required `test` job is red and any PR opened there inherits a CI signal
   that cannot be read. LA-7 is the factory — the entire point of P3.
3. **LA-6 needs Gerard's device.** The pilot is the evidence gate for P3 per
   §8, and nothing runs on his machine by standing rule, so it runs when he
   runs it.

The honest read: **the wave is engine-complete and production-invisible.** The
next real progress is an env var and a merge, not a story.
