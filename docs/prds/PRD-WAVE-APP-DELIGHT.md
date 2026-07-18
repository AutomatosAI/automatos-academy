# PRD-WAVE-APP-DELIGHT — feedback you can see, voices worth hearing, a boot that says TRAIN YOUR AI MIND

**Status:** IN BUILD — P1 + the overnight batch SHIPPED as app PRs **#31–#38** (2026-07-18: nav un-trap+dock · verdict-in-view+type · burger · boot "TRAIN YOUR AI MIND" · mistakes hub · the one haptic · shimmer+dock spring · podcast speed); boxes D-A1…D-A10 still await Gerard (D-A1's stem/caps shipped as direct response to the on-device complaint; the S/M/L text-size setting still awaits the box) · **Owner:** Academy (app-heavy; W4/W5 touch the web publish pipeline; W6 touches the spine)
**Authored:** 2026-07-17, from Gerard's first on-device session (Expo Go, iOS) + a three-agent evidence pass: full app UX audit (file:line), live competitor/voice research ([app-competitor-voice-scan-2026-07-17](../research/app-competitor-voice-scan-2026-07-17.md)), and web-home DNA extraction.
**North star (Gerard's words):** *"The app needs to be cool as fuck."* Specifically: fonts oversized · love the floating dock, wants a burger · scroll-to-bottom Backs and stuck pages · loves podcast, wants voice/video-as-audio · **robot voice is a 100% NO** · questions never say right/wrong/why + wants a post-scroll review · tutor should be a real conversation (paid).
**Prerequisite:** app PR #30 (feed black-screen fix + lockfile) merges first.

---

## 1. The market position this wave buys

The 2026-07-16 scan's verdict stands: content + assessment stack competitive, daily-return stack behind. The new research sharpens it:

- **The real bar is Duolingo-class polish, not any actual competitor** — cert-prep incumbents have no serious mobile apps (Tutorials Dojo web-only; ExamPro none evidenced).
- **Nobody in study/cert has an audio mode.** Blinkist proves the pattern; DuoRadio proves it in-lesson. W4+W5 make the Coach the only cert-prep app you can *listen* to.
- **The AI-voice-tutor lane is empty.** Quizlet killed Q-Chat (June 30, 2025). Only Duolingo ships one (Video Call, behind Max at **$29.99/mo / $168/yr** — the pricing anchor for W6).
- Duolingo's polish is reducible to stealable mechanics: state-driven motion (Rive), **exactly one haptic reward per session** (scarcity by design), celebration chains, missed-question recycle + mistakes hub, streak-milestone animations.

## 2. Ground truth (audited 2026-07-17, main @ app `1317c4f`)

What the complaints actually are, in code:

1. **Feedback exists but is hidden.** `QuestionCard` has the full flow — tap → verdict + explanation + "Explain this" → source refs → Ask-tutor (`src/feed/components/QuestionCard.tsx:137-197`) — but the verdict renders below the fold inside `CardShell`'s ScrollView while a **pinned "Next" appears instantly in the footer** (`CardShell.tsx:47-55`, actions outside the scroll): the UI shows an exit before the answer. Mock is deferred-feedback **by design** (exam realism, `app/mock/[vendor]/[track].tsx:4-5`) and stays that way.
2. **The review data is thrown away.** The session loop records every outcome (`records: CardOutcomeRecord[]`, `src/feed/loop.ts:33,67-77` — `cardId, domainId, kind, correct`), but `buildSummary()` collapses to counts (`src/feed/summary.ts:19-41`) and `SummaryCard` shows only "4/6 correct". A review screen is **plumbing, not new tracking**.
3. **One screen in the app has a top back button** (`app/tutor.tsx:223-230`). Twelve screens are bottom-Back-only (cheat sheet, podcast player, readiness, mock result, all six settings pages, pathfinder…); `onboarding/chooser` + 3 dev screens are true dead ends (gesture-only). Root cause: `headerShown:false` everywhere with nothing replacing the header.
4. **Type runs hot and scales unbounded.** `typeScale` display 40 / h1 34 / stem 27 (`src/theme/typography.ts:38-48`); `ScreenTitle` = 34px on nearly every screen; **no `maxFontSizeMultiplier`** anywhere except mono (1.4) — OS large-text makes 34/40px grow further; no user text-size setting. (Stale comments still say "serif 21" — the stem is 27.)
5. **There is no splash at all.** `app.json` has no `icon`/`splash` keys; `expo-splash-screen` is installed and never imported; fonts load un-awaited (system-font flash, `app/_layout.tsx:65-70`); the gate renders a blank view while deriving stage. Meanwhile the web hero already owns the target: **hero-loop.mp4 (1.43MB, autoplay/muted/loop, poster brain.png)** under the H1 **"TRAIN YOUR AI MIND"** with the coral AI treatment (`home.js:409`, `academy.css:700-710`). `expo-video` is already a dependency with a working precedent (`ClipCard.tsx:25-31`).
6. **The robot voice is device TTS by staging, not by accident.** PRD-VOICE D-V1 staged (a) `expo-speech` now → (c) pre-generated publish-time audio → (b) the `automatos-voice` pod (OpenAI-compatible `POST /v1/audio/speech`, Kokoro; deployment unconfirmed — PRD-VOICE S5). The `TextSpeaker` seam is clean (`src/audio/speaker.ts:23-37`), but consumers are **segment-cursor based** (`useReadAloud.ts:66-96` chains per-segment `onDone`) — so the swap wants per-segment audio files, not one long MP3. Research verdict: **Kokoro-82M is the #1 open-weight voice on TTS Arena** — the robot is ~80% fixable with the pod we already run.
7. **Podcast is loved and honest, with three gaps:** no speed control (`src/podcast/usePlayer.ts` — no setRate), transcripts fixture-only (`manifest.ts:138-145` — every live episode shows "No transcript attached"), and course videos (24 files) have no audio-only lane.
8. **Delight primitives exist, underused:** `Shimmer` defined and never mounted (`src/ui/motion.tsx:162`); **zero haptics** (expo-haptics not installed); TabBar animation = press-scale only; celebrations shipped (4 typographic moments, no confetti — the MT-11 register holds).

## 3. Workstreams

### W1 — The feedback loop (Gerard's #1)

| # | Slice | What / where | DoD | Effort |
|---|---|---|---|---|
| W1-S1 | **Verdict in view** | On submit: auto-scroll the CardShell ScrollView to the verdict block; option rows get loud fill states (good/bad soft fills, not border-only — `src/feed/optionState.ts`); pinned "Next" appears ~600ms after the verdict lands (never before it) | Tap an answer on an iPhone SE viewport → verdict + explanation visible with zero user scrolling; reduced-motion = instant jump; vitest on the state sequence | S |
| W1-S2 | **Type compaction + scaling caps** | `QuestionStem` 27→22 (`typeScale.h3`); dense-screen titles audit (34 stays for hero moments, drops where it wraps 3+ lines); global `maxFontSizeMultiplier` policy (≈1.35) on heading styles via the primitives; **new Appearance row: text size S/M/L** (kv-stored multiplier); fix stale "serif 21" comments | Question + 3 options + verdict fit one screen at default OS text; titles never wrap 4 lines; parity tests still green | S/M |
| W1-S3 | **Session review — the mistakes hub (lite)** | `buildSummary()` keeps the missed list (`{cardId, domainId, kind}` where `correct===false`); `SummaryCard` gains **"Review {n} missed →"** opening a review pane that re-renders those QuestionCards in answered-state with explanation open (cross-ref `records`→`loop.cards`); one CTA "Run them again" starts an immediate redo lane (Duolingo recycle); copy stays no-shame (MT-12 register) | Wrong answers reviewable with the *why* at session end; redo lane re-serves exactly the missed cards; summary schema change covered by tests | M |
| W1-S4 | **The one haptic** | Add `expo-haptics`; fire exactly ONE reward haptic per session, frame-timed to the summary/celebration beat (+ streak-milestone celebrations). Nowhere else — scarcity is the mechanism (research: Duolingo) | Haptic lands on session-complete beat; none anywhere else; respects OS reduce-motion/haptics settings | S |

### W2 — Navigation (stuck pages die)

> **AMENDED 2026-07-18 (Gerard, on device):** *"I assumed we agreed on a floating menu bar for all pages"* — W2-S1 now ships the dock on root-stack screens too (GlobalDock overlay, pathname-allowlisted), not TopBack alone. Deliberate exclusions (each has TopBack as its escape): the running mock paper (focus), tutor (composer collision), chooser (confirm-bar collision), the delete flows (destructive-confirm panels). Shipped in app #31. **New: W2-S3** — the chooser/pathfinder *flow itself* ("track your path is shit"): trap fixed in #31; the UX redesign awaits Gerard's specifics on what grates (steps? recommendations? confirm friction?).

| # | Slice | What / where | DoD | Effort |
|---|---|---|---|---|
| W2-S1 | **TopBack everywhere** | New `src/ui/TopBack.tsx` (safe-area chevron pill, `router.back()` with `canGoBack()` fallback to `/feed`), mounted on all 12 bottom-Back-only screens + `card/[item]` ready state + `chooser` when entered additively. Exempt by design: mock running paper (Abandon-only), `blocked`, sign-in/disclaimer gates. Bottom Backs stay (harmless) | No screen (outside the exempt set) requires scrolling or gestures to go back; every dead end gone | S/M |
| W2-S2 | **Feed burger** | The 13px header text-links (`feed.tsx:274-298` Tutor/Readiness/+Track/Settings) fold into a glass burger sheet matching the web drawer (mood toggle included). Dock untouched — it's loved | One-handed reach; links discoverable; vitest render | S/M |

### W3 — The boot: "TRAIN YOUR AI MIND" (the cool)

| # | Slice | What / where | DoD | Effort |
|---|---|---|---|---|
| W3-S1 | **App icon + native splash** | Real icon (brain on periwinkle) + `app.json` `icon`/`splash` keys via `expo-splash-screen` config plugin (bg `#D3DEF0`, brain image) — kills the Expo default | Icon + branded native splash on cold start | S |
| W3-S2 | **Animated boot screen** | `preventAutoHideAsync` at root; BootScreen: **hero-loop.mp4 bundled in-app** (1.43MB, `expo-video`, muted/loop/cover — ClipCard precedent) with gradient edge-melt into periwinkle, type-on **"TRAIN YOUR AI MIND"** with the coral AI token (**coral ported additively to `palette.ts` both moods** + TOKENS.md/parity updates both repos), then cross-fade into the gate. Fonts awaited before hide (kills the system-font flash). **≤2.2s, tap-to-skip, reduced-motion = still brain + instant title** | Cold start feels like the web hero; boot ≤2.2s; skip works; parity tests green both repos | M |
| W3-S3 | **Loading + motion polish** | `Shimmer` (currently unused) replaces the "…" text loading states (feed/readiness/mock/card `FeedStates.tsx:18-25`); TabBar gains a small active transition (Reanimated scale/slide); `account-setup` spinner restyled | No bare "…" loading frames left; dock feels alive | S |

### W4 — Kill the robot (PRD-VOICE D-V1 stages c+b, accelerated)

| # | Slice | What / where | DoD | Effort |
|---|---|---|---|---|
| W4-S0 | **(Gerard) Pod live-check** | Confirm `automatos-voice` deployment: `POST /v1/audio/speech` (Kokoro) + `/v1/audio/transcriptions` (faster-whisper) reachable + authed — the PRD-VOICE S5 unconfirmed box | curl returns audio bytes; latency + auth noted | — |
| W4-S1 | **Publish-time segment audio** | Web-repo pipeline: per-**segment** MP3s for lessons + cheat sheets (matches the `useReadAloud` cursor model), keyed by content hash, manifest `{itemId → segments[]}`, stored on the media bucket (`/academy/audio/`); Kokoro default voice. Whole library ≈ 2.7M chars ≈ **~$2 of GPU** | Manifest + audio served; hash-stable across republish; validator green | M |
| W4-S2 | **App RemoteSpeaker** | Second `TextSpeaker` impl (same interface — `speaker.ts:1-9` promises exactly this): plays segment files via expo-av, per-segment `onDone` natural, `setRate` for the 0.9–1.5 cycle, offline → device-TTS fallback; **"Robot voice today" copy dies** when remote is active (`voiceCopy.ts:15`); lock-screen transport becomes real | Lessons + cheat sheets read in a human voice; rate cycle works; offline fallback verified; copy swapped | M |
| W4-S3 | **Premium voice tier** | Per D-A4: ElevenLabs pre-gen for flagship tracks (same pipeline, provider param; ~$270 one-time full library, Creator $22/mo for updates) — quality ceiling above Kokoro | Flagship tracks in ElevenLabs voice; cost within D-A4 envelope | S |

### W5 — Listen mode (the podcast you love, finished)

| # | Slice | What / where | DoD | Effort |
|---|---|---|---|---|
| W5-S1 | **Real transcripts** | Populate `transcriptUrl` at publish (episode audio → pod `/v1/audio/transcriptions`, or source scripts where they exist); `loadTranscript()` fetches real URLs (today fixture-only); read-along highlight via `startSec` | Every live episode shows its transcript; "pending" copy only when genuinely absent | M |
| W5-S2 | **Playback speed** | `usePlayer` gains `setRate` + UI chips (0.8/1/1.25/1.5/2) | Speed control on the player; persists per user | S |
| W5-S3 | **Videos as audio** | Publish-time audio extraction of course videos (24 MP4s, ~767MB video → ~70MB audio) into the podcast manifest as episodes — "end of the day it's tech talk, doesn't always need graphics" | Video content listenable in the podcast tab, background + lock-screen; scope per D-A6 | M |

### W6 — The live tutor conversation (paid — phase 2 of this wave)

**Vendor reality check (research, 2026-07-17): Retell has no React Native support.** The mobile convo reuses PRD-207's *architecture* — server-minted short-lived session, per-minute metering, monthly caps, fail-closed gates — pointed at **ElevenLabs Agents**: ~$0.09–0.11/min all-in, built-in RAG (the tutor corpus), tool calling, and the only first-class Expo RN SDK. At a $14/mo tier with a 60-min cap, COGS ≈ $6/user (anchor: Duolingo Max $168/yr).

| # | Slice | What / where | DoD | Effort |
|---|---|---|---|---|
| W6-S1 | **Vendor spike (flagged)** | ElevenLabs Agents RN SDK POC behind a dev flag: connect, converse, ground on a corpus slice, interrupt | Latency + quality note; go/no-go for D-A8 | S/M |
| W6-S2 | **Mint + meter (spine)** | Academy-spine mint endpoint + `tutor_minutes` ledger mirroring PRD-207 S1/S3/S4 shapes (born-at-mint row, ended+active×reserve cap formula, honest refusals) | Gates in order; cap boundary tested; no key reaches the client | M |
| W6-S3 | **The convo surface** | TutorLive screen: orb-lite presence (Pulse/RingSweep reuse), live captions, mute/end, consented `learner_context` ≤1KB (PRD-TUTOR-LIVE §4.4 shape — the tutor opens knowing your readiness/due/weakest) | Real interruptible conversation grounded in course content, aware of progress (consent-gated) | M/L |
| W6-S4 | **The paid tier** | Mobile digital-goods rules force IAP: **RevenueCat** wrapping App Store/Play billing; $14/mo "Coach Live" gate on W6-S3 + minutes meter in Settings | Purchase → entitlement → minutes; restore flows; D-A7/D-A10 signed | M |

## 4. Sequencing

- **P1 — feel-better week:** W1-S1, W1-S2, W2-S1, W2-S2, W3-S1 (+ merge PR #30 first). Every complaint except voice visibly improved.
- **P2 — the cool week:** W3-S2, W3-S3, W4-S0→S2. Boot screen + human voice.
- **P3 — the loop week:** W1-S3, W1-S4, W5-S1→S3. Review hub, the one haptic, listen mode complete.
- **P4 — the paid convo:** W6 (after D-A7/A8/A10).

Verification: CI is the only gate (vitest per slice; parity suites both repos for the coral port); device smoke via the Expo Go tunnel session pattern proven 2026-07-17. No local runs as verification.

## 5. Decision boxes (Gerard)

| # | Decision | Recommendation |
|---|---|---|
| D-A1 | Type compaction: stem 27→22, cap font-scaling ≈1.35, add S/M/L text-size setting | **Yes to all three** — fixes "oversized" without flattening the display moments |
| D-A2 | Feed burger sheet replacing header text-links | **Yes**; dock untouched |
| D-A3 | Boot: bundled hero-loop.mp4 video vs Reanimated-only animation | **Video** — 1.43MB is cheap, it IS the brand asset; skippable, ≤2.2s |
| D-A4 | Voice provider: (a) Kokoro-only (~$0) · (b) Kokoro + ElevenLabs flagship (~$270 one-time + $22/mo) · (c) ElevenLabs everything | **(b)** — kill the robot free this week, buy the ceiling where it's heard most |
| D-A5 | The Coach's voice identity (pick actual voices — needs your ear; pairs with PRD-207 Qc) | Shortlist 3 Kokoro + 3 ElevenLabs voices; you pick |
| D-A6 | Videos-as-audio scope: overviews-first vs all 24 | **Overviews first** (9 episodes), rest on demand |
| D-A7 | Tutor convo pricing: $14/mo · 60-min cap vs minute packs | **$14/mo tier at launch**; top-up packs later |
| D-A8 | Tutor vendor: commit ElevenLabs Agents vs bake-off with OpenAI Realtime (~$0.02–0.05/min but DIY WebRTC on RN) | **ElevenLabs** — RN SDK + built-in RAG beats DIY; spike (W6-S1) is the tripwire |
| D-A9 | Haptics scope | **Session-end beat + streak milestones only** — scarcity is the point |
| D-A10 | Payment rails for W6 | **RevenueCat** (IAP-compliant, cross-platform); academy has no billing today — this is net-new |

---

*Traceability: extends PRD-VOICE (D-V1 staging, S5 pod interface), PRD-MT-12 (§4.7 celebrations register, Today loop), PRD-TUTOR-LIVE (§4.4 learner_context, consent), PRD-COMMUNITY (S1 share cards adjacency), PRD-207 (mint/meter/cap architecture — pattern, not vendor, for mobile); grounded by the 2026-07-17 app audit (file:line above), [app-competitor-voice-scan-2026-07-17](../research/app-competitor-voice-scan-2026-07-17.md), and the web-home DNA pass (hero-loop.mp4 · "TRAIN YOUR AI MIND" · coral tokens `academy.css:67-73,700-710`). Fix PR #30 precedes everything.*
