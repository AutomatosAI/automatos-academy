# Cross-Vendor · Module 00 — Overview: why provider-agnostic + the landscape

**Type:** orientation (skills track intro; sets up modules 01–04 and the Gen-AI-Leader exam sub-track in 05)

## 📥 Sources to load into NotebookLM
- The track README (this folder) and the S4 Cross-Vendor PRD — the "why" and the module map
- OpenAI Agents SDK docs — https://openai.github.io/openai-agents-python/ (context: what "agent + tools + handoffs" means at OpenAI)
- Google Vertex AI generative-AI overview — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview (context: what a hosted managed platform bundles)
- Ollama — https://ollama.com/ + Hugging Face docs — https://huggingface.co/docs (context: the open-weight side of the landscape)
- Google Cloud "Generative AI Leader" cert page — https://cloud.google.com/learn/certification/generative-ai-leader (context: the one real exam this track preps, covered in module 05)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a smart professional — an architect or tech lead — who can build with one model provider
but wants to reason ACROSS providers. Explain plainly first, then precisely. Cover ONLY: why
provider-agnostic fluency matters (avoiding lock-in; choosing hosted vs open-weight per workload;
cost / capability / data-residency trade-offs; being able to move the SAME app between OpenAI, Google,
and open weights) and a quick map of the landscape — closed hosted APIs (OpenAI, Google Gemini/Vertex)
vs open-weight (Llama, served via Ollama / Hugging Face) — plus where each fits. Make it a decision
lens, not a feature tour. ~8 minutes: open with the strategic "why" (a price or policy shift forces a
swap), one worked scenario (same chatbot, two providers behind one interface), the top 2–3 mistakes
(picking a provider before the workload; ignoring data residency; assuming prompts port 1:1), and a
one-line "remember: pick per workload, keep it portable" takeaway. Stay strictly grounded in the
provided sources; do not invent product names or pricing.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the cross-vendor landscape and why an enterprise wants
provider-agnostic architects. Walk the three families: (1) closed hosted APIs — OpenAI (Responses/Chat
API, Agents SDK) and Google (Gemini on Vertex AI, Agent Builder / Agent Platform); (2) open-weight —
the Llama family, served locally via Ollama or through Hugging Face (Hub, Transformers, Inference);
(3) the portability layer that lets you swap between them. For each, make the DECISION explicit: when
does hosted win (velocity, frontier capability, no ops) vs open-weight (data residency, cost-at-scale,
control, no lock-in)? Preview the four skills modules and the Gen-AI-Leader exam sub-track. Ground
strictly in the sources.
```

## 🎧 Audio — Debate (the judgment call)
```
Two hosts, expert level. Debate the framing that runs through this whole track: "Should an enterprise
standardize on ONE model provider, or stay deliberately multi-provider?" One host argues standardize
(simpler ops, deeper discounts, one skill set, less surface area). The other argues stay portable
(price/policy shifts, data-residency mandates, model-update risk, avoiding lock-in). Converge on a
decision rule: standardize the plumbing, keep the model behind a swappable interface, choose the model
per workload. Ground strictly in the sources; this sets up module 04's anchor debate.
```

## 🤖 Apply it in Automatos
Show the learner the punchline early: in Automatos you don't pick "a provider" for the whole system —
you compose agents and **choose the model provider per agent** (and swap it via config). Frame the
rest of the track as "learn each provider well enough to place it, then wire it as an Automatos agent."
The overview's job is to make the multi-model, provider-per-agent design feel like the obvious end state.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Debate) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
