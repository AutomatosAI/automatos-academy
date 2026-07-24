# PRD-WAVE-LIVING-ACADEMY — the feed that knows you, content that stays alive

**Status:** DRAFT 2026-07-24 · phases P0–P4, stories LA-1..LA-14 · decision boxes D-LA1..D-LA8 (§9) await Gerard
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

**LA-1 · Card-type registry in the catalog contract** `[academy]`
As the platform, I serve typed cards so any client can render a mixed feed.
- [ ] Schema: `card{id, type, conceptKeys[], locale (default "en"), payload, media?{slotId}, source{lessonRef, chunkRef?}}`; types this wave: `quiz` `flashcard` `infographic` `minivideo` `explainback` `changelog`
- [ ] Existing questions/knowledge-checks exposed as `quiz` cards via a pure mapping (no content duplication; validator extended)
- [ ] Cards flow through the #65 overlay exactly like other course text (an approved draft can add/replace cards)
- [ ] Contract documented in FRONTEND_BRIEF style; node tests cover mapping + validator; CI green

**LA-2 · Concept keys + Spine rollups** `[academy]`
As the scheduler, I need topic-level state, not just item-level.
- [ ] Concept key = `vendor/track/domain[/lessonRef]` (what corpus tags + `sourceRef` already give us — finer KG-extracted concepts are D-LA3, later)
- [ ] Spine derives `user_concept_state` rollups (mastery, due pressure, lapse count) from existing sync events — **rows keyed to shared concept ids; explicitly not per-user graph blobs**
- [ ] Exposed in `/api/me/state` (additive field); aggregate-only remains the platform boundary
- [ ] Migration follows the repo ESM trap rule (`export async function up/down`); spine CI job green

**LA-3 · Binary review grade event** `[app]` `[academy]`
As a learner, I grade cards with one thumb: Got it / Missed it.
- [ ] `card_review` sync event (cardId, conceptKeys, grade: got|missed, msOnCard, skipped) posted via existing `/api/sync/*`
- [ ] SM-2 engine consumes binary grades (map to its quality scale; engine untouched otherwise); unit tests on the mapping
- [ ] Vitest green in CI

### P2 — Feed v1 on CCA-F (user zero = Gerard)

**LA-4 · Composer: extend the 4-bucket selector to mixed types** `[app]`
As a learner, my daily session has a rhythm, not a shuffle.
- [ ] Session template: hook (infographic/changelog when available) → concept (video/flashcard) → check (2–3 quiz/flashcard) → apply (quiz) → recap; degrades gracefully when a slot has no cards (today: quiz + video only — that's fine, the rhythm fills as the factory drips)
- [ ] Review-due cards (SM-2) take priority within the template; mastered concepts still resurface at long intervals (never fully retire — "not always bad to be reminded")
- [ ] Unknown card types are skipped without error (forward compatibility — old app builds survive new content)
- [ ] Selector stays on-device pure TS with tests; MT-12's Today surface consumes it unchanged

**LA-5 · Card components: flashcard flip + registry renderer** `[app]`
- [ ] Renderer registry maps `card.type → component`; `flashcard` (flip, binary grade), `quiz` (existing, rewired to registry), `minivideo`/`infographic` (media card via existing CDN player/image paths), `changelog` (text card)
- [ ] All components RTL-safe from birth: logical properties / `I18nManager`-aware layout (§7 — this is the cheap-now-expensive-later item)
- [ ] Instrumentation: grade/skip/time per card via existing metrics module (PILOT-METRICS.md extended)
- [ ] Vitest green; Gerard verifies on device via Expo

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

**LA-8 · Batch review ergonomics** `[academy]`
As the approver, I judge fifty cards in minutes, not an evening.
- [ ] Admin Content tab: batch view (approve-all / reject-selected with a reason tag), card-level diff against cited chunk, keyboard flow
- [ ] Reject reasons are structured (wrong-fact / bad-pedagogy / style / duplicate) — they become the factory's calibration signal and the graduation evidence
- [ ] Node tests + deployed-site verification

**LA-9 · Renderer #1: infographics via the social template system** `[academy CI]` `[Automatos-AI-Platform templates]`
- [ ] Port/reuse the social HTML-template renderer (carousel/stats-grid templates, headless render — already brand-correct) as a CI job: verified JSON payload → portrait PNG → S3 via the `deploy-media` pattern
- [ ] New `media_bindings` slot types: `ig-<domain>-<n>` (infographic), reserving `mv-*` (mini-video) and noting audio is voice-pipeline-owned; slot vocabulary documented next to the existing `v-*` convention
- [ ] Payloads travel Lane 1 (drafts, approved) *before* rendering — verification happens before pixels exist
- [ ] First 3 CCA-F infographic cards live in the pilot feed

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

**LA-12 · Quality flywheel v1** `[academy]` `[revision playbook cross-pod]`
- [ ] Nightly per-item aggregates from sync events: attempts, correct %, skip rate, median msOnCard, naive discrimination (mock-passers vs not)
- [ ] Threshold flags (≥98% correct = too easy; ≤30% + concentrated wrong answer = ambiguous; skip ≥ 40% = dead card) → revision playbook drafts a fix **with the stats attached as evidence** → drafts queue
- [ ] Flagged-item report visible in admin (even before the playbook exists, the report alone has value)

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

| # | Decision | Recommendation |
|---|---|---|
| D-LA1 | T1 graduation thresholds (§6) | ≤5% reject over 4 batches, zero wrong-fact |
| D-LA2 | SM-2 → FSRS upgrade | **Keep SM-2 this wave** (built, tested); revisit only if pilot shows retention-scheduling pain |
| D-LA3 | Concept granularity | Start `track/domain[/lesson]` from existing tags; KG-extracted fine concepts as a later enrichment playbook |
| D-LA4 | Drip volume | 20–30 cards/week during P3 (sized to your review time, not factory capacity) |
| D-LA5 | Explain-back affects readiness? | **Advisory-only** this wave; consider counting after grader precision is trusted |
| D-LA6 | Changelog card transport | Ride PRD-WIRE's seam if Wire ships first; else a plain `changelog` card from the drafts queue |
| D-LA7 | Mini-video tooling | Remotion (React-native fit; licence fine at current team size — flag if the team grows past 3) vs Motion Canvas (fully open) vs ffmpeg-composited slides (poor-man's, zero licence) |
| D-LA8 | Monthly spend ceiling for factory + watchers + renderers | Set a number; the flywheel report includes actual spend against it |

## 10. Open questions

- Server-side session composer (push payload "your 7-min session is ready" needs the server to know the session): deferred — MT-12 owns nudges; revisit when notifications want card-level content.
- Percentile/compare surfaces (PRD-COMMUNITY S2) consuming `user_concept_state`: natural later join, volume-gated there.
- First localization target (pt-BR vs es) and whether AIX (widest audience, simplest prose) is the pilot localization track: belongs to PRD-LOCALIZATION.
- NotebookLM per-language video regeneration quotas at 8 tracks × N languages: needs a pacing plan when localization starts.
