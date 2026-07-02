# Cross-Vendor · Module 04 — Cross-provider portability + a portability build

**Type:** skills (the judgment module — carries the track's **anchor Debate**; capstone build, no exam)

## 📥 Sources to load into NotebookLM
- The module lesson body (from the track content / PRD) — the cost/capability/latency/data-residency matrix and the portability-adapter pattern
- OpenAI platform docs — https://platform.openai.com/docs/ (the OpenAI API shape most adapters standardize on)
- OpenAI Agents SDK docs — https://openai.github.io/openai-agents-python/ (agent/tool parity across providers)
- Google Vertex AI generative-AI overview — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview (the hosted-platform side of the matrix)
- Ollama — https://ollama.com/ + Hugging Face docs — https://huggingface.co/docs (the open-weight side + the OpenAI-compatible endpoint that makes swapping cheap)

## 🎬 Video Overview prompt (~8 min) — NotebookLM → Video → Customize
```
Audience: an architect deciding how to run LLM workloads across providers without lock-in. Explain
plainly first, then precisely. Cover ONLY: (1) the DECISION FRAMEWORK — cost, capability, latency, and
data-residency trade-offs, and when to use hosted vs open-weight (latency SLAs, compliance/residency,
unit economics, fine-tune ownership, model-update risk); and (2) the PORTABILITY BUILD — an
adapter/interface over two or more providers, config-driven model routing, prompt/tool parity, and an
eval harness to catch behavioural drift when you swap. ~8 minutes: open with the strategic frame (price
or policy shifts, so keep it portable), one worked example (the same small app behind one interface,
provider selected by config, swapped OpenAI ↔ Gemini/Vertex or ↔ an Ollama endpoint), the top 2–3
mistakes (assuming prompts port 1:1; no eval so drift ships silently; hard-coding a provider), and a
one-line "remember: standardize the plumbing, keep the model swappable" takeaway. Stay strictly
grounded in the sources.
```

## 🎧 Audio — Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach cross-provider portability as an engineering discipline.
Part 1 — the decision framework: cost / capability / latency / data-residency, and the hosted-vs-
open-weight call per workload (unit economics, residency/compliance, fine-tune ownership, model-update
risk, latency SLAs). Build the mental model of a filled provider comparison matrix. Part 2 — the
portability build: an adapter/interface over >=2 providers; config-driven model routing; prompt and
tool PARITY (why the same prompt can behave differently across providers); and an eval harness that
flags behavioural drift on swap. For each, make the decision explicit — where an abstraction earns its
cost, and where it leaks. Ground strictly in the sources.
```

## 🎧 Audio — Debate (the ANCHOR trade-off — "hosted vs open-weight for enterprise")
```
Two hosts, expert level — this is the track's anchor debate. Topic: "Hosted managed APIs vs open-weight
models for enterprise." Host A argues HOSTED (OpenAI, Gemini/Vertex): velocity, frontier capability, no
GPU/MLOps ops, autoscaling, someone else patches the model. Host B argues OPEN-WEIGHT (Llama via Ollama
/ Hugging Face): data residency (data never leaves the boundary), cost-at-scale, full control, no
lock-in, offline capability. Make them trade real blows — hosted's per-token cost and lock-in and
residency gaps vs open-weight's GPU/ops/eval/on-call burden and capability gap. DO NOT let it end in a
tie: converge on a per-WORKLOAD decision rule (e.g. high-volume + residency-bound + cost-sensitive ->
open-weight; spiky + frontier-quality + small-team -> hosted) and the meta-move: keep the model behind
a swappable interface so the answer can change per workload and over time. Ground strictly in the
sources.
```

## 🤖 Apply it in Automatos
This is where Automatos IS the reference architecture: Automatos selects the **model provider per agent
via config**, so the "portability build" is native — point one agent at OpenAI, another at Gemini/Vertex,
another at a local Ollama endpoint, and route each workload to the provider its trade-offs demand.
Capstone: stand up the same small task on ≥2 providers behind Automatos's per-agent provider selection,
swap the provider by config, and run an eval to confirm behaviour holds on the swap.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook
- [ ] Generate the Video Overview (tune to ~8 min)
- [ ] Generate the Deep Dive audio + the **anchor Debate** (hosted vs open-weight)
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
