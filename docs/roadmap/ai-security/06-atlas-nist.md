# AI Security · Module 06 — MITRE ATLAS & NIST AI 600-1 mapping

**Type:** Skills track (no exam)  ·  Frame: GAIPS d8 — AI Risk Mgmt, Threat Modeling & Red-Teaming · adversary language + governance overlay (hands to S3 AIGP)

## 📥 Sources to load into NotebookLM
- The d8 lesson body — threat modeling, ATLAS, NIST governance (from the S2 track content / PRD)
- MITRE ATLAS — the matrix + the fact-sheet PDF (Spring-2025 GenAI techniques): https://atlas.mitre.org/
- NIST AI RMF landing page: https://www.nist.gov/itl/ai-risk-management-framework
- NIST AI 600-1 — Generative AI Profile (12 risk areas, 200+ actions): https://doi.org/10.6028/NIST.AI.600-1
- OWASP LLM Top 10 (2025) — to cross-map risks to ATLAS techniques and NIST risk areas: https://genai.owasp.org/llm-top-10/
- GAIPS objectives page (d8): https://www.giac.org/certifications/ai-security-platform-security-gaips

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: an engineer who now knows the OWASP LLM risks and needs the two frameworks that turn them into a
shared LANGUAGE (attacker side) and a GOVERNANCE overlay (defender/organisation side). Explain plainly
first, then precisely. Cover ONLY two frameworks and how they complement OWASP: (1) MITRE ATLAS — the
adversarial-ML knowledge base structured like ATT&CK, with tactics (the attacker's goals: reconnaissance,
resource development, initial access, ML model access, execution, exfiltration, impact) and techniques
under each, including the Spring-2025 GenAI additions — RAG Poisoning, False RAG Entry Injection, and LLM
Prompt Crafting. Make the point: ATLAS is the vocabulary you use to describe and plan an attack (and to
write red-team plans, per Module 05), where OWASP names the RISK and ATLAS names the TECHNIQUE. (2) NIST
AI 600-1, the Generative AI Profile of the AI RMF — its risk areas and its GOVERN/MAP/MEASURE/MANAGE
functions with 200+ suggested actions. Make the point: NIST is the organisational governance layer that
sits ABOVE the technical controls and hands directly to AI governance work (S3 AIGP). ~8 minutes: open
with why you need both a common attacker language and a governance frame, walk ATLAS tactics with the
GenAI techniques called out, walk the NIST functions briefly, show ONE worked cross-map (an OWASP risk →
an ATLAS technique → a NIST action), name the mistakes (treating ATLAS as a checklist rather than a
language; treating NIST as paperwork rather than a control map; ignoring the 2025 GenAI ATLAS additions),
and close with "OWASP = what can go wrong, ATLAS = how they'll do it, NIST = how the org governs it." Use
current OWASP LLM 2025 titles and current ATLAS tactics. Stay grounded; do not invent technique IDs.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach MITRE ATLAS and NIST AI 600-1 as the language-and-governance
layer over the OWASP LLM Top 10 (2025), for a skills-track audience. ATLAS: how it mirrors ATT&CK, its
tactics and techniques, and the Spring-2025 GenAI techniques (RAG Poisoning, False RAG Entry Injection,
LLM Prompt Crafting) — and how to USE it to build a threat model and a red-team plan (STRIDE-for-LLM as a
lighter complement). NIST AI 600-1: the Generative AI Profile, its risk areas, and the GOVERN/MAP/MEASURE/
MANAGE functions with their suggested actions, framed as the organisational overlay that governs the
technical controls from Modules 02–05 and hands to AI governance (S3 AIGP). Do a couple of explicit
cross-maps: OWASP risk → ATLAS technique → NIST action. Ground strictly in the sources; use current titles
and current ATLAS tactics; do not invent technique IDs or NIST action numbers.
```

## 🎧 Debate (the judgment call) — NotebookLM → Audio → Customize
```
Two expert hosts argue: "Do frameworks like ATLAS and NIST make LLM systems safer, or just more
documented?" One host argues they're essential — a shared attacker language makes red teams and detections
composable, and a governance frame like NIST is what turns scattered controls into accountable risk
management. The other argues framework-mapping becomes compliance theatre: hours spent mapping to ATLAS
technique IDs and NIST actions that don't stop a single injection, while the real defense is engineering
(the gateway from Module 05). Have them reason over concrete cross-maps and land on how to get the value
(shared language, prioritisation) without the theatre. Ground in the sources; current titles only.
```

## 🤖 Apply it in Automatos
Produce a lightweight threat model for one Automatos agent using both frameworks. Take the five-stage
attack-surface map from Module 00 and, for each realistic attack, tag the **ATLAS technique** (e.g. a
planted RAG doc → RAG Poisoning / False RAG Entry Injection; a jailbreak → LLM Prompt Crafting) and the
**NIST AI 600-1 function/action** that governs the response (MAP the risk, MEASURE via the red-team from
Module 05, MANAGE via budgets/allow-lists/approval gates). The result is an ATLAS-plus-NIST threat model
for a real agent — the artifact that hands cleanly into the AIGP governance track (S3).

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (ATLAS matrix + fact sheet, NIST AI 600-1, OWASP overview)
- [ ] Generate the Video (~8 min) and tune the runtime
- [ ] Generate the Deep Dive **and** the Debate audio (skills track — **no exam Brief**)
- [ ] Build an ATLAS-technique + NIST-function threat model for one real Automatos agent
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
