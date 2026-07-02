# AIX · Module 02 — Why are there so many models?

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"GPT, Claude, Gemini, Llama… I'm completely lost."*

## 📥 Sources to load into NotebookLM
- The m02 lesson body (from the AIX track content / PRD)
- Google Generative AI Leader exam guide — the model-families material *(beginner-toned)*:
  https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf
- A current model-family overview from a neutral source (e.g. Hugging Face models hub intro) *(verify reachable)*
- `automatos-gitbook/settings/models.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner drowning in names — GPT, Claude, Gemini, Llama, and a dozen version numbers.
No technical background. Explain plainly first, then name the term. Cover ONLY: why there are so
many AI models and how to make sense of the list without memorising it. The plain framing: a "model"
is one specific trained AI brain; different companies build their own (OpenAI makes the GPT family,
Anthropic makes Claude, Google makes Gemini, Meta makes Llama), and each company ships several
SIZES — a big flagship that's smartest but slower and pricier, and smaller ones that are faster and
cheaper for simple jobs — plus new VERSIONS over time as they improve. So the scary list is really
just: a few makers × a few sizes × versions. The only three questions a beginner ever needs: is it
BIG or SMALL (smart-and-costly vs fast-and-cheap), is it RECENT (newer usually better), and does it
fit my job. Analogy: cars — different manufacturers, each with a small city car and a big estate;
you don't need to know every trim to pick one that fits your journey. ~7 minutes: open with "the
list looks huge; the pattern behind it is tiny," the makers-×-sizes-×-versions frame, the 2–3
confusions (thinking a higher version number from one maker beats a different maker; thinking bigger
is always better — often the small one is plenty; thinking you must pick once and forever), close
with "A few makers, a few sizes, always improving. That's the whole map." Ground strictly in the
sources; name real families but assert no single winner (that's Module 04).
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for a beginner. Teach the model landscape as makers × sizes × versions:
what a "model" is (one trained AI brain), who the main makers are (OpenAI/GPT, Anthropic/Claude,
Google/Gemini, Meta/Llama — named neutrally), why each maker ships a range of sizes (the smart-slow-
pricey flagship vs the fast-cheap smaller ones), and why versions keep coming. Give the beginner the
three-question filter — big or small, recent, fits the job — so the endless list becomes a shortlist.
Use the car-manufacturer analogy throughout. Be explicit that this module does NOT crown a winner —
"which is best for me" is its own conversation (Module 04). End with reassurance: you can change
your mind anytime; picking a model is a Tuesday decision, not a marriage. Ground strictly in the
sources.
```

## 🤝 The Automatos peek
Because no single model wins every job, Automatos doesn't lock you to one — in Settings you can
choose which model each agent uses (and bring your own account key). A cheap, fast model for simple
replies; a big one for the hard thinking. You met the map here; Automatos is one place that lets you
use all of it.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README
