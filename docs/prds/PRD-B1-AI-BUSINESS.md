# PRD — B1: AI Business Foundations (ABF) track — the Operator lane flagship

**Status:** proposed (recommended: build with S1 APA) · **Owner:** Academy · **Last updated:** 2026-07-02
**Parent:** [PRD-ACADEMY-ROADMAP.md](./PRD-ACADEMY-ROADMAP.md) · **Shape modelled on:** [PRD-S1-APA.md](./PRD-S1-APA.md) (first-party skills track)
**Strategy context:** [STRATEGY-REVIEW-2026-07-02.md](../STRATEGY-REVIEW-2026-07-02.md) §3 — the missing audience.

## 1. Why

Every existing and planned track serves a **practitioner** chasing a credential. The academy's
core marketing problem — *"people don't understand Automatos AI, or AI in general, or how they
can run their business with it"* — describes an **operator**: a business owner, founder, team
lead, or non-technical professional. They will never sit CCA-F. They are, however, exactly who
Automatos is for. ABF is the academy's front door for them: plain-language, jargon-free,
outcome-first AI education that ends — every module — with the learner *doing the thing* on the
free Automatos platform.

This is the track that makes the "teach what AI can do → offer the tool" thesis literal. It is
also the general-AI-literacy layer (goal: "understand AI in general") that the cert tracks assume
and never teach.

**Lane naming:** ABF opens the **Operator lane**; the S0–S5 program is the **Practitioner lane**.
A visitor picks a door, not a vendor.

## 2. Shape — skills track, no exam, no gate (APA rules apply)

Same shape decisions as APA, restated because they matter more here:

- **No `track.exam{}`, no mock exam, no A+ readiness gate.** This audience is *put off* by exam
  framing. Progress = modules completed + the capstone (an automated real workflow + a one-page
  AI operating plan).
- Optional **ungated** knowledge checks per module — self-assessment, never pass/fail.
- **Completion = "AI-operational":** the learner has automated one real workflow in their own
  business and can explain what AI can/can't do, what it costs, and what to watch for.
  Completion badge per [PRD-CREDENTIALS.md](./PRD-CREDENTIALS.md).
- **Tone rule (hard):** plain English first, term second, always in that order ("teach the AI
  your business — this is called RAG"). No acronym appears before its plain-language job.
  The manifest tagline ("only top people qualify") must not leak into this lane's copy.
- **Optional bridge, not a gate:** learners who finish and want a *real* credential get pointed
  at the S4 **Gen-AI-Leader** sub-track ($99, business-audience, verified in
  [PRD-S4-CROSS-VENDOR.md](./PRD-S4-CROSS-VENDOR.md) §7) — the honest "prove it" upgrade.

## 3. Curriculum (9 modules — each answers a business question)

Curriculum sections, not weighted domains (no exam). One module = one file in
[`docs/roadmap/ai-business/`](../roadmap/ai-business/) (authored this pass).

| m | Module | The business question it answers | slug |
|---|---|---|---|
| 00 | What AI actually is (and isn't) | "What is this thing everyone's selling me?" | `m0-what-ai-is` |
| 01 | Where AI fits your business | "Where do I even start?" | `m1-where-ai-fits` |
| 02 | Working with AI day to day | "How do I get good results, not garbage?" | `m2-working-with-ai` |
| 03 | Teach the AI your business | "How does it know *my* products, *my* policies?" | `m3-teach-it-your-business` |
| 04 | From chats to systems | "How do I stop repeating myself into a chat box?" | `m4-chats-to-systems` |
| 05 | Delegating with guardrails | "Can I trust it to act on its own?" | `m5-delegation-guardrails` |
| 06 | Risk, safety & responsibility | "What could go wrong, and what's my exposure?" | `m6-risk-safety` |
| 07 | Cost & ROI | "Is this actually worth money to me?" | `m7-cost-roi` |
| 08 | Capstone — your AI operating plan | "Make it real in *my* business" | `m8-capstone-operating-plan` |

**Debate modules** (the judgment calls, per the academy's media pattern): 01 ("quick wins vs
transformation — is SMB AI overhyped?"), 05 ("how much autonomy should a small business give an
agent?"), 07 ("build the habit vs buy the outcome — where's the ROI, honestly?").

## 4. Content plan (per module)

Lesson depth *shallower* than cert tracks by design: 2–3 short lessons per module, one worked
real-business example each (a café, an agency, an e-commerce shop, a consultancy — recurring cast
so the course feels like advising real firms), optional knowledge check, and a mandatory
**🛠 Do it now** step on the free platform. Signature artifacts the learner accumulates:

1. **The AI opportunity map** (m1) — their own functions × repetitive-knowledge-work audit.
2. **A prompt/delegation library** (m2) — five reusable briefs for their actual tasks.
3. **A grounded assistant** (m3) — their documents uploaded, answering their questions.
4. **One automated workflow** (m4/m5) — a playbook or supervised agent doing a weekly task.
5. **A one-page AI policy** (m6) — data rules, human-check points, customer transparency.
6. **A cost/ROI one-pager** (m7) — cost per task vs time saved, with the "don't automate" list.
7. **The AI operating plan** (m8, capstone) — one page: 3 opportunities, 1 shipped, next 90 days.

These artifacts are the operator-lane equivalent of the practitioner portfolio ("Prove").

## 5. Sources (first-party + already-verified only — no new credential claims)

No exam → no blueprint verification burden. Module sources are:
- **First-party:** `automatos-gitbook` user docs (chat, agents, knowledge, playbooks, missions,
  memory, templates, team/analytics) + the module lesson bodies, exactly like APA.
- **Already-verified externals** (verified live 2026-07-01 in sibling PRDs — cite, reuse):
  Google **Gen-AI-Leader exam guide PDF** (d1 fundamentals / d3 improving output / d4 business
  strategy sections are vendor-light and business-toned — see PRD-S4 §7) · **OWASP LLM Top 10
  (2025)** and **NIST AI RMF / AI 600-1** (m6, used gently) · **EU AI Act** timeline page (m6,
  one honest paragraph on where regulation is heading — links to the S3 AIGP track for depth).
- Vendor business-guide pages (Anthropic/OpenAI/Google "AI for business" pages) may seed
  NotebookLM notebooks — **verify reachable at authoring time; none is load-bearing.**

## 6. Videos — NotebookLM plan

~9–11 videos (~6–8 min — shorter than cert tracks; this audience won't sit twelve minutes), one
per module + overview, prompts authored in the module files per
[NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md). Audio: **Deep Dive** every module; **Debate**
on 01/05/07. No exam Briefs (no exam). Persona line for every prompt: *"Audience: a smart
business owner with zero AI background and no patience for hype — explain like a trusted advisor,
plain English before any term of art."*

## 7. Relationship to other tracks

- **APA** is the practitioner's platform-mastery sibling; ABF hands off to it ("want to go
  deeper than the capstone? APA is the full platform curriculum").
- **Gen-AI-Leader (S4 sub-track)** is the optional real-exam bridge (§2).
- **AIGP (S3)** absorbs anyone whose m6 questions turn out to be their day job.
- ABF **replaces nothing** — it's additive, and it's the lane the landing page's second door
  points at ([PRD-GROWTH.md](./PRD-GROWTH.md) §5).

## 8. Build cost & sequencing recommendation

**Low-medium, zero external dependencies, zero verification exposure** — same profile as APA,
so the same logic that put APA "in parallel" applies. **Recommendation: author B1 with S1** (the
first-party pair), immediately after S0 GH-500 ships. It is the only planned track that directly
serves the stated business goal; deferring it to the end of the practitioner program would defer
the funnel itself. Owner's call.

## 9. Key risk

**Condescension or hype — both kill it.** This audience detects being talked down to and being
sold to instantly. Mitigations: the tone rule (§2), recurring real-business examples (§4), honest
"when NOT to use AI" content (m1, m7 carry explicit anti-hype segments), and no Automatos mention
that isn't a hands-on step the learner benefits from. The platform pitch is the *experience*,
never the copy.

## 10. Acceptance (Ready gate)

`npm run validate` green (unique IDs, answerable knowledge checks) · renders on all surfaces
(minus exam/readiness, omitted by design) · every module has a working **🛠 Do it now** step
achievable on the free platform · the capstone produces the §4 artifacts · tone rule holds (no
unexplained acronym anywhere in the track — spot-check) · Gen-AI-Leader bridge links resolve ·
manifest entry under the `automatos` vendor (`trackId: ai-business`, code **ABF**,
`status: coming-soon` until authored).
