# PRD-VOICE — Voice & audio-first study: hands-free learning for commutes, gyms, and kitchens

**Status:** proposed · **Owner:** Academy · **Last updated:** 2026-07-16
**Repos:** `automatos-academy-app` (S1–S3, S5) · `automatos-academy` web SPA (S4) — no new services in v1
**Builds on (shipped):** podcast player + offline downloads (MT-10 — `src/podcast/*`) · on-device tutor voice *input* (MT-09 F13 — `src/tutor/voice*`) · the single outcome write path (`src/sync/outcomes.ts`)
**Referenced by (forthcoming):** PRD-TUTOR-LIVE S4 (tutor speaks its answers) · PRD-MT-12 (a Today plan can include an audio item)
**Stubs honoured:** [PRD-MT-09](PRD-MOBILE-TUTOR/build/PRD-MT-09-voice-tutor-STUB.md) (voice stack was an open input — D-V1 answers it) · [PRD-MT-10](PRD-MOBILE-TUTOR/build/PRD-MT-10-podcast-STUB.md) (F16 media policy carried)

## 1. Problem

The moments a phone screen loses to the world — commute, gym, school run, cooking — are exactly the
moments a *due SM-2 queue* dies. The app already owns three of the four pieces of an audio answer:

- **Playback that survives a pocket.** The podcast player configures background-capable audio once
  per run (`ensureBackgroundAudioMode()` in `src/podcast/usePlayer.ts`: `staysActiveInBackground`,
  `playsInSilentModeIOS`, DoNotMix) and the app declares iOS `UIBackgroundModes: ["audio"]` +
  Android `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (`app.json`). Episodes stream or play offline from
  explicit base64 blob downloads (`src/podcast/downloads.ts`, namespace `podcast/v1`, F16: never
  prefetched), manifest live from the Content API (`src/podcast/manifest.ts`).
- **Ears already listen to us.** MT-10's recall bridge (`src/podcast/recallBridge.ts`) proves the
  audio→practice hop: post-episode cards composed from the existing selector + feed composer,
  outcomes through `recordOutcome()`, wrong → tutor deep-link.
- **The app already listens to the learner.** MT-09 F13 shipped on-device speech *recognition*
  behind a clean injected seam (`src/tutor/voiceRecognizer.ts` `SpeechRecognizer`,
  `expo-speech-recognition@3.1.3`, `ON_DEVICE_START_OPTIONS`: en-US, interim results, on-device
  forced; Expo Go degrades to a disabled affordance — `src/tutor/useVoiceInput.ts`).

The missing piece is **speech out** (there is no TTS dependency in `package.json` today) and a mode
that **composes** the pieces into a session you can run screen-off, start to finish. Lessons are
markdown `body` + `estMinutes`, questions are `stem`/`options[]`/`explanation`
(`src/content/schemas.ts`) — all of it speakable. Web learners get none of this either: the lesson
reader (`automatos-academy/public/js/views/lesson.js`) and the docked tutor panel
(`public/js/tutor.js`) are silent.

## 2. Goals

1. A learner completes a full study session — due reviews, a lesson, optionally a podcast segment —
   **without looking at the screen once** after pressing start.
2. **An audio rep is a real rep:** spoken quick-fire answers flow through the *same*
   `recordOutcome()` answer path as taps — same SM-2 state, same mastery mirror, same sync queue,
   same streak/pacing credit (D-V4).
3. **Zero new backend for v1.** On-device TTS + shipped voice input + cached content; the platform
   voice service arrives later behind a flag (S5) without reshaping any surface.
4. Web gets the two cheap wins — lesson read-aloud and a tutor voice affordance — via the Web
   Speech API, feature-detected, invisible where unsupported (S4).
5. Honest quality posture: label the v1 voice ("robot voice today, better voices coming") rather
   than let it read as the product's ceiling.

## 3. Non-goals

- **Voice cloning / branded voices** — nothing bespoke; stock device or service voices only.
- **Multilingual** — English v1, matching the shipped recognizer's `lang: 'en-US'`.
- **Always-listening / wake word** — the mic opens only inside an explicit answer window; MT-09's
  tap-to-talk posture stands.
- **Voice-navigating the whole app** — voice drives the study session, not routing/settings.
- **Podcast hosting/CDN decisions** — MT-10 O2 owns episode delivery; we only *sequence* episodes.
- **Re-litigating the tutor's answer pipeline** — PRD-TUTOR-LIVE owns what the tutor says; this PRD
  gives surfaces a mouth and ears.

## 4. Design

### 4.1 One new seam: `TextSpeaker` (mirrors the recognizer seam)

`src/audio/speaker.ts` — a platform-free contract with the exact shape of MT-09's
`SpeechRecognizer` idiom: injected module, fake in tests, device wiring in one composition root.
v1 implementation wraps **`expo-speech`** (new dependency — Expo's AVSpeechSynthesizer/Android-TTS
wrapper): `speak(text, {rate, onDone})`, `stop()`, `pause()/resume()` where the platform allows,
`isSpeaking()`. Every consumer below talks to the seam, never to the library — that is what makes
D-V1's staged strategy (device voice → pre-generated audio → platform service) a swap, not a rewrite.

### 4.2 Speakable text is a pure transform

Lesson bodies already parse to a block model (`parseMarkdown` in `src/feed/markdown.ts`; the
library reader builds on it, `src/library/model.ts`). `src/audio/speakable.ts` walks those blocks
to spoken text: headings become section announcements, lists become "first… next…", **fenced code
becomes "code sample — it's on screen when you want it"** (never read syntax aloud). Pure,
unit-tested, shared by mobile and (ported) web.

### 4.3 Audio quick-fire grammar is pure too

`src/audio/quickfire/grammar.ts`: final transcript → intent — `answer(A|B|C|D)` (accepting "bee",
"option b", "the second one"), `repeat`, `explain`, `skip`, `pause`. Constrained matching over the
shipped recognizer's transcript, with track jargon (MCP, RAG, SM-2, LoRA…) passed as
`contextualStrings` — supported by `expo-speech-recognition` on iOS
(`SFSpeechRecognitionRequest.contextualStrings`) and Android, unused by the app today. Unmatched
transcript → one re-ask, then fall back to the always-visible tap options. Ambiguity handling is
D-V2.

### 4.4 Session composition reuses the recall-bridge idiom

Commute mode composes **due reviews (quick-fire) → one short lesson (read-aloud) → optional podcast
segment** using the same machinery the recall bridge proved: `engine/selector buildSession` +
`feed/compose`, cached-only content reads, outcomes via `recordOutcome()` with a distinct surface
tag (the podcast surface tag idiom, `src/podcast/analytics.ts`). Podcast segments obey F16: only
episodes already downloaded (or explicitly chosen to stream) are eligible. MT-12's Today plan
integration is a session descriptor/deep link — **reference only here**; MT-12 owns the surface.

### 4.5 Hands-free is the acceptance bar, screens are an enhancement

Every interaction in S2/S3 must be completable by voice or by *nothing* (timeouts advance
gracefully: no answer → "we'll come back to it", item re-queued unanswered — never auto-marked
wrong). The screen mirrors state for glances; it is never required. Lock-screen transport controls
are guaranteed for file-backed audio (podcast today, pre-generated lesson audio under D-V1(c));
for synthesized speech they are **verified in-build, not promised** — see Risks.

### 4.6 Web (S4) — two affordances, no build system, no server

The SPA is vendor-agnostic no-build JS; S4 adds one module (`public/js/speech.js`) feature-detecting
`speechSynthesis` (read-aloud) and `SpeechRecognition`/`webkitSpeechRecognition` (mic) independently.
Lesson view gets a read-aloud button over the same speakable transform (ported); the docked tutor
panel (`public/js/tutor.js`) gets mic-in via the existing `send()` path — the `askTutor()` idiom —
and optional spoken replies. Unsupported browser → the button simply never renders. No degradation
copy, no polyfills, no auth changes.

## 5. User stories

- **US-V01 (commuter):** "Start my session" from a lock-screen-friendly play surface; twenty minutes
  later I've cleared my due reviews and heard a lesson, phone never left my pocket.
- **US-V02 (gym):** Quick-fire between sets — question read aloud, I say "B", it says "B — correct"
  and moves on; when I say "explain", it reads the explanation and repeats the question later.
- **US-V03 (kitchen):** A lesson reads aloud while I cook; "pause" and "repeat" work by voice; the
  code sample waits on screen for when my hands are free.
- **US-V04 (web learner):** A read-aloud button on lessons and a mic on the tutor panel in my
  browser; in a browser without speech support I never see either.
- **US-V05 (skeptic):** The voice is labelled honestly; I know better voices are coming and nothing
  pretends otherwise.
- **US-V06 (streak keeper):** My audio-only day still counts — same streak, same pacing, because the
  same outcomes were recorded.

## 6. Slices + definition of done

### S1 — Mobile lesson read-aloud (on-device TTS)

Adds `expo-speech`, the `TextSpeaker` seam (§4.1), the speakable transform (§4.2), and a read-aloud
affordance on lesson surfaces (library reader + feed lesson card). Reuses the podcast audio mode +
`app.json` declarations verbatim — no new config.
**DoD:** lesson plays screen-off with in-app play/pause/stop and rate control (0.9×–1.5×) · code
blocks are announced, never read · quality label present · Expo Go degrades to a disabled
affordance (the `useVoiceInput` idiom) · speakable transform unit-tested.

### S2 — Audio quick-fire (speak → listen → verdict)

TTS reads `stem` + lettered `options`; an answer window opens the *existing* voice input seam; the
grammar (§4.3) resolves the intent; verdict + spoken `explanation` follow; taps stay available the
whole time. **SM-2 recording is byte-identical to visual practice: the same `recordOutcome()`
answer outcome** (`src/sync/outcomes.ts`) — no parallel write path, offline-queued like everything
else.
**DoD:** full quick-fire round hands-free · "repeat"/"explain"/"skip" honoured · unmatched speech
re-asks once then falls back to taps · `contextualStrings` fed from track vocabulary · outcomes
visible in the same mastery mirror/sync queue as taps · grammar pure-module tested.

### S3 — Commute mode (the composed session)

One start affordance builds the §4.4 sequence from cached content; continuous audio with spoken
transitions ("that's your reviews done — here's a five-minute lesson"); session end rides the
existing loop-end path so streak/pacing credit is automatic (D-V4); session length default per
D-V3, "keep going" extends.
**DoD:** due reviews + one lesson + (if downloaded) one podcast segment play as one session,
screen-off · timeout advances without penalising (§4.5) · works in airplane mode when content is
cached · MT-12 hook = exported session descriptor, nothing more.

### S4 — Web read-aloud + tutor voice affordance

§4.6 exactly. Small, separate, shippable independently of S1–S3.
**DoD:** lesson read-aloud + tutor mic/spoken-reply toggle work in Chrome/Safari/Edge current ·
Firefox (no recognition) shows read-aloud only · a browser with neither shows nothing and logs
nothing user-visible · zero server/auth changes.

### S5 — Platform voice service integration (dependent, flagged)

`automatos-voice` (`automatos-voice/README.md`) *declares* exactly the interface we'd need — an
OpenAI-compatible `POST /v1/audio/speech` (`{input, voice, model:"kokoro", speed}` → `audio/mpeg`
bytes; Kokoro TTS) plus `/v1/audio/transcriptions` (faster-whisper) on an independent Railway
service — but its deployment, auth, cost, latency, and voice quality are **unconfirmed from this
repo**. S5 = a second `TextSpeaker` implementation behind a remote flag: POST text → cache the
returned audio under the blob-store idiom (`podcast/v1` sibling namespace) → play as file-backed
audio (which also buys real lock-screen transport). Ships only after the interface is confirmed
live; nothing in S1–S4 waits on it.
**DoD (when unblocked):** flag-off is byte-identical to on-device behaviour · responses cached and
replayable offline · service failure degrades silently to the device voice mid-session.

## 7. Risks

| Risk | Posture |
|---|---|
| **TTS quality perception** — device voices sound robotic; first impressions stick. | Label it in-product ("robot voice today — better voices coming"), keep utterances short, default a slightly-slow rate; D-V1's stage 2 (pre-generated audio) is the real fix for flagship content — the NotebookLM pipeline already proves podcast-grade audio for tracks. |
| **Recognition accuracy on jargon** — "MCP", "RAG", "SM-2" garble easily. | Quick-fire needs only the constrained grammar (letters + five commands), which tolerates bad transcription; `contextualStrings` vocabulary hints (verified supported by the shipped lib) cover the free-er "explain" follow-ups; one re-ask then tap fallback, never a dead end. |
| **Battery** — continuous synthesis + periodic recognition on a commute. | Mic opens only in answer windows (never always-listening, §3); synthesis is bursty; measure a 20-min S3 session on a mid-tier device before GA and publish the number in the PR. |
| **Lock-screen transport for synthesized speech** — expo-speech utterances may not surface Now-Playing controls the way expo-av files do. | Treated as unverified (§4.5): S1 promises screen-off *continuation*, not lock-screen transport; file-backed audio (podcast, D-V1(c), S5 cache) is the guaranteed transport path. Verify in the S1 build and record the truth in the PR. |
| **Web Speech inconsistency** — recognition absent in Firefox, quality varies. | Feature-detect per capability, hide silently (§4.6); web voice is an affordance, never a promised mode. |
| **Distraction safety** — "study while driving" is an obvious use we shouldn't optimise into risk. | Hands-free-complete design (§4.5), no interaction ever *required* within a time limit; no copy that markets driving specifically. |

## 8. Decision boxes

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| **D-V1** | **TTS strategy** (the big one) | **Staged (below)** | S1 start (stage 1 only) |
| **D-V2** | Spoken-answer confirmation UX | **Grammar-match = accept immediately with spoken echo** ("B — correct"); only ambiguous/unmatched input triggers a confirm/re-ask. Always-confirm doubles every rep's length and kills the mode's rhythm; the echo *is* the confirmation, and "no, C" style correction can arrive later without redesign. | S2 |
| **D-V3** | Audio session length default | **15 minutes** composed (≈ due reviews + one `estMinutes ≤ 5` lesson), spoken "keep going?" at the end — consistent with the feed's soft-stop philosophy (`src/feed/softStop.ts`: a genuine choice, never a lock). Options 10/15/20 in settings; podcast segments extend naturally. | S3 |
| **D-V4** | Do audio sessions count toward streak/pacing identically? | **Yes — a rep is a rep.** Because S2/S3 ride `recordOutcome()` and the existing session-end path, identical credit is the *zero-code* outcome; special-casing audio would cost code **and** trust. Streak stays loss-mechanics-free per `src/feed/streak.ts`. | S3 (confirm-only) |

**D-V1 in full — three honest options, staged answer recommended:**

- **(a) On-device `expo-speech`** — free, instant, offline, zero infra; robotic. Right for
  quick-fire (short utterances hide voice quality) and acceptable, labelled, for lesson read-aloud.
- **(b) Platform voice service (`automatos-voice`)** — Kokoro voices, interface already declared
  (§S5) but operationally unconfirmed; adds network dependency + cost per character; cacheable to
  blobs, which recovers offline + lock-screen transport.
- **(c) Pre-generated audio at publish time** — rides the content-publish pipeline the way podcast
  episodes already do (manifest → stream/download); best quality (the NotebookLM lane already
  produces podcast-grade track audio), real files = real transport controls; costs storage/CDN and
  only covers *published* content, never dynamic text (verdicts, tutor answers).

**Recommendation: v1 = (a)** for quick-fire + read-aloud (ship now, label honestly) · **v2 = (c)**
for flagship-track lesson audio (quality where it's felt most, dynamic glue stays on-device) ·
**adopt (b) behind the S5 flag** once its deployment is confirmed, replacing (a) for dynamic text.
Each stage is a `TextSpeaker` swap (§4.1), not a rework — that is the point of the seam.
