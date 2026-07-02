# AI Security · Module 00 — The LLM threat landscape & why it matters

**Type:** Skills track (no exam)  ·  Frame: GAIPS d1 — AI & LLM Foundations · attack-surface map

## 📥 Sources to load into NotebookLM
- The d1 lesson body (AI & LLM Foundations, from the S2 track content / PRD)
- OWASP Top 10 for LLM Applications (2025) — overview page: https://genai.owasp.org/llm-top-10/
- MITRE ATLAS — the matrix landing page: https://atlas.mitre.org/
- NIST AI RMF + Generative AI Profile (NIST AI 600-1): https://www.nist.gov/itl/ai-risk-management-framework and https://doi.org/10.6028/NIST.AI.600-1
- GAIPS objectives page (the 8-domain skeleton): https://www.giac.org/certifications/ai-security-platform-security-gaips
- Your own teaching notes: the LLM attack-surface map (input → context → model → tools → output)

## 🎬 Video (~8 min) — NotebookLM → Video → Customize
```
Audience: a security-minded engineer or AppSec practitioner new to LLM security — strong on classic
application security, not yet fluent in where LLMs add NEW attack surface. Explain plainly first, then
precisely. Cover ONLY the landscape and WHY it matters: the one shift that changes everything — with an
LLM, the prompt is BOTH data and control, so the classic code/data trust boundary collapses. Then walk
the LLM attack-surface map end to end as five stages: (1) INPUT — untrusted user text; (2) CONTEXT —
retrieved RAG docs, tool results, and system prompt, any of which can carry attacker instructions;
(3) MODEL — the weights and their training/fine-tune lineage; (4) TOOLS — the actions the model can
take on the world; (5) OUTPUT — where model text flows downstream into browsers, shells, SQL, or other
systems. For each stage name the headline risk in one line and forward-reference the OWASP LLM Top 10
(2025) item that owns it. ~8 minutes: open with why a traditional AppSec cert misses all of this, walk
the five-stage map with one concrete end-to-end example (a support chatbot that reads a poisoned doc and
is tricked into calling a tool), name the 2–3 things newcomers get wrong (assuming input filtering alone
is enough; treating the system prompt as a secret; trusting tool output), and close with a one-line
"the whole track in one sentence" takeaway. Use the CURRENT OWASP LLM 2025 titles. Stay strictly
grounded in the sources; do not invent risk names or attack techniques.
```

## 🎧 Deep Dive (learn) — NotebookLM → Audio → Customize
```
Two hosts, expert level, no basics. Teach the LLM threat landscape for a skills-track audience of AppSec
engineers moving into AI security. Anchor on the trust-boundary shift (prompt = data AND control) and the
five-stage attack-surface map: input, context (RAG + tools + system prompt), model, tools, output. For
each stage, explain the mechanism at the level an attacker actually exploits, and map it to the owning
OWASP LLM Top 10 (2025) item using the current titles. Show how the three source frameworks fit together:
OWASP LLM Top 10 = the risk catalogue, MITRE ATLAS = the adversary tactics/techniques language, NIST AI
600-1 = the governance overlay. Ground strictly in the sources; use current OWASP LLM 2025 titles only.
```

## 🎧 Debate (the judgment call) — NotebookLM → Audio → Customize
```
Two expert hosts argue a real, unsettled tension for a skills-track listener: "Is an LLM app just a normal
app with a weird new input, or is it a fundamentally different security problem?" One host argues it's
continuous with AppSec — untrusted input, output encoding, least privilege, the same old disciplines in
new clothes. The other argues the prompt-is-data-and-control collapse is genuinely new and breaks the
assumptions those disciplines rest on. Have them reason over the five-stage attack-surface map and land on
where the honest answer is "both, and here's the line." Ground in the sources; no invented techniques.
```

## 🤖 Apply it in Automatos
Map the five-stage attack surface onto a real Automatos deployment before you learn a single control:
open a chatbot agent and trace its INPUT (user chat), CONTEXT (its RAG documents, tool results, and the
blueprint/system prompt), MODEL (the configured LLM), TOOLS (its allow-listed tools and Composio actions),
and OUTPUT (where the reply and any tool side-effects land). Sketch the trust boundary at each stage. This
map is the target you'll harden across Modules 02–05.

## ✅ Do
- [ ] Load the sources into a new NotebookLM notebook (OWASP overview + ATLAS + NIST + GAIPS + your map)
- [ ] Generate the Video (~8 min) and tune the runtime
- [ ] Generate the Deep Dive **and** the Debate audio (skills track — **no exam Brief**)
- [ ] Draw the five-stage attack-surface map for one real Automatos agent
- [ ] Download → host → register in the track `videos[]`
- [ ] Tick this module off in the track README
