# AI Security · Module 01 — OWASP LLM Top 10 (2025) overview

**Type:** Skills track (no exam)  ·  Frame: GAIPS d2 — LLM Application Threat Model (the spine)

## 📥 Sources to load into NotebookLM
- The d2 lesson body (OWASP LLM Top 10 threat model, from the S2 track content / PRD)
- OWASP Top 10 for LLM Applications (2025) — the list: https://genai.owasp.org/llm-top-10/
- The per-risk OWASP pages for all ten (LLM01–LLM10), linked from that list
- MITRE ATLAS — for cross-referencing risks to adversary techniques: https://atlas.mitre.org/
- GAIPS objectives page (d2 in the 8-domain skeleton): https://www.giac.org/certifications/ai-security-platform-security-gaips

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: an engineer building the mental model of LLM application risk — this is the spine of the whole
track. Explain plainly first, then precisely. Cover ONLY a tour of the OWASP Top 10 for LLM Applications
(2025), using the CURRENT titles exactly: LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure,
LLM03 Supply Chain, LLM04 Data & Model Poisoning, LLM05 Improper Output Handling, LLM06 Excessive Agency,
LLM07 System Prompt Leakage, LLM08 Vector & Embedding Weaknesses, LLM09 Misinformation, LLM10 Unbounded
Consumption. Give each risk ONE crisp line: what it is and the one-sentence mechanism. Then group the ten
onto the five-stage attack-surface map from Module 00 so the listener sees they aren't random: input
(LLM01), context/retrieval (LLM08, plus LLM01 indirect), model & lineage (LLM03, LLM04), output (LLM05),
action/agency (LLM06), and the cross-cutting ones (LLM02, LLM07, LLM09, LLM10). ~8 minutes: open with why
a shared, versioned list matters (a common language beats ad-hoc fear), do the grouped tour, flag the
2–3 renames people trip on — say the 2025 title AND the old name once so nobody uses stale terms
("Improper Output Handling" was "Insecure Output Handling"; "Unbounded Consumption" absorbed "Model
Denial of Service"; "Data & Model Poisoning" broadened "Training Data Poisoning") — and close with
"the next four modules go deep on these clusters." Stay strictly grounded in the official 2025 list; do
not invent, merge, or renumber risks.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the full OWASP Top 10 for LLM Applications (2025) as an
integrated threat model for a skills-track audience. Walk all ten in order using the current 2025 titles,
and for each give: mechanism, a concrete real-world example, and the headline mitigation direction. Tie
each back to the five-stage attack-surface map (input, context, model, tools, output) so the ten form a
coherent picture rather than a checklist. Explicitly call out the renames from the 2023/2024 list so the
listener retires stale terminology. Ground strictly in the official 2025 sources; use the current titles
only; do not invent or merge risks.
```

## 🎧 Debate (the judgment call) — NotebookLM → Audio → Customize
```
Two expert hosts argue: "A Top 10 list is the wrong tool for LLM security." One host defends it — shared
language, prioritisation, onboarding, a stable reference the whole industry can cite. The other attacks it
— the risks overlap heavily (prompt injection underlies half the list), attackers don't work top-to-bottom,
and a ranked list invites checkbox security while the real failures are systemic. Have them reason over the
actual 2025 items and land on how to USE the list well without treating it as a compliance checklist.
Ground in the official 2025 sources; current titles only.
```

## 🤖 Apply it in Automatos
Run the OWASP LLM Top 10 (2025) as a coverage checklist against one Automatos agent. For each of the ten,
write one line: does the platform have a control, a partial control, or a gap? Prime the pump with what
you already know — tool allow-lists and blueprints touch LLM06; the KG/RAG ACL work touches LLM08; cost
budgets touch LLM10; output validation touches LLM05. The gaps you find become the backlog you close
across Modules 02–05.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (the 2025 list + all ten per-risk pages)
- [ ] Generate the Video (~8 min) and tune the runtime
- [ ] Generate the Deep Dive **and** the Debate audio (skills track — **no exam Brief**)
- [ ] Produce the ten-line Automatos coverage checklist (control / partial / gap per risk)
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
