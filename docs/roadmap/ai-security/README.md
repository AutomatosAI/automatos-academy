# AI Security — LLM & agent security (skills track)

A **skills track** (cross-vendor) on securing LLM applications and agents. Unlike the exam tracks,
this one has **no proctored exam and no mock-exam readiness gate** — you learn a skill and prove it on
a **lab/scenario**, and each module shows how the same control lands in Automatos. It picks up where
GH-500 (secure SDLC for *code*) stops: **the LLM itself is now attack surface** — prompt injection,
poisoned RAG data, over-agentic tool use, model/plugin supply chain.

**Why now:** 2026 is the inflection — ISC2 folded AI security across all nine certs, ISACA shipped
AAISM / SecAI+, CompTIA launched SecAI+, and SANS/GIAC are releasing AI certs through 2026. This is the
underserved, high-signal track that pairs naturally with the platform's own agent/RAG stack.

**Frame (skeleton, not an exam blueprint):** the **GIAC GAIPS** 8 published domains as the de-facto
industry skeleton, with the **OWASP LLM Top 10 (2025)** as the spine, **MITRE ATLAS** as the adversary
language, and **NIST AI 600-1** as the governance overlay. No weights — no exam to weight to.

## ⚠️ GAIPS upgrade trigger (owner-visible)

This track ships **skills-track by design** because no target cert publishes usable MCQ mechanics yet.
**Re-fetch the [GAIPS objectives page](https://www.giac.org/certifications/ai-security-platform-security-gaips)
after 2026-07-28** (GA date). **If** GIAC then publishes question count + duration + passing score **and**
a proctored MCQ path exists → **promote S2 to exam-anchored**: add `track.exam{}` + a readiness gate and
normalize the 8 GAIPS domains to weights (a *re-weighting*, not a rewrite). If GAIPS stays CyberLive
hands-on-only, keep it skills-track and re-evaluate CompTIA SecAI+ / ISACA SecAI+ MCQ blueprints instead.
CAISP ($1,099, 5-challenge lab) is an optional paid **capstone**, not a mock-exam fit.

## Module map (skills track — no exam)

Seven topical modules over the OWASP LLM Top 10 (2025) + ATLAS/NIST, teaching-ordered. No weights.

| Module | Topic | OWASP LLM (2025) covered | slug |
|---|---|---|---|
| [00](./00-overview.md) | The LLM threat landscape & why it matters | attack-surface map (input → context → model → tools → output) | `d1-llm-foundations` |
| [01](./01-threat-model-owasp.md) | OWASP LLM Top 10 (2025) overview | all ten, mechanism → example → mitigation | `d2-owasp-llm-top10` |
| [02](./02-prompt-injection-output.md) | Prompt injection & improper output handling | **LLM01** Prompt Injection · **LLM05** Improper Output Handling | `d2-owasp-llm-top10` |
| [03](./03-poisoning-supply-chain.md) | Poisoning & supply chain | **LLM04** Data & Model Poisoning · **LLM03** Supply Chain · **LLM08** Vector & Embedding Weaknesses | `d3-app-architecture` |
| [04](./04-excessive-agency-agents.md) | Excessive agency, agents & disclosure | **LLM06** Excessive Agency · **LLM02** Sensitive Information Disclosure · **LLM07** System Prompt Leakage · **LLM09** Misinformation | `d5-agentic-security` |
| [05](./05-red-team-gateway.md) | Red-teaming & hardening an LLM gateway | **LLM10** Unbounded Consumption + defenses across LLM01–09 | `d6-gateway-hardening` |
| [06](./06-atlas-nist.md) | MITRE ATLAS & NIST AI 600-1 mapping | adversary language + governance overlay | `d8-risk-redteam` |

The **gateway-hardening lab (Module 05)** is the capstone "prove" artifact.

> **Currency rule.** Use the **CURRENT OWASP LLM 2025 titles** verbatim: LLM01 Prompt Injection, LLM02
> Sensitive Information Disclosure, LLM03 Supply Chain, LLM04 Data & Model Poisoning, **LLM05 Improper
> Output Handling**, LLM06 Excessive Agency, **LLM07 System Prompt Leakage**, LLM08 Vector & Embedding
> Weaknesses, LLM09 Misinformation, **LLM10 Unbounded Consumption**. Do not use the 2023/2024 titles
> (e.g. "Insecure Output Handling", "Model Denial of Service", "Training Data Poisoning").

## Module checklist

- [ ] [00 — The LLM threat landscape & why it matters](./00-overview.md)
- [ ] [01 — OWASP LLM Top 10 (2025) overview](./01-threat-model-owasp.md)
- [ ] [02 — Prompt injection & improper output handling](./02-prompt-injection-output.md)
- [ ] [03 — Poisoning & supply chain](./03-poisoning-supply-chain.md)
- [ ] [04 — Excessive agency, agents & sensitive-info disclosure](./04-excessive-agency-agents.md)
- [ ] [05 — Red-teaming & hardening an LLM gateway *(capstone lab)*](./05-red-team-gateway.md)
- [ ] [06 — MITRE ATLAS & NIST AI 600-1 mapping](./06-atlas-nist.md)

## The dos

- **Do** build one NotebookLM notebook per module — load only that module's sources: the official
  OWASP / MITRE / NIST pages listed + the GAIPS objectives + your teaching notes. **Official sources
  only — no exam dumps, no CAISP courseware.**
- **Do** paste the module's **Video (~8 min)** prompt into **Video → Customize**, then tune to ~8 min;
  split if it drifts long.
- **Do** generate the **Deep Dive** (learn) and the **Debate** (the judgment call) audio. **This is a
  skills track — there is NO exam Brief.** The Debate is the tentpole: security is genuinely unsettled,
  so let the listener hear both sides (e.g. *"is prompt-injection defense solvable?"*).
- **Do** use the **CURRENT OWASP LLM 2025 titles** (see the currency rule above). Ground every claim in
  the official list at [genai.owasp.org/llm-top-10](https://genai.owasp.org/llm-top-10/) — author it,
  don't recall it.
- **Do** finish each module with **Apply it in Automatos** — harden an actual Automatos agent or the
  gateway: budgets/cost ceilings, blueprints, tool allow-lists, output validation, human-in-the-loop
  gates, RAG ACLs. The skill and the awareness thread land together.
- **Do** end each module on a **lab/scenario** as its "prove" artifact (no readiness gate); the
  gateway-hardening lab in Module 05 is the capstone.
- **Do** download → host (self-host `.mp4`/`.mp3` or YouTube-unlisted) → register in the track's
  `videos[]` → tick the module off here.
- **Do** honour the **GAIPS upgrade trigger** above after 2026-07-28 — promote to exam-prep only if
  GIAC publishes real MCQ mechanics; never fake a blueprint.
