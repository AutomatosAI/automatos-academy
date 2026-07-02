# AIX · Module 06 — Context: the AI's desk

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"What's a 'context window' and why does everyone care how big it is?"*

## 📥 Sources to load into NotebookLM
- The m06 lesson body (from the AIX track content / PRD)
- A neutral plain-language explainer of the context window (a maker's docs glossary) *(verify reachable)*
- `automatos-gitbook/chat/README.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner who keeps hearing "context" and "context window" and "it ran out of context"
and has no idea what any of it means. No technical background. Explain plainly first, then name the
term. Cover ONLY: what context is and why the SIZE of the context window matters. The plain idea:
"context" is everything the AI can see RIGHT NOW while answering — your question plus whatever you've
shown it in this conversation. Picture a DESK: the AI can only work with what fits on the desk in
front of it. The "context window" is just how big that desk is. A small desk holds a short chat; a
big desk holds a whole long document or a long back-and-forth. WHY size matters, in beginner terms:
(1) if what you need it to consider doesn't fit on the desk, it can't use it — it only sees what's
on the desk; (2) in a long conversation, early things can slide off the edge of the desk and be
"forgotten" — that's what "running out of context" means; (3) bigger desk = you can hand it more at
once (a full contract, a long thread) and get answers that account for all of it. The catch, said
plainly: the AI has NO memory between separate conversations unless you deliberately give it one
(that's a later idea) — each chat starts with a fresh, empty desk. ~7 minutes: open with "imagine
the AI works at a desk and can only use what's on it," the three why-size-matters points via the
desk, the 2–3 confusions (thinking it remembers everything you ever said — it doesn't across
sessions; thinking a bigger desk makes it smarter — it makes it able to consider MORE, not think
better; thinking pasting a huge document is always free — bigger desks cost more), close with
"Context is the desk. Bigger desk, more it can hold at once. Empty desk each new chat." Ground
strictly in the sources.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for a beginner. Teach the context window via the desk analogy: context =
what the AI can see while answering (your prompt + the current conversation + anything you paste or
upload into it); the context window = the size of that desk. Cover why size matters — fitting a whole
long document or thread so answers account for all of it, and the flip side that in very long chats
the earliest content can fall off the desk ("running out of context"). Be clear and reassuring about
the no-memory-between-sessions point: a new conversation is a clean desk unless you deliberately give
the AI a memory (flagged as a later idea, and as what knowledge bases and memory features solve).
Connect gently to Module 05: because the desk contents are measured in tokens, a bigger desk holding
more also costs more. End with the practical beginner habit: put the important stuff in the same
conversation, and don't assume it remembers last week. Ground strictly in the sources.
```

## 🤝 The Automatos peek
Two Automatos ideas you'll now recognise instantly: it shows you roughly how full the "desk" is in a
chat, and — because the desk is wiped each new conversation — it gives agents a separate KNOWLEDGE
store and a MEMORY so the important things don't have to be re-pasted every time. The next module is
exactly that: how the AI gets to know YOUR material.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README
