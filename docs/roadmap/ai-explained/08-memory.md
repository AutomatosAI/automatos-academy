# AIX · Module 08 — Memory: does it remember me?

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"I told it last week — why doesn't it remember? And when it DOES remember, how?"*

## 📥 Sources to load into NotebookLM
- The m08 lesson body (from the AIX track content / PRD)
- A maker's plain "memory" feature explainer *(verify reachable)*
- `automatos-gitbook/activity/memory.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner who's confused that the AI forgot everything from last week's chat — and also a
bit unnerved when a different AI seemed to remember them. No technical background. Explain plainly
first, then name the term. Build directly on Module 07's desk: context is what's ON the desk right
now, and each new conversation starts with a CLEAN desk — that's why it "forgot." Cover ONLY: how
AIs remember across conversations when they do. The plain idea: MEMORY is a notebook kept BESIDE the
desk — during your chats, important things (your name, your preferences, decisions you made) get
written into the notebook, and at the start of each new conversation the relevant notes are put back
on the desk. So it isn't magic and it isn't creepy: it's saved notes, retrieved. The two kinds, in
plain words: SHORT-TERM memory is the desk itself (this conversation only); LONG-TERM memory is the
notebook (persists across conversations). And the crucial difference from Module 09's coming idea:
memory is what the AI learned about YOU from your chats; your DOCUMENTS (next module) are the
material you deliberately handed it — notebook vs binder. The control question every beginner should
ask of any AI product: can I SEE the notebook, EDIT it, and DELETE from it? Good tools say yes. ~7
minutes: open with "it forgot because the desk gets wiped — remembering needs a notebook," the
notebook-beside-the-desk analogy, short-vs-long-term in one line each, the 2–3 confusions (thinking
it secretly remembers everything — without a memory feature it remembers nothing across chats;
thinking memory and uploaded documents are the same — notebook vs binder; thinking you can't control
it — you should be able to view/edit/delete), close with "The desk gets wiped; the notebook
persists. And a good notebook is one you can open." Ground strictly in the sources.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for a beginner. Teach AI memory on top of the desk analogy: why AIs
forget by default (clean desk per conversation), and how memory features fix it — notes captured
from your chats into a persistent store, retrieved back onto the desk when relevant. Distinguish
short-term (the current conversation — the desk) from long-term (saved across conversations — the
notebook), and memory-about-you vs your uploaded documents (notebook vs binder — the binder is next
module). Spend real time on control and comfort: a trustworthy memory is visible, editable and
deletable; a beginner should know to look for that in any AI product, and to expect memories to be
theirs to manage. Reassure on the creepiness worry by demystifying the mechanism — it's retrieval of
saved notes, not surveillance. End with the takeaway: forgetting is the default; remembering is a
feature; control is the standard to demand. Ground strictly in the sources.
```

## 🤝 The Automatos peek
Automatos agents keep exactly this notebook: a short-term memory for the conversation and a
long-term one that persists — and the platform passes the control test, with a Memory tab where you
can browse, search, edit and permanently delete what's been remembered. The notebook is real, and
it's yours to open.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README
