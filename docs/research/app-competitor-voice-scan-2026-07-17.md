# Research Report: Premium Learning-App UX, TTS Replacement, and Live Voice Tutor Stacks
**Date:** 2026-07-17 · **For:** Automatos Academy mobile app (Expo RN + web SPA, "Academy Coach", periwinkle, vendor-agnostic AI-architecture cert tracks)
**Method:** Live web research 2025–2026 sources; official pricing pages fetched directly where possible. All prices verified against current pages as of July 2026.

---

# TRACK A — What makes top learning apps feel premium in 2025–2026

## Per-app briefs

### Duolingo (the polish benchmark)
- **Boot/splash:** Animated "Super Splash" and mascot-motion launch moments are part of a cataloged motion system (60fps.design catalogs 60+ distinct Duolingo animation shots: https://60fps.design/apps/duolingo). Character animation is built in **Rive** — vector art + state machines in one small .riv runtime file, so the mascot reacts in real time instead of playing canned clips (https://dev.to/uianimation/how-duolingo-uses-rive-for-their-character-animation-and-how-you-can-build-a-similar-rive-mascot-5d19). For Video Call they built lip-sync with 20+ mouth shapes per character driven by phoneme timing (https://blog.duolingo.com/world-character-visemes/).
- **Answer feedback:** Instant color flip + slide-up result panel + sound + character reaction. Motion is *state-driven, not decorative* — success/failure/urgency each have a motion state (https://dev.to/uianimation/duolingo-style-animation-in-mobile-apps-how-it-works-and-what-a-rive-animator-brings-to-developers-3n38).
- **Haptics — the key insight:** Duolingo uses its haptic reward in essentially ONE place: lesson completion, timed exactly to the streak-number bounce animation. Deliberate scarcity so the reward never dulls ("if the app uses more haptic rewards, diminishing marginal utility kicks in") (https://medium.com/design-bootcamp/haptic-rewards-to-keep-you-glued-6efddf33801c, https://www.threads.com/@hi.nixson/post/DDBZIxgsHYp). Community re-implementations of their 3D bouncy button + haptic exist (https://dev.to/yossabourne/making-3d-button-with-haptic-effect-like-duolingo-in-swiftui-2mj9).
- **End of session:** Celebration chain — XP tally → accuracy → time, then character gag for perfect runs ("Lesson Complete Head Explode", "Perfect Lesson Disco", "Perfect Lesson Slow Clap" per the 60fps catalog). Mistakes made mid-session are re-queued at the end of the session (hearts system), plus a persistent "review mistakes" hub (https://blog.duolingo.com/how-to-review-lessons-on-duolingo/).
- **Streaks:** Dedicated milestone animations at 2/3/4/8/30/50/64/100/127/150/185 days, streak freeze/unfreeze, friend streaks, and a one-tap share card (https://blog.duolingo.com/streak-milestone-design-animation/, https://60fps.design/shots/duolingo-streak-card-and-share-sheet).
- **Audio mode:** **DuoRadio** — short podcast-style episodes hosted by world characters with embedded comprehension checks, marked with a headphone icon in the path; scaled 10x with genAI (https://blog.duolingo.com/duoradio-listening-practice/, https://blog.duolingo.com/scaling-duoradio/). Separate long-form Duolingo Podcast (https://podcast.duolingo.com/).
- **AI voice tutor:** **Video Call with Lily** — real-time spontaneous voice conversation with an animated character, iOS+Android, 8+ languages. Gated behind **Duolingo Max: $29.99/mo or $168/yr (~$14/mo annual)**; family ~$240/yr (https://blog.duolingo.com/video-call/, https://investors.duolingo.com/news-releases/news-release-details/duolingo-launches-ai-powered-video-call-android, https://beginnersinai.org/duolingo-max-explained/). This is the monetization comp for a paid "talk to your tutor" tier.
- Onboarding: "reverse the funnel" — lesson first, signup after hook; loss-aversion mechanics (streaks/XP); emotional design via mascots (https://www.925studios.co/blog/duolingo-design-breakdown).

### Quizlet
- Smooth flashcard-flip animation, instant auto-grading in Learn/Test modes (https://studydrome.com/guides/quizlet-review/).
- **Q-Chat (built on ChatGPT API) was DISCONTINUED June 30, 2025** (https://quizlet.com/blog/meet-q-chat, https://aiflowreview.com/quizlets-review-2025/). No voice tutor; reviewers note "no voice support or audio read-aloud option in Quizlet's AI tools" (https://efcoachtutors.com/quizlets-ai-features-turn-your-notes-into-flashcards/). The pioneer retreated — the AI-tutor-inside-a-study-app lane is open.

### Brainscape
- **Confidence-Based Repetition:** after each card you rate confidence 1–5 (traffic-light colors); rating drives the spaced-repetition scheduler. Zero learning curve, "metacognition deepens memory" framing; ~82% retention in one test (https://www.brainscape.com/spaced-repetition, https://nibble-app.com/blog/brainscape). Checkpoint stats/mastery % are the end-of-session pattern. Reviewers call the interface effective but *dated vs newer fluid apps* (https://flashrecall.app/blog/www-brainscape-com).

### AnkiMobile / AnkiPro (Noji)
- AnkiMobile = official, $24.99 one-time; switched default scheduler to **FSRS** (ML-personalized intervals, ~20–30% fewer reviews for same retention) in Oct 2023 (https://apps.apple.com/us/app/ankimobile-flashcards/id373493387, https://www.mindomax.com/anki-pro-vs-anki). AnkiPro rebranded to Noji June 2025 under trademark pressure; still SM-2. Design lesson: algorithm quality (FSRS-style) is a real differentiator to *claim in copy* ("fewer reviews, same retention"), but neither app is a UX/polish benchmark.

### Blinkist
- Audio-first: professional narration that "feels like a podcast," speeds 0.5–2.0x, offline download, background/lock-screen playback; **Shortcasts** = 15-min podcast-summary format co-produced with creators (https://support.blinkist.com/en/articles/10033254-how-can-i-adjust-the-speed-of-the-audio, https://www.blinkist.com/magazine/posts/announcing-shortcasts). Reviewers consistently rank its narration quality above Headway's TTS-ish audio (https://www.hustleinspireshustle.com/blog/headway-vs-blinkist-comparison).

### Headway
- The **onboarding personalization quiz is a conversion machine**: goals → habits → interests before any content; sunk-cost effect; "choose up to 3 goals" (https://medium.com/@rajputgrishma/8-user-activation-strategies-headway-used-to-onboard-40-million-users-01061e70aaa1). 2025 evolution: first screen became an auto-advancing **Stories format** (https://www.retention.blog/p/headway-evolution-2024-2025). Streaks, badges, daily challenges, spaced-repetition framing; $89.99/yr vs Blinkist $99.99/yr (https://www.kristian-larsen.com/reviews/blinkist-vs-headway/). Weakness: audio narration reads robotic vs Blinkist — proof that narration quality is *felt* by users and shows up in every comparison review.

### Sololearn
- Kodie AI teacher, "Explain My Answer," "Find My Mistake" — **text-only**, gated to top "Max" plan (https://www.coursefacts.com/guides/mimo-vs-sololearn-2026). Leaderboards, code challenges, community.

### Mimo
- Streaks with **streak shields** (freeze equivalent), XP, badges; **home-screen widgets** showing streak + 7-day visualization; AI code review + AI app-builder flow (https://mimo.org/blog/mimo-vs-sololearn, https://play.google.com/store/apps/details?id=com.getmimo). Reviewers credit the streak mechanic for higher DAU retention than most learning apps. No voice.

### DataCamp mobile
- Real code execution in-app with real-time feedback + XP; 5-minute lesson framing ("even with 5 minutes you'll measure progress"); offline downloads; AI hints that don't give away answers; desktop↔mobile progress sync (https://www.datacamp.com/mobile, https://www.datacamp.com/blog/datacamp-for-mobile-mobile-coding-at-its-best). No voice, no audio mode.

### ExamPro
- Web platform (AWS/Azure/GCP certs) by Andrew Brown — they are an AWS Community Hero; features are lecture videos, labs, flashcard spaced repetition, readiness meter (https://www.exampro.co/, https://www.sitepoint.com/how-exampro-helps-developers-get-cloud-certified/). **No evidence of a real native mobile app** in current sources.

### Tutorials Dojo
- Jon Bonso's practice exams — they are highly respected for question quality — but the platform is **web-only, no mobile app** (https://tutorialsdojo.com/, https://www.examcert.app/blog/best-it-certification-practice-app-2026/).

## Synthesis across the 6 requested dimensions
1. **Boot experience:** Winners animate the brand instant-on (Duolingo Rive mascot motion; Headway auto-advancing stories first-screen). Losers show a static logo. A Rive/Lottie animated Coach mascot on splash is cheap and immediately reads "premium."
2. **Answer feedback:** The premium formula = instant color-state flip + slide-up panel + short sound + character/mascot reaction, ALL state-driven from one source of truth. Haptics used sparingly (see Duolingo's scarcity principle).
3. **End-of-session:** Celebration chain (XP → accuracy → speed → gag if perfect) THEN missed-question recycle. Brainscape adds mastery-% checkpoint framing; cert-prep apps should show "readiness meter" movement per session (ExamPro's one good idea).
4. **Motion/haptic language:** One motion system, not per-screen animations: Rive state machines (Duolingo) or Lottie/Reanimated equivalents; haptic reserved for the session-complete beat, timed to the animation frame.
5. **Audio modes:** Blinkist-grade narration + 0.5–2x speed + offline + background/lock-screen is table stakes in content apps; DuoRadio shows podcast-style episodic recaps with embedded checks. **No cert-prep competitor has ANY of this** — biggest open lane for Academy.
6. **AI voice tutor:** Only Duolingo has mainstream in-app voice conversation (Video Call, $168/yr Max tier). Adjacent: Speak ($99–180/yr, voice-first language tutor, https://www.speak.com/, https://languatalk.com/blog/speak-app-review/). Quizlet killed Q-Chat; Sololearn/Mimo AI is text-only. A grounded voice tutor in a cert-prep app would be first-of-kind.

## Gap table: pattern → who does it best → description → effort to match (Expo RN)

| # | Pattern | Best-in-class | Concrete description | Effort |
|---|---------|--------------|----------------------|--------|
| 1 | Listen-to-lesson audio mode | Blinkist | Pro narration, 0.5–2x speed slider, offline, background + lock-screen controls | **Low-Med** (Track B + expo-audio config plugin) |
| 2 | Haptic-timed completion beat | Duolingo | ONE haptic reward, at session complete, frame-timed to number-bounce animation; everywhere else silent | **Low** (expo-haptics) |
| 3 | Onboarding personalization quiz | Headway | Goals→habits→interests quiz before content; auto-advancing stories UI; output = personalized plan | **Low** |
| 4 | Lesson-complete celebration chain | Duolingo | XP tally → accuracy → time cards; special animation for perfect runs; share card | **Med** |
| 5 | Missed-question recycle + mistakes hub | Duolingo | Wrong answers re-queued end-of-session; persistent "practice mistakes" entry point | **Med** |
| 6 | Confidence-rated spaced repetition | Brainscape (+Anki FSRS) | 1–5 confidence tap after reveal drives scheduler; mastery-% checkpoint screens | **Med** |
| 7 | Streak milestones + freeze + widget | Duolingo + Mimo | Milestone-specific animations, streak freeze ("shield"), share card, home-screen streak widget | **Med** |
| 8 | Rive state-driven mascot | Duolingo | One .riv state machine; mascot reacts to correct/wrong/idle/streak; used on splash too | **Med-High** (basic mascot Med) |
| 9 | Podcast-style recap episodes | DuoRadio / Blinkist Shortcasts | 5–15-min episodic audio recaps with embedded quick checks, headphone icon in path | **Med** (genAI script + Track B voices) |
| 10 | Readiness meter movement | ExamPro | Per-session delta on an exam-readiness score; cert-prep native framing | **Low** |
| 11 | Leagues / quests / chests | Duolingo | Weekly leagues, quest chests with fill animations | **High** (skip until scale) |
| 12 | Paid voice AI tutor | Duolingo Max | Real-time voice conversation w/ animated character; $168/yr tier anchor | **High** (Track C) |

---

# TRACK B — TTS replacement for expo-speech (robot voice)

Context: ~230 lessons × ~10k chars ≈ **2.3M chars** (≈ 14 min each; ~900–1,000 chars ≈ 1 spoken minute), plus cheat sheets (~+0.4M) → ~2.7M chars one-time; ongoing updates + dynamic reads.

## Comparison table

| Provider / model | $ per 1M chars | Streaming | Quality reputation | Expo/RN path |
|---|---|---|---|---|
| **ElevenLabs Multilingual v2 / v3** | **~$100** (API: $0.10/1k) (official: https://elevenlabs.io/pricing/api) | Yes (HTTP chunked + WebSocket) | Top of blind-test leaderboards — v3 Elo ~1178, the reference standard (https://ocdevel.com/blog/20250720-tts) | Pre-gen MP3 → CDN → expo-audio |
| **ElevenLabs Flash v2.5** | **~$50** (API: $0.05/1k) | Yes; **~75ms model latency**, 32 langs (https://elevenlabs.io/blog/meet-flash, https://elevenlabs.io/docs/overview/models) | Very good; slightly less expressive than v2/v3 | Same |
| **OpenAI gpt-4o-mini-tts** | **~$15** ($0.60/1M text tokens + $12/1M audio tokens ≈ **$0.015/min**) (https://community.openai.com/t/understanding-gpt-4o-mini-tts-pricing-input-characters-cost/1151816, https://texttolab.com/blog/openai-tts-pricing) | Yes (streamed response) | Big 2025 upgrade; **steerable via `instructions`** ("warm, teacherly, unhurried") — unique at this price | Pre-gen or on-demand; OpenAI-compatible API |
| OpenAI tts-1 / tts-1-hd | $15 / $30 | Yes | Good/very good, not steerable | Same |
| **Azure Neural TTS** | **$16** standard, $22 HD; commitment tiers to **$7.50**; **F0 free tier = 500k chars/mo** (https://azure.microsoft.com/en-us/pricing/details/speech/, https://texttolab.com/blog/azure-text-to-speech-pricing) | Yes (SDK/WebSocket) | Solid corporate-grade; rarely called "delightful" | Pre-gen MP3 → CDN |
| **PlayHT (Play 3.0 mini)** | Subscription-based: Creator $19/mo ≈ 250k chars; Pro $49; Unlimited $99/mo (https://voice.ai/hub/tts/play-ht-pricing/, https://play.ht/news/introducing-play-3-0-mini/) | Yes; 143ms TTFB | Good; company pivoting to PlayAI voice-agent focus — platform-risk flag | Pre-gen |
| **Kokoro-82M (self-host — pod already running)** | **~$0 marginal** | Yes (chunked; OpenAI-compatible `/v1/audio/speech` servers) | **#1 open-weight on TTS Arena** — Elo ~1,056–1,059 vs ElevenLabs v3 ~1,178; briefly #1 overall vs 467M–1.2B param models. Weakness: flat emotional range, no cloning (https://ocdevel.com/blog/20250720-tts, https://reviewnexa.com/kokoro-tts-review/, https://www.lavivienpost.com/comparison-of-text-to-speech-tts-models/) | Pre-gen via existing automatos-voice pod |

**Kokoro self-host economics:** 82M params, <1GB weights, 2–3GB VRAM in use; up to **210x real-time on an RTX 4090**, ~36x on a free-tier T4; an A100 ($1.04/hr on commodity clouds) sustains ~3.6B chars/mo (https://www.spheron.network/blog/deploy-open-source-tts-gpu-cloud-2026/, https://www.arunbaby.com/speech-tech/0062-self-hosting-tts-production-economics/). Rendering the entire 2.7M-char Academy library ≈ ~43 audio-hours ≈ **~1–2 GPU-hours ≈ under $2**. Break-even vs APIs is ~5M chars/mo — irrelevant here since the pod already exists.

## Expo/RN integration path
- **Pre-generated (recommended for lessons):** server renders MP3/AAC per lesson → object storage/CDN → `expo-audio` plays the remote URL (progressive download; no native streaming work needed). Background + lock-screen playback requires: config plugin (FOREGROUND_SERVICE on Android), `setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true, interruptionMode: 'doNotMix' })`, and `setActiveForLockScreen()` on Android (without it audio dies after ~3 min). Does NOT work in Expo Go — needs a dev/EAS build (https://docs.expo.dev/versions/latest/sdk/audio/, https://github.com/expo/expo/discussions/28068). `react-native-track-player` remains the fallback for richer media-session control (https://medium.com/@gionata.brunel/implementing-react-native-track-player-with-expo-including-lock-screen-part-1-ios-9552fea5178c).
- **On-demand dynamic text:** for short cheat-sheet snippets, request full MP3 and play (1–3s wait acceptable). For long dynamic reads, true chunked streaming needs `react-native-audio-api` (SW Mansion) or `expo-audio-stream`-class libs playing PCM chunks (https://docs.swmansion.com/react-native-audio-api/, https://github.com/mykin-ai/expo-audio-stream). Avoid over-engineering: pre-gen covers 95% of Academy's use.

## Cost math at Academy scale (2.7M chars library)
| Option | One-time library | Ongoing (est. 100–300k chars/mo updates + dynamic) |
|---|---|---|
| ElevenLabs Multilingual v2 | **~$270** | $10–30/mo (or Creator $22/mo = 220k chars incl.) |
| ElevenLabs Flash v2.5 | ~$135 | $5–15/mo |
| gpt-4o-mini-tts | **~$40** | $2–5/mo (+$0.015/min on-demand) |
| Azure standard | ~$43 | **$0** (F0 free tier 500k/mo covers it) |
| Kokoro pod | **~$2** | ~$0 |

## Recommendations
**(a) Pre-generated lesson audio (quality-first):** **ElevenLabs Multilingual v2 (or v3 for max expressiveness), ~$270 one-time for the whole library, regenerate deltas only.** It is the audience-perceived quality ceiling (the Blinkist-vs-Headway reviews prove users *feel* narration quality), the cost is one-time and amortized over every listener, and one consistent branded "Coach voice" across 230 lessons is a product asset. Value alternative at 85–90% of the quality for 15% of the price: **gpt-4o-mini-tts with a style instruction** (~$40 one-time).
**(b) On-demand dynamic text:** **gpt-4o-mini-tts** — $0.015/min, streaming, steerable tone, trivial integration. **Bonus:** the existing automatos-voice Kokoro pod exposes the same OpenAI-compatible `POST /v1/audio/speech` shape, so ONE client integration serves both: point at OpenAI for premium, at the pod for free-tier/fallback at $0. Any of these obliterates expo-speech — even the $0 Kokoro pod is a top-tier open-weight voice.

---

# TRACK C — Live voice AI tutor stacks (paid "talk to your tutor")

## Comparison

| Stack | $/min all-in (realistic) | Latency | Tool-calling / RAG (course grounding) | Web SDK | **React Native** |
|---|---|---|---|---|---|
| **Retell AI** | $0.07–0.08 voice engine + LLM $0.003–0.06 → **~$0.08–0.14/min** app calls (no telephony) (https://www.retellai.com/pricing, https://zeeg.me/en/blog/post/retell-ai-pricing-guide) | ~620ms avg, sub-800ms claimed (https://trillet.ai/blogs/voice-ai-latency-benchmarks) | Built-in Knowledge Base (auto-RAG: chunks→embeds→retrieves per turn, no prompt changes) + function calling + **custom-LLM WebSocket** for full grounding control (https://docs.retellai.com/build/knowledge-base, https://docs.retellai.com/api-references/llm-websocket) | retell-client-js-sdk | **NO — "React Native is not supported at this time"** (https://docs.retellai.com/deploy/web-call) |
| **OpenAI Realtime API** | gpt-realtime-2.1: $32/1M audio-in, $64/1M audio-out (official) → measured **$0.06–0.11/min** with caching; **mini: $0.02–0.05/min**; uncached long calls $0.18–0.46/min (https://developers.openai.com/api/docs/pricing, https://hackernoon.com/openai-realtime-api-pricing-in-2026-real-world-data-from-4000-measured-sessions) | first turn 500–1,200ms; then 300–600ms (https://www.forasoft.com/blog/article/openai-realtime-api-webrtc-sip-websockets-integration) | Native function calling; RAG = your own tools (platform retrieval already exists) | WebRTC/WS | **No official SDK** — openai-agents-js explicitly doesn't support RN (https://github.com/openai/openai-agents-js/issues/133); community Expo examples via react-native-webrtc (https://github.com/thorwebdev/expo-webrtc-openai-realtime) — DIY |
| **ElevenLabs Agents (Conversational AI)** | **$0.08/min** overage (burst $0.16); bundles: Creator $22/mo=275 min, Pro $99=1,238, Business $990=12,375 min (~$0.08/min); + LLM billed separately (~$0.01–0.03/min) → **~$0.09–0.11/min all-in** (https://elevenlabs.io/pricing/agents, https://help.elevenlabs.io/hc/en-us/articles/29298065878929-How-much-does-ElevenAgents-cost) | Flash TTS ~75ms; RAG adds ~250ms; sub-second turns (https://elevenlabs.io/blog/engineering-rag) | **Built-in knowledge base + RAG** (auto-index, per-doc auto/prompt modes) + client & server tools + custom-LLM option (https://elevenlabs.io/docs/eleven-agents/customization/knowledge-base/rag) | @elevenlabs/react (identical API) | **YES — first-class: `@elevenlabs/react-native`, built FOR Expo (LiveKit WebRTC; dev builds, not Expo Go)** (https://elevenlabs.io/docs/eleven-agents/libraries/react-native, https://expo.dev/blog/how-to-build-universal-app-voice-agents-with-expo-and-elevenlabs) |
| **Vapi** | $0.05/min orchestration + STT/TTS/LLM → **real-world $0.14–0.33/min** (basic stack ~$0.14–0.15; premium voices ~$0.25–0.33) (https://vapi.ai/pricing, https://telnyx.com/resources/vapi-pricing, https://www.tabbly.io/blogs/vapi-review-2025-features-pricing-pros-cons) | Good (varies by stack) | Query tool over KBs + custom-KB webhook (bring your own retrieval) (https://docs.vapi.ai/knowledge-base) | Web SDK | RN SDK exists (`@vapi-ai/react-native`, Daily WebRTC) but **requires `newArchEnabled=false`** — clashes with modern Expo defaults (https://github.com/VapiAI/client-sdk-react-native) |

## Recommendation: **ElevenLabs Agents** for the mobile-first paid tutor
- It is the **only stack with a first-class, Expo-native React Native SDK** (WebRTC via LiveKit, API identical to the web React SDK → one conversation component for the web SPA and the mobile app).
- Built-in RAG over the course corpus (upload track content as knowledge base; ~250ms overhead) + client/server tool calling into platform APIs for progress-aware answers; custom-LLM escape hatch if grounding must run through the platform's own retrieval.
- Voice quality is the whole point of this feature (owner hates robot voices) — ElevenLabs voices are the perceived-quality ceiling.
- **~$0.09–0.11/min all-in.** At a Duolingo-Max-style price anchor ($14/mo annual) with a 60-min/mo cap, COGS ≈ $5.40–6.60/user/mo — healthy margin; overage-metered via the same voice_calls meter pattern.
- **PRD-207 seam note:** the merged Retell webhook seam (token mint + attribution + voice_calls metering + caps) is a *pattern*, not Retell-specific plumbing — and Retell **cannot serve the mobile app at all** (no RN support; a WebView bridge is the only workaround and mic-permission UX in iOS WKWebView is poor). Honest options: (1) keep Retell for the web surface where the seam is armed and accept no native mobile tutor; or (2) point the same mint/meter/webhook seam at ElevenLabs Agents and get web+mobile from one SDK family. For a mobile-first goal, (2) is the defensible choice. Cheapest alternative if cost dominates later: OpenAI Realtime **mini** ($0.02–0.05/min) with a DIY react-native-webrtc client — most engineering, least product polish.

---

# Surprising findings
1. **Quizlet killed Q-Chat** (June 30, 2025) — the first mainstream ChatGPT-API study tutor retreated; no study/cert app besides Duolingo ships an in-app voice tutor. First-mover space in cert prep is open.
2. **The cert-prep incumbents have no real mobile apps** — Tutorials Dojo is web-only; ExamPro has no evidenced native app. "Match or beat any competitor" on mobile in this niche means beating *Duolingo-class* polish, not any actual cert competitor.
3. **Retell — the vendor with the merged seam — explicitly does not support React Native**, while ElevenLabs shipped an Expo-first RN SDK in 2025. The seam's vendor choice and the mobile-first goal are in direct tension.
4. **Kokoro-82M, already running in the automatos-voice pod, is the #1 open-weight voice on TTS Arena** (Elo ~1,056 vs ElevenLabs v3 ~1,178) — the robot-voice problem could be 80% solved this week for ~$2 of GPU time before any vendor decision.
5. **Duolingo's haptic discipline:** exactly one haptic reward in the entire app (session complete), frame-timed to the animation — scarcity is the design principle, not abundance.
6. gpt-4o-mini-tts made steerable narration ("warm, teacherly") essentially free at ~$15/1M chars — a 2025 development that collapses the old price/quality tradeoff for mid-tier TTS.
