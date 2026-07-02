# AIX · Module 07 — Teaching AI your stuff (RAG)

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"How does it know about MY things — my prices, my policies?"*

## 📥 Sources to load into NotebookLM
- The m07 lesson body (from the AIX track content / PRD)
- A neutral plain-language explainer of RAG (a maker's docs) *(verify reachable)*
- `automatos-gitbook/knowledge/README.md` + `automatos-gitbook/knowledge/documents.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner who's realised the AI doesn't know their business and wonders how to fix that.
No technical background. Explain plainly first, then name the term. Cover ONLY: how you give an AI
knowledge of YOUR specific stuff. Recall from Module 00: the AI only knows what it was trained on
plus what you show it — so out of the box it knows nothing about your prices, your policies, your
products. The fix in plain words: you give it a folder of your OWN documents, and when you ask a
question it first LOOKS THINGS UP in your documents and then answers using what it found — and it
can show you which document it got the answer from. (This is called RAG — retrieval-augmented
generation — and now you can forget the phrase.) Analogy: instead of asking a smart friend to answer
from memory, you hand them your company binder first and say "answer from this." Why it's a big
deal: answers become grounded in YOUR truth, not the AI's general guesses, and you can check the
source — which is also how you cut down on those confident-but-wrong answers from Module 00. The one
rule that makes or breaks it: garbage in, garbage out — an out-of-date document makes a confidently
wrong assistant, so keep the folder current. ~7 minutes: open with "it doesn't know your business —
until you hand it your binder," the look-it-up-then-answer idea with the friend-and-binder analogy,
the 2–3 confusions (thinking you must retrain the AI — no, you just give it documents; thinking it
reads your whole company automatically — only what you add; thinking stale documents are harmless —
they're worse than none), close with "Give it your documents; it answers from them and cites them.
Keep them current." Ground strictly in the sources.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for a beginner. Teach retrieval-augmented generation without the jargon
until the end: the AI's knowledge boundary (Module 00 recap), the fix of giving it your own
documents so it looks them up before answering, and the two payoffs — answers grounded in your real
material and citations you can verify (which directly reduces hallucination). Use the smart-friend-
plus-binder analogy. Cover the make-or-break discipline: curate the folder, keep it current, don't
dump stale drafts. Reassure that this needs no technical skill — it's uploading documents, not
programming — and that it's the single biggest upgrade from "generic AI" to "an assistant that knows
my world." Name RAG once, plainly, and move on. Ground strictly in the sources.
```

## 🤝 The Automatos peek
This is exactly what a Automatos *knowledge base* is: you upload your documents once, and your agents
answer from them with citations back to the source — the generic-vs-grounded difference, made
permanent. It's the same "hand it your binder" idea you just learned, with an upload button.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README
