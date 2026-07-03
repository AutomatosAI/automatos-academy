# AIX · Module 00 — What is AI, really?

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"What even is this thing everyone's talking about?"*

## 📥 Sources to load into NotebookLM
- The m00 lesson body (from the AIX track content / PRD)
- Google Generative AI Leader exam guide — the "Fundamentals of gen AI" section (genuinely
  beginner-toned): https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf
- Anthropic — an "Introduction to Claude" / what-is-Claude overview page *(verify reachable)*
- `automatos-gitbook/about.md` (for the closing peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a complete beginner who keeps hearing "AI" and "ChatGPT" and has no idea what's actually
under the hood — smart, curious, zero technical background, allergic to hype. Explain plainly first,
then name the term. Cover ONLY: what today's AI actually is. The core idea in one breath: it's a
computer program that read an enormous amount of human writing and got extremely good at predicting
what words come next — and it turns out that skill is powerful enough to write, summarise, answer,
translate and explain like a knowledgeable person. (The kind of AI everyone means right now is a
"large language model" — now you can forget the phrase.) Then the four things a beginner must
internalise: (1) it's a brilliant, tireless new hire, not an all-knowing oracle — amazing output,
zero guarantee, so anything important gets checked; (2) it sometimes states wrong things with total
confidence — this is called "hallucination", it's normal and expected, not a scandal; (3) it only
knows what it read while being trained, plus whatever YOU show it right now — it does not know
today's news or your private information unless you give it; (4) it is already good enough to do
real work — this is not science fiction. Use ONE running example: asking it to write a birthday
message, watching it nail the tone, then catching it invent a detail you never gave it. ~7 minutes:
open with "you've heard 'AI' a hundred times this week — here's what it actually is," the four
points via the example, the 2–3 things beginners get wrong (thinking it's a search engine that
looks things up; thinking one wrong answer means it's useless; thinking you must be technical to
use it), close with "It's a well-read, eager new hire. Never an oracle. That one idea carries the
whole course." Ground strictly in the sources; no invented statistics, no vendor pitches.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, teaching an absolute beginner. Every term of art arrives AFTER its
everyday meaning. Cover: what a language model is at beginner level (it learned patterns from huge
amounts of text and predicts likely next words — no fact database, no true "understanding"
guaranteed); why that still makes it brilliant at drafting, summarising, explaining and answering
from material you give it; hallucination as a designed-around property, not a bug to be shocked by;
the knowledge boundary (what it was trained on vs what you paste in — it knows nothing about your
world until you show it); and an honest capability line — where it beats a person (speed, patience,
breadth, first drafts) and where a person still wins (accountability, taste, current facts, the
final call). End on the mental model that carries the whole track: a capable new hire — brief it,
check it, never blame it, manage it. Ground strictly in the sources; invent no numbers.
```

## 🤝 The Automatos peek
Everything in this course is something you can try for free in Automatos — you just talk to it in
plain language, the same way you'd brief that new hire. Later modules show where the knobs, the
memory and the tools live; for now, know that the "well-read new hire" you just met is exactly what
you'll be working with.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README
