# AI Security · Module 03 — Poisoning & supply chain

**Type:** Skills track (no exam)  ·  Frame: GAIPS d3/d4/d7 — **LLM04 Data & Model Poisoning** · **LLM03 Supply Chain** · **LLM08 Vector & Embedding Weaknesses**

## 📥 Sources to load into NotebookLM
- The d3/d4/d7 lesson bodies — poisoning, supply chain, RAG/vector-store risk (from the S2 track content / PRD)
- OWASP LLM Top 10 (2025) — **LLM04 Data & Model Poisoning** page: https://genai.owasp.org/llm-top-10/
- OWASP LLM Top 10 (2025) — **LLM03 Supply Chain** page: https://genai.owasp.org/llm-top-10/
- OWASP LLM Top 10 (2025) — **LLM08 Vector & Embedding Weaknesses** page: https://genai.owasp.org/llm-top-10/
- MITRE ATLAS — RAG Poisoning / False RAG Entry Injection techniques (Spring-2025 release): https://atlas.mitre.org/
- GAIPS objectives page (d3/d4/d7): https://www.giac.org/certifications/ai-security-platform-security-gaips

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: an engineer who secures running apps but has never thought about the INTEGRITY of what a model
learned from or retrieves. Explain plainly first, then precisely. Cover ONLY three OWASP LLM (2025) risks
that all attack the SUPPLY of data and components, not the live request: LLM04 Data & Model Poisoning,
LLM03 Supply Chain, and LLM08 Vector & Embedding Weaknesses. Frame them as a timeline of trust: LLM04 =
corrupting what the model LEARNED (poisoned pre-training / fine-tune / RLHF data that implants bias or a
hidden backdoor trigger) — and be explicit that the 2025 title broadened the old "Training Data Poisoning"
to include the MODEL itself; LLM03 = trusting third-party COMPONENTS you didn't build (a tampered base
model or LoRA from a hub, a malicious pip/plugin, an unsigned model file, a compromised dataset); LLM08 =
poisoning the RETRIEVAL layer at runtime (planting attacker text in the vector store so it surfaces as a
"trusted" citation — this is where indirect prompt injection meets RAG, plus cross-tenant embedding
leakage). ~8 minutes: open with why this class is insidious (the attack is baked in BEFORE the request, so
runtime filters miss it), give one worked example per risk (a backdoored fine-tune; an unsigned model
pulled from a hub; a planted RAG document that gets cited), name the 2–3 mistakes (assuming a popular hub
model is safe; no provenance/signing on models or datasets; letting any writer add to the shared vector
store), and close with the one-line "trust the SUPPLY, not just the request." Use current OWASP LLM 2025
titles. Stay grounded in the sources; do not invent specific CVEs or model names.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the integrity/supply-chain cluster — LLM04 Data & Model
Poisoning, LLM03 Supply Chain, LLM08 Vector & Embedding Weaknesses — for a skills-track audience. For each:
mechanism, a concrete example, and defenses. LLM04: dataset lineage and vetting, provenance, anomaly/eval
gates that can catch a backdoor trigger, and why "Data & Model" now covers the model artefact too. LLM03:
treat models, adapters, plugins, and datasets like any other dependency — SBOM-style inventory, signing
and verification, pinned/vetted sources, no unsigned model files. LLM08: control WHO can write to the
vector store, validate and attribute retrieved chunks, keep embeddings tenant-isolated to stop
cross-tenant leakage, and check citation integrity so a planted document can't masquerade as ground truth.
Connect LLM08 back to indirect prompt injection from Module 02. Ground strictly in the sources; current
2025 titles only.
```

## 🎧 Debate (the judgment call) — NotebookLM → Audio → Customize
```
Two expert hosts argue: "Can you actually trust an open-weights model or a community RAG corpus you didn't
build?" One host argues open weights + community data are a security WIN — inspectable, reproducible,
signable, no vendor black box. The other argues they're an unmanaged supply-chain liability — you can't
audit what a model learned, backdoor triggers survive fine-tuning, and a public corpus is trivially
poisonable at scale. Have them reason over LLM03/LLM04/LLM08 concretely and land on a practical trust
posture (what to sign, what to vet, what to isolate). Ground in the sources; current titles only.
```

## 🤖 Apply it in Automatos
Harden the platform's data supply. **LLM08 (the biggest live lever):** tighten who can write to the RAG /
knowledge-graph stores and verify retrieval is tenant-scoped — the platform's KG/RAG ACL and workspace-
scoped retrieval work is exactly the control that stops a planted document leaking across tenants or being
cited as truth; add citation/provenance checks on what an agent retrieves. **LLM03:** inventory the models,
adapters, and plugins/Composio components an agent depends on and prefer pinned, verifiable sources.
**LLM04:** where the platform fine-tunes or ingests training/eval data, add lineage tracking and an eval
gate before promotion. Output the "who can write to retrieval, and is it isolated?" answer for one
workspace as the module's proof.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (LLM03 + LLM04 + LLM08 pages + ATLAS RAG-poisoning techniques)
- [ ] Generate the Video (~8 min) and tune the runtime
- [ ] Generate the Deep Dive **and** the Debate audio (skills track — **no exam Brief**)
- [ ] Audit one Automatos workspace: who can write to the vector/KG store, and is retrieval tenant-isolated?
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
