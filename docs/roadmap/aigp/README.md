# AIGP — AI Governance Professional (external exam)

Prep track for the **AIGP — Artificial Intelligence Governance Professional** certification, issued by
the **IAPP** (International Association of Privacy Professionals). The academy issues no exam; it
prepares you (via mock exams + these NotebookLM media) to sit the *real* proctored exam at **Pearson
VUE / OnVUE**, and shows how the same governance controls work in Automatos.

**Exam at a glance:** 100 questions · 2.75 hours (2h45m) · **scaled 300 on a 100–500 scale to pass**
(IAPP notes 300 "does not represent 60%") · USD 799 non-member / USD 649 member · proctored (Pearson
VUE test centres or OnVUE remote). Blueprint of record: **AIGP Body of Knowledge & Exam Blueprint
v2.0.1, effective 3 February 2025**. Governance frameworks (**EU AI Act, ISO/IEC 42001, NIST AI RMF,
GDPR × AI**) are folded in **as content** here — they do not get their own tracks.

## Blueprint — the four weighted domains

| Module | Domain (official title, verbatim) | Blueprint (min–max Q) | Weight | slug |
|---|---|---|---|---|
| [00](./00-overview.md) | Overview / exam strategy | — | — | — |
| [01](./01-foundations.md) | Understanding the foundations of AI governance | 16–20 | **0.21** | `d1-foundations` |
| [02](./02-laws-standards-frameworks.md) | Understanding how laws, standards and frameworks apply to AI | 19–23 | **0.25** | `d2-laws-standards` |
| [03](./03-govern-development.md) | Understanding how to govern AI development | 21–25 | **0.27** | `d3-govern-development` |
| [04](./04-govern-deployment-use.md) | Understanding how to govern AI deployment and use | 21–25 | **0.27** | `d4-govern-deployment` |

Sum = 1.00. Weights are **pedagogy weights derived from the BoK's published question ranges** (blueprint
midpoints 18/21/23/23 = 85; each ÷ 85) — not an IAPP-published percentage. Study effort follows weight:
the two heaviest domains (Develop, Deploy — 0.27 each) earn the most media, then Laws/Frameworks (0.25),
then Foundations (0.21). Sub-domains (I.A–I.C, II.A–II.D, III.A–III.C, IV.A–IV.C) seed the lessons.

## Currency rule (BoK v2.0.1 + biting EU AI Act timeline)

- **Verify against the live BoK before authoring** — a version bump past v2.0.1 is a data edit
  (re-check the per-domain question ranges and the sub-domain list).
- **EU AI Act content must carry the current risk tiers and timeline:** four tiers (unacceptable /
  high / limited / minimal-or-none); entry into force **Aug 2024**; **GPAI** obligations **Aug 2025**;
  high-risk phase-in through **2026–2027**. Cite the EUR-Lex official text, Regulation (EU) 2024/1689.
- **Official sources only** — IAPP / EUR-Lex / ISO / NIST / OECD. **No exam dumps, no braindumps.**

## Module checklist

- [ ] [00 — Overview & exam strategy](./00-overview.md)
- [ ] [01 — Foundations of AI Governance](./01-foundations.md)  *(Domain I · 0.21)*
- [ ] [02 — Laws, Standards & Frameworks](./02-laws-standards-frameworks.md)  *(Domain II · 0.25 — EU AI Act / ISO 42001 / NIST AI RMF / GDPR × AI)*
- [ ] [03 — Governing AI Development](./03-govern-development.md)  *(Domain III · 0.27 — heaviest, 2 videos)*
- [ ] [04 — Governing AI Deployment & Use](./04-govern-deployment-use.md)  *(Domain IV · 0.27 — heaviest, 2 videos)*

## The dos

- **Do** build one NotebookLM notebook per module (or per video for the two 0.27 domains) — load only
  that domain's sources: the domain lesson body + the official docs listed + the BoK sub-domain
  task statements for that domain.
- **Do** paste the module's Video prompt into **Video → Customize**, then tune to **~8 min**; split if
  it drifts long (Develop and Deploy each warrant two videos).
- **Do** generate the **Deep Dive** (learn) and the **Brief** (revise, week before the exam) audio; add
  a **Debate / Critique** for the judgment-heavy calls — *"which EU AI Act risk tier applies?"*,
  *"developer vs deployer obligations"*, *"critique this model card against transparency requirements"*.
- **Do** ground everything in official sources — the **IAPP AIGP BoK v2.0.1**, **EUR-Lex** Regulation
  (EU) 2024/1689, the **ISO/IEC 42001** overview, **NIST AI RMF 1.0**, and **OECD AI Principles**.
  No braindumps, no real exam items.
- **Do** keep the currency rule: BoK **v2.0.1**, four EU AI Act tiers, GPAI Aug 2025, high-risk phase-in
  through 2026–2027. Official text wins over commentary.
- **Do** finish each module with **Apply it in Automatos** — map governance requirements onto Automatos
  controls (blueprints, approval gates, audit logging, RBAC / super-admin tiers) and classify an
  Automatos deployment under the EU AI Act, so the skill and the awareness thread land together.
- **Do** download → host (self-host `.mp4`/`.mp3` or YouTube-unlisted) → register in the domain's
  `videos[]` → tick the module off here.
