# Cross-Vendor · Module 02 — Google Gemini / Vertex AI

**Type:** skills (no exam here — the Gemini/Vertex *skills* live in this module; the Google Cloud "Generative AI Leader" *exam* is module 05)

## 📥 Sources to load into NotebookLM
- The module lesson body (from the track content / PRD)
- Google Vertex AI generative-AI overview — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview (Gemini models, Vertex AI Studio, Model Garden, grounding/RAG, Agent Builder / Agent Platform, partner models)
- Vertex AI Model Garden docs — partner models (Claude / Llama / Mistral on Vertex) from the same generative-AI docs tree
- Grounding + RAG on Vertex — the grounding/RAG pages under the Vertex generative-AI docs
- Google Cloud "Generative AI Leader" cert page — https://cloud.google.com/learn/certification/generative-ai-leader (context: the exam this feeds into, module 05)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional comfortable with LLM APIs who is new to Google's stack. Explain plainly first,
then precisely. Cover ONLY: the Gemini model family (Pro vs Flash — capability vs latency/cost) and
how you use it on Vertex AI — Vertex AI Studio for prototyping, Model Garden (including PARTNER models
like Claude, Llama, and Mistral served on Vertex), grounding + RAG APIs, and Agent Builder / Agent
Platform for agents. Emphasize the one thing that surprises people: Vertex is a managed platform that
hosts models from multiple vendors, not just Google's. ~8 minutes: open with why an enterprise picks
Vertex (managed, grounded, multi-vendor Model Garden), one worked example (a grounded Gemini call on
Vertex answering from your data), the top 2–3 mistakes (Pro-vs-Flash for the wrong reason; thinking
Vertex = Gemini only; skipping grounding and hallucinating), and a one-line "remember…" takeaway.
Teach CURRENT names (Agent Platform / Gemini Enterprise Agent Platform, Agent Studio). Stay strictly
grounded in the sources.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach building on Google Gemini / Vertex AI. Cover: the Gemini
family (Pro vs Flash and how to choose); Vertex AI Studio (prompt/prototype); Model Garden and the big
idea that it serves PARTNER models (Claude, Llama, Mistral) alongside Gemini — so "on Vertex" doesn't
mean "Gemini only"; grounding and the RAG APIs (answering from your own data, with citations); and
Agent Builder / Agent Platform for building agents. For each, make the decision explicit — Pro vs
Flash by workload; grounded vs ungrounded; Gemini vs a partner model in Model Garden. Use CURRENT
product names (the exam guide was refreshed for the rebrand). Ground strictly in the sources.
```

## 🎧 Audio — Debate (the judgment call)
```
Two hosts, expert level. Debate: "For a Google-Cloud enterprise, standardize on Vertex AI as the model
platform — or call model providers directly?" One host argues Vertex (managed ops, IAM/VPC controls,
data-residency options, grounding built in, and Model Garden means you can even run Claude or Llama
THROUGH Vertex). The other argues direct provider APIs (fewer layers, latest features first, no cloud
lock-in, easier multi-cloud portability). Converge on a rule: if you're already on Google Cloud and
need governance + grounding, Vertex earns its keep — but keep the model call behind an interface so
you're not wedded to one platform. Ground strictly in the sources.
```

## 🤖 Apply it in Automatos
Wire an Automatos agent that uses **Gemini on Vertex** as its model provider, with grounding pointed at
a workspace knowledge source — the RAG shape Automatos already uses, now backed by Vertex grounding.
Then show the multi-model point: because Automatos selects the provider per agent, one agent can run on
Gemini/Vertex while a sibling agent runs on OpenAI or an open-weight endpoint — same platform, different
engines per job.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Debate) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
