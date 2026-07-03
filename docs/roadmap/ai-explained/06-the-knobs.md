# AIX · Module 06 — The knobs: temperature, tokens & parameters

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"What do all these settings mean — and do I need to touch them?"*

## 📥 Sources to load into NotebookLM
- The m05 lesson body (from the AIX track content / PRD)
- A neutral plain-language explainer of temperature/tokens (a maker's docs glossary) *(verify reachable)*
- `automatos-gitbook/agents/configuration.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner who's seen sliders and settings like "temperature" and "max tokens" and felt
they must be doing it wrong by ignoring them. No technical background. Explain plainly first, then
name the term. Cover ONLY the two or three knobs a beginner will ever meet, and the reassurance that
the defaults are almost always fine. TEMPERATURE: how adventurous the AI is — low means safe,
consistent, predictable answers (good for facts, code, policy); high means more creative and varied
(good for brainstorming, marketing lines). Analogy: a "play it safe ↔ surprise me" dial. TOKENS: the
AI reads and writes in little chunks of words called tokens — roughly, a token is about three-
quarters of a word; "max tokens" just caps how long the answer can be, and tokens are also what you
pay by. So "it costs per token" simply means "you pay by the amount of text in and out." The other
knobs (top-p and friends) are variations on the temperature idea — a beginner can safely leave them.
The honest headline: for almost everything, the defaults are good; the ONE knob worth knowing is
temperature, and only when an answer feels too robotic (turn it up) or too random (turn it down). ~7
minutes: open with "you've been ignoring the settings and that's been the right call," temperature
via the dial analogy, tokens via "chunks of words you pay by," close with "One knob matters —
temperature — and only sometimes. Leave the rest." Ground strictly in the sources; give no exact
per-token prices (they change).
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for a beginner intimidated by settings. Demystify the parameters: what
temperature does (the safe↔creative dial and when to move it — down for facts/consistency, up for
ideas/variety), what tokens are (chunks of text, ~¾ of a word, the unit you're billed by and the
unit "max length" is measured in), and a one-line "you can ignore these" on the rest (top-p etc. as
cousins of temperature). Keep hammering the reassurance: defaults are tuned well; a beginner rarely
needs to touch anything, and temperature is the only knob worth a deliberate choice. Explain the
practical link — because you pay by tokens, shorter prompts and answers cost less — without quoting
prices. End with the calm takeaway: settings are for fine-tuning, not a test you're failing by
leaving them alone. Ground strictly in the sources.
```

## 🤝 The Automatos peek
When you build an agent in Automatos, these same knobs live on its configuration — model,
temperature, a length limit. You can leave them at sensible defaults and never think about it, or
nudge temperature down for an agent that must be precise. Now the settings screen won't look like a
cockpit — it's two or three familiar dials.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README
