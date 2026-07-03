# AIX · Module 10 — Knowledge graphs

**Type:** Skills track (no exam) · Lane: Foundations · Kills: *"Everyone says 'knowledge graph' — what actually is it, and how would I set one up?"*

## 📥 Sources to load into NotebookLM
- The m08 lesson body (from the AIX track content / PRD)
- A neutral plain-language "what is a knowledge graph" explainer *(verify reachable)*
- `automatos-gitbook/knowledge/knowledge-graph.md` (for the peek)

## 🎬 Video (~7 min) — NotebookLM → Video → Customize
```
Audience: a beginner who's heard "knowledge graph" thrown around and pictures something complicated.
No technical background. Explain plainly first, then name the term. Cover ONLY: what a knowledge
graph is and why it helps an AI. Build on Module 09: giving the AI your documents is great, but a
pile of documents is just a pile — the AI can find a page, but it doesn't automatically see how
things CONNECT. A knowledge graph is a map of the CONNECTIONS between the things in your world:
this customer placed that order; that order contains these products; this product comes from that
supplier. Picture a detective's cork-board — photos (people, orders, products) with string joining
the ones that relate. Why it helps: some questions can't be answered from a single page — "which
suppliers are affected if this product is recalled?" needs the AI to FOLLOW the connections, not
just find one document. A knowledge graph lets it join the dots. How you "set one up", in beginner
terms: you usually don't draw it by hand — modern tools READ your documents and build the map of
people/things and their links automatically; your job is to feed it good material (Module 09 again).
~7 minutes: open with "documents are a pile; a knowledge graph is the map of how they connect," the
cork-board analogy, one join-the-dots question a plain document search would miss, the 2–3
confusions (thinking you must build it by hand — tools extract it for you; thinking it replaces your
documents — it sits on top of them; thinking it's only for big companies — it helps any connected
data), close with "A pile of facts, plus the strings between them. That's a knowledge graph." Ground
strictly in the sources.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, warm and plain, for a beginner. Teach knowledge graphs as the layer of CONNECTIONS on top
of your documents: entities (the people, orders, products, suppliers) and the relationships between
them, built — usually automatically by tools reading your material — into a map the AI can follow.
Use the detective cork-board analogy. Make the payoff concrete with a multi-hop question that a plain
one-page search can't answer but a graph can (recall impact, "who is connected to what"). On "how do
I set one up," reassure: for a beginner it's less about drawing and more about feeding good documents
to a tool that extracts the graph for you, then asking questions that follow the links. Position it
honestly as an upgrade to RAG (Module 09), not a replacement, and as useful for anyone with
connected information, not just enterprises. Ground strictly in the sources.
```

## 🤝 The Automatos peek
Automatos builds this for you: as you add documents, it automatically extracts a knowledge graph —
the people, things and links — so agents can answer the join-the-dots questions, not just find a
page. You don't draw the cork-board; the platform reads your material and strings it together. The
map you just learned about is a feature you'd get without lifting a pen.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video (~7 min) and tune the runtime
- [ ] Generate the Deep Dive audio
- [ ] Download → CDN upload (slot-id filenames) → `register-videos.mjs --publish`
- [ ] Tick this module off in the track README
