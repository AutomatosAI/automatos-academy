# Cross-Vendor Fluency — skills track + Gen-AI-Leader exam sub-track

Teaches **provider-agnostic** judgement: reason about build-vs-buy and portability across model
providers instead of being a partisan of one vendor. Choose hosted vs open-weight per workload, avoid
lock-in, negotiate cost/capability/data-residency trade-offs, and move the *same* app between OpenAI,
Google, and open weights when price or policy shifts. Every other track is single-vendor by design;
this one fills the cross-cutting gap — and shows Automatos doing exactly this (multi-model agents,
provider selectable per agent).

**Shape:** a **SKILLS track (m1–m4)** — no mock exam, no A+ readiness gate — **plus one OPTIONAL
real-exam sub-track**, module 05, for the **Google Cloud "Generative AI Leader"** certification (a
real, self-enrollable, proctored credential; the academy issues no exam — it preps you for the *real*
one at Google's proctor and shows the same flows in Automatos).

**Gen-AI-Leader at a glance (module 05):** $99 · 90 min · 50–60 multiple-choice · online- or
onsite-proctored · valid 3 years · **no prerequisites** · business audience. Four official domains
sum to 100%. Passing score **not published** by Google — confirm on the cert page before launch.
The guide was **recently updated for branding changes** (Agent Platform / *Gemini Enterprise Agent
Platform*, *Agent Studio*) — **teach current names**.

## Modules

| Module | Focus | Type | slug |
|---|---|---|---|
| [00](./00-overview.md) | Why provider-agnostic; the landscape | orientation | — |
| [01](./01-openai-api-agents.md) | OpenAI — API + Agents SDK | skills | `m1-openai` |
| [02](./02-google-gemini-vertex.md) | Google Gemini / Vertex AI | skills | `m2-google-vertex` |
| [03](./03-open-weight.md) | Open-weight — Llama / Ollama / Hugging Face | skills | `m3-open-weight` |
| [04](./04-cross-provider-portability.md) | Cross-provider portability + a portability build | skills | `m4-comparison` / `m5-portability` |
| [05](./05-gen-ai-leader-exam.md) | Google Generative AI Leader | **external exam** | — |

**Gen-AI-Leader blueprint (module 05) — official section titles + weights, sum = 1.00:**

| d | Section (official title) | Weight | slug |
|---|---|---|---|
| d1 | Fundamentals of gen AI | **30%** | `d1-fundamentals` |
| d2 | Google Cloud's gen AI offerings | **35%** | `d2-google-offerings` |
| d3 | Techniques to improve gen AI model output | **20%** | `d3-improve-output` |
| d4 | Business strategies for a successful gen AI solution | **15%** | `d4-business-strategy` |

## Media per module

- **Skills modules (01–04):** 1 × Video (~8 min) + **Deep Dive** (learn) + **Debate** (the judgment
  call). **No exam Brief** — skills tracks don't sit a proctored exam.
- **Exam module (05):** 1 × Video (~8 min) + **Deep Dive** (learn) + **Brief** (revise, the week
  before the exam). It's the one module that feeds the mock-exam + Ready gate.

## Module checklist

- [ ] [00 — Overview: why provider-agnostic + the landscape](./00-overview.md)
- [ ] [01 — OpenAI: API + Agents SDK](./01-openai-api-agents.md) *(skills: Deep Dive + Debate)*
- [ ] [02 — Google Gemini / Vertex AI](./02-google-gemini-vertex.md) *(skills: Deep Dive + Debate)*
- [ ] [03 — Open-weight: Llama / Ollama / Hugging Face](./03-open-weight.md) *(skills: Deep Dive + Debate)*
- [ ] [04 — Cross-provider portability + portability build](./04-cross-provider-portability.md) *(skills: Deep Dive + **anchor Debate**: hosted vs open-weight)*
- [ ] [05 — Google Generative AI Leader (exam)](./05-gen-ai-leader-exam.md) *(exam: Video + Deep Dive + **Brief**)*

## The dos

- **Do** build one NotebookLM notebook per module — load only that module's sources: the lesson body
  + the official docs listed. For module 05, add the Gen-AI-Leader exam guide + the domain task
  statements.
- **Do** paste the module's Video prompt into **Video → Customize**, then tune to **~8 min**; split
  if it drifts long.
- **Do** generate the **Deep Dive** (learn) for every module; add the **Debate** for skills modules
  (the trade-off / judgment call) and the **Brief** for module 05 (revise before the exam).
- **Do** make module 04's Debate the **anchor**: *"Hosted vs open-weight for enterprise"* — one host
  argues managed APIs (velocity, frontier capability, no ops), the other argues open weights (data
  residency, cost-at-scale, control, no lock-in), converging on a per-workload decision rule.
- **Do** ground everything in **official sources only** — OpenAI platform docs + Agents SDK, Google
  Vertex AI gen-AI docs, the Ollama / Hugging Face setup guides, and (module 05) the Google
  Gen-AI-Leader exam guide. **No exam dumps.** Docs win over community guides.
- **Do** teach **current names** for module 05 (Agent Platform / *Gemini Enterprise Agent Platform*,
  *Agent Studio*) — the exam guide was refreshed for the rebrand.
- **Do** finish each module with **Apply it in Automatos** — wire the same idea as a multi-model
  Automatos agent (switch providers per agent via config), so the skill and the awareness thread land
  together.
- **Do** download → host (self-host `.mp4`/`.mp3` or YouTube-unlisted) → register in the module's
  `videos[]` → tick the module off here.
