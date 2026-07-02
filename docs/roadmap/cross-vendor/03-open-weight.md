# Cross-Vendor · Module 03 — Open-weight: Llama / Ollama / Hugging Face

**Type:** skills (no exam — open-weight has no proctored certification by nature; pure skills content)

## 📥 Sources to load into NotebookLM
- The module lesson body (from the track content / PRD)
- Ollama — https://ollama.com/ + repo https://github.com/ollama/ollama (local serving; the OpenAI-compatible endpoint)
- Hugging Face docs — https://huggingface.co/docs (the Hub, Transformers, Inference)
- Llama model cards on Hugging Face (licensing reality — read the actual license terms)
- OpenAI Agents SDK docs — https://openai.github.io/openai-agents-python/ (context: the OpenAI-compatible API shape you'll point at a local model)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: a professional who has only used hosted LLM APIs and has never run a model themselves.
Explain plainly first, then precisely. Cover ONLY: why open weights matter (control, data residency,
cost-at-scale, offline/air-gapped) and how to actually use them — the Llama family and its licensing
reality (read the license, it's not unconditionally "open"), running a model LOCALLY with Ollama, and
Hugging Face as the ecosystem (the Hub to find models, Transformers to run them in code, Inference to
call hosted ones). Land the practical trick: Ollama exposes an OpenAI-compatible endpoint, so your
existing OpenAI-style code can call a local model with a base-URL swap. ~8 minutes: open with the "why
open weights" cases, one worked example (pull a model with Ollama, call it behind an OpenAI-compatible
endpoint), the top 2–3 mistakes (assuming Llama is unconditionally free to use; ignoring hardware/VRAM
limits; thinking local = production-ready without ops), and a one-line "remember…" takeaway. Stay
strictly grounded in the sources.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach open-weight literacy end to end. Part 1 — WHY open weights:
control, data residency, cost-at-scale, offline. Part 2 — the Llama family and LICENSING reality (what
the community license actually permits and where it constrains you — read the model card). Part 3 —
Ollama: pull and run a model locally, and the OpenAI-compatible endpoint that lets existing code call it
with a base-URL change. Part 4 — Hugging Face: the Hub (discover/version models), Transformers (run in
Python), and Inference (hosted calls). For each, make the decision explicit — local vs hosted-inference;
which model size for the hardware; open-weight vs a managed API for THIS workload. Ground strictly in
the sources.
```

## 🎧 Audio — Debate (the judgment call)
```
Two hosts, expert level. Debate: "Self-host an open-weight model, or just call a hosted API?" One host
argues open-weight/self-host (data never leaves your boundary, predictable cost at scale, no per-token
vendor bill, full model control, works offline). The other argues hosted APIs (no GPU ops, frontier
quality out of the box, autoscaling, someone else patches it). Force them to price the hidden costs of
self-hosting (GPUs, MLOps, eval, on-call) against the hidden costs of hosted (per-token at scale, data
egress, lock-in). Converge on a workload rule: high-volume / residency-bound / cost-sensitive leans
open-weight; spiky / frontier-quality / small-team leans hosted. Ground strictly in the sources.
```

## 🤖 Apply it in Automatos
Wire an Automatos agent whose model provider is a **local open-weight model served by Ollama**, reached
through its OpenAI-compatible endpoint — the agent config just points at the local base URL. Show the
strategic payoff for module 04: the SAME Automatos agent can run on OpenAI, Gemini/Vertex, or this
local Ollama endpoint purely by switching the provider in config — data-residency and cost-at-scale
handled by choosing open-weight for the agents that need it.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive (+ Debate) audio
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
