# PRD-VOICE-PIPELINE — read-aloud audio that isn't a robot: content-addressed, Kokoro now, ElevenLabs-ready

**Status:** SIGNED to build 2026-07-18 · **D-A4 decided (Gerard):** *Kokoro first (self-hosted, ~$2 one-time), built provider-swappable so ElevenLabs is a later flag, not a rewrite.* · **Owner:** Academy (Gerard: pod URL + AWS media secrets + the voice pick)
**Repos:** `automatos-academy-app` (the `RemoteSpeaker`) + `automatos-academy` (the generation pipeline + CDN) — spans both, like the video media path it reuses.
**North star (Gerard's words):** *"When Automatos generates content I pass it through the pipeline, it makes all the voice files once, saved to S3 via CDN… everything listenable gets turned into voice files. Kokoro for now, swap to ElevenLabs later if built right."*
**Supersedes** the sketch in PRD-WAVE-APP-DELIGHT **W4** and details PRD-VOICE **D-V1 stage (c)** (pre-generated publish-time audio) + **S5** (service voice) with the provider decision locked.

---

## 1. What this is

Kill the on-device robot for **read-aloud** (lessons, cheat-sheets, facts — the "listen at the gym" content) by **pre-generating the narration once at publish time** into MP3 files on the existing academy S3/CDN, and playing them through the app's file-backed audio path (real lock-screen transport + background + offline + speed). The generator is **provider-swappable** behind one adapter interface: Kokoro today for ~$2, ElevenLabs later for the premium brand voice — **no app change, no architecture change, just a flag and a re-run.**

**Framing (CLAUDE.md §3): extension, not net-new.** The `TextSpeaker` seam already exists and *explicitly anticipates this exact swap* (`src/audio/speaker.ts:1-10`: "the staged upgrades … are a second implementation of THIS interface, never a rewrite of the consumers"). The CDN path already exists (`.github/workflows/deploy-media.yml` → `AWS_SDK_DEPLOY_*` → widget bucket under `/academy/`, the video media pattern). Net-new is confined to: the generation script, the two provider adapters, and one `RemoteSpeaker` implementation of the existing seam.

## 2. The design — content-addressed audio, no manifest

The elegant core: **the audio URL IS the content hash.** No manifest to build, sync, or drift.

```
audioUrl = ${CDN}/academy/audio/${VOICE_KEY}/${sha256(normalize(segmentText))}.mp3
```

- **`normalize`** = trim + collapse internal whitespace (one shared function, identical in Node and RN, so the hashes match byte-for-byte).
- **`VOICE_KEY`** = the current voice namespace, e.g. `kokoro-af-v1`. **This is the swap dimension:** re-generating with ElevenLabs writes under `elevenlabs-auto-v1/…`; the app flips one config value (`EXPO_PUBLIC_VOICE_KEY`) to cut over — even A/B by flipping it. Old files stay; nothing is destroyed.
- **`sha256`** on device via `expo-crypto` (bundled in Expo Go), in the pipeline via Node `crypto` — same hex for the same bytes.

### The three seams (why "swap later" is a flag, not a project)
1. **App** — `TextSpeaker` (unchanged). A new `RemoteSpeaker`/`HybridSpeaker` implements it: for each `speak(text)`, hash the text → try `HEAD/GET` the content-addressed MP3 → play via `expo-av`; **miss or error → delegate to the device speaker** (the existing `expo-speech`), so it *always* works and *never* crashes. Consumers (`useReadAloud` segment cursor, quick-fire) are untouched — they still call `speak(oneSegment)` and chain on `onDone`.
2. **Pipeline** — a `VoiceProvider` adapter: `generate(text) → mp3 bytes`. `KokoroProvider` POSTs the pod's OpenAI-shaped `/v1/audio/speech`; `ElevenLabsProvider` POSTs `/v1/text-to-speech/{voice_id}`. Same interface; ~30 lines each. Swapping = which provider + which `VOICE_KEY` the run uses.
3. **Storage** — content-addressed keys on the same S3 bucket + CloudFront the videos already use. A file is a file; provider-blind.

### Incremental by construction (the "generate once" Gerard asked for)
Because the key is the content hash, the generator is **idempotent and diff-only**: it walks published segments, and for each, `HEAD`s the target key — **exists → skip; missing → generate + upload.** So it hooks into the publish step and only ever pays for *new or changed* content. Automatos produces a lesson → publish → only that lesson's segments render. The library self-maintains.

### What becomes a file — and what deliberately does not
- **Pre-generated (the bulk):** lesson prose (`overviewBlocks`), cheat-sheet prose, fact statements + explanations — the read-aloud segments `useReadAloud` already walks.
- **NOT pre-generated (stays live/visual):** interactive quiz questions/options (the tap flow + live quick-fire own those), anything personalized (names, "4/6", exam countdowns — infinite variants), live tutor answers (a different stack entirely), URLs/code/source-refs (don't narrate). The rule: **static narratable prose → files; interactive or dynamic → live.**

## 3. Slices (test-first; CI is the only gate)

| # | Slice | Repo | What / DoD | Blocked on |
|---|---|---|---|---|
| **S1** | **`RemoteSpeaker` + `HybridSpeaker`** | app | The seam impl: hash→fetch→`expo-av` play, per-segment `onDone`, rate via `setRateAsync`, real pause/resume (better than device's iOS-only), device fallback on miss/error. `expo-crypto` added. Config: `EXPO_PUBLIC_VOICE_CDN` + `EXPO_PUBLIC_VOICE_KEY` (both absent ⇒ pure device speaker, today's behaviour). Unit-tested with mocked crypto/av/fetch. | nothing — **buildable now** |
| **S2** | **Provider adapters + `normalize`/`hash`** | web | `VoiceProvider` interface + `KokoroProvider` + `ElevenLabsProvider`; the shared `normalize()` + `contentKey()` (asserted identical to the app's via a golden fixture). HTTP mocked in tests. | nothing — **buildable now** |
| **S3** | **The generation script** | web | `scripts/generate-audio.mjs`: walk track content → narratable segments → diff-`HEAD` → provider.generate → S3 put under `academy/audio/<VOICE_KEY>/<hash>.mp3`. Dry-run + `--voice-key` + `--provider`. Rides `deploy-media.yml`'s AWS creds. | **pod URL** (Kokoro) + **AWS secrets** to *run* (code lands now) |
| **S4** | **Wire it on** | app | `getTextSpeaker()` returns `HybridSpeaker` when configured; `ReadAloudBar` "Robot voice today" copy dies when remote is active; offline caches MP3s via the podcast blob runtime. | S1 + real files served |
| **S5** | **Voice pick + first render** | both | Choose `VOICE_KEY`/voice (D-A5); generate the flagship track; A/B a lesson Kokoro-vs-ElevenLabs on device. | **the voice decision** |
| **S6** | **Publish hook** | web | Generation runs on content publish (diff-only) so new Automatos content self-voices. | S3 proven |

**Sequence:** S1 + S2 ship now (this session, CI-green, need nothing). S3 lands the code now, *runs* when the pod URL + AWS secrets arrive. S4–S6 follow the first real render.

## 4. Security · cost · risks
- **Keys are server-only.** The Kokoro pod auth / ElevenLabs key live in the pipeline (CI secret), **never in the app** — the phone only ever GETs public MP3s. Matches the app's no-secrets-in-client posture.
- **Cost is bounded to generation, one-time per content version:** Kokoro ≈ **$2** for the whole ~2.7M-char library; ElevenLabs ≈ **$270** one-time if/when you upgrade a track. Playback is free CDN bandwidth. (Figures from the 2026-07-17 voice research — verify current rates at run.)
- **The swap is heard, not seen.** Architecturally seamless; the *voice identity* changes (Kokoro preset ≠ ElevenLabs designed voice) — expected, an upgrade, flagged so it's a choice not a surprise.
- **Pronunciation of acronyms/jargon** (MCP, RAG, S3) — both engines mangle some; a small lexicon/SSML pass is a follow-up if the ear demands it, not v1.

## 5. Decisions / blockers (Gerard)
| # | Needs | State |
|---|---|---|
| D-A4 | Provider strategy | ✅ **SIGNED: Kokoro now, ElevenLabs-swappable** |
| B1 | `automatos-voice` pod public URL (probe 404'd — deploy/confirm) | ⛔ blocks the first *render* |
| B2 | `AWS_SDK_DEPLOY_*` secrets on the academy repo (the video-CDN set) | ⛔ blocks upload |
| D-A5 | The voice itself — the `VOICE_KEY` + Kokoro voice (af_heart / am_michael / bm_george…); later the ElevenLabs Voice-Design "Auto" | ⏳ needs your ear |

*Traceability: implements the `TextSpeaker` swap the seam was built for (`src/audio/speaker.ts:1-10`); reuses `backgroundAudio.ts` + the podcast blob cache + `deploy-media.yml`/`AWS_SDK_DEPLOY_*` CDN; content-addressed keys mean no manifest infra. S1+S2 need nothing and ship first.*
