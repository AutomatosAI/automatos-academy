# AI Architect Roadmap — Staged & PRD-Ready

A stage-based execution plan you can lift directly into PRDs. Each **Stage = one PRD**. Every stage follows the Automatos loop — **Learn → Build → Decide → Prove → Ready** — and closes on an explicit *Ready gate* (acceptance criteria), so "done" is measurable, not vibes.

Cross-cutting workstreams (NotebookLM audio, active recall, portfolio, evals, cost) run *underneath* all stages and are defined once in §D.

---

## A. Master timeline

Durations assume ~6–8 focused hrs/week. Compress or stretch by adjusting the hours, not the sequence.

| Stage | Name | Duration | Primary credential/outcome | Sequencing logic |
|---|---|---|---|---|
| **S0** | Deepen the Core | 3–4 wks | Anthropic Dev Deep-Dives + **GH-500** | Build fluency under CCA-F before anything new |
| **S1** | Custom Automatos | 1–2 wks | Platform training + reference build | Consolidate on your own platform before heavy content |
| **S2** | AI Security | 3–4 wks | Certified AI Security Engineer + OWASP LLM | Bridges straight from GH-500 |
| **S3** | AI Governance | 3–4 wks | IAPP **AIGP** + ISO 42001 + EU AI Act | Enterprise/regulated positioning |
| **S4** | Cross-Vendor Fluency | 2 wks | OpenAI Academy + Gemini/Vertex + open-weight literacy | Platform-agnostic architect |
| **S5** | Cloud Specialization | 4–6 wks | **One** of AWS / Azure / GCP exam | Deliberately last — content-heavy |

**Rhythm rule:** alternate a heavy stage with a lighter/build stage to avoid burnout (S0→S1→S2→S3→S4→S5 already does this). Total ≈ 4–5 months part-time.

```
S0 ███████████░  Deepen the Core        (weeks 1–4)  ← detailed 2-week kickoff below
S1     ░░░████░   Custom Automatos       (weeks 4–5)
S2          ███████████  AI Security     (weeks 6–9)
S3                  ███████████  Governance (weeks 9–12)
S4                          ██████  Cross-Vendor (weeks 12–14)
S5                              ███████████████ Cloud (weeks 14–20)
```

---

## B. Reusable PRD template

Copy this skeleton per stage. Each stage in §E is pre-filled against it.

```
PRD: <Stage ID> — <Name>
Owner:            <you>
Status:           Not started / In progress / Ready
Duration/effort:  <weeks> / <hrs>

1. Objective        One sentence: the outcome, not the activity.
2. Background/Why    Why now, how it builds on prior stages.
3. In scope          Bullet list of what's covered.
4. Out of scope      Explicit exclusions (prevents scope creep).
5. Deliverables      Concrete artifacts produced.
6. Acceptance (Ready gate)  Testable criteria that close the stage.
7. NotebookLM assets Notebook name, sources, format, persona prompt, cadence.
8. Dependencies      What must be done first.
9. Risks / mitigations
10. Effort estimate  Course hrs + build hrs + exam prep hrs.
```

---

## C. The couple-of-weeks kickoff (Stage 0, day-by-day)

Assumes ~1–1.5 hrs on weekdays + one longer weekend block. Adjust to your calendar.

### Week 1 — Spin up systems + start the core

| Day | Focus | Output |
|---|---|---|
| **1 (Mon)** | Setup day. Enrol *Building with the Claude API*. Create Stage-0 Anki deck. Create NotebookLM "S0" notebook + load first sources. **Book GH-500 exam ~4 weeks out** (a booked date is the forcing function). | Systems live; exam date on calendar |
| **2 (Tue)** | Claude API: auth, messages, streaming. Generate first NotebookLM Deep Dive → gym audio. | Modules 1–2 done; first podcast |
| **3 (Wed)** | Claude API: tool use + prompt caching. Add Anki cards as you go. | Module 3 done |
| **4 (Thu)** | *Introduction to MCP*. Sketch your MCP server concept (what tool/resource/prompt). | MCP intro done; build spec |
| **5 (Fri)** | Finish *Intro to MCP*. Scaffold MCP server repo **with GHAS enabled** from commit 1. | Repo scaffolded + scanned |
| **Wknd** | Long block: MCP server **v0** (one working tool). Start *MCP: Advanced Topics*. | v0 running locally |

### Week 2 — Depth + first "Prove"

| Day | Focus | Output |
|---|---|---|
| **8 (Mon)** | Claude API production patterns: retries, rate limits, batching, error handling. Regenerate NotebookLM **Brief** for reinforcement. | Production module done |
| **9 (Tue)** | MCP server: add **resources + prompts**; test with MCP Inspector. | Server feature-complete |
| **10 (Wed)** | GH-500 prep: GHAS domains. Run code scanning + secret scanning on your MCP repo. | GHAS domain 1 |
| **11 (Thu)** | GH-500 prep: Dependabot, secure SDLC. Anki review session. | GHAS domain 2 |
| **12 (Fri)** | Lighter day: *Claude Code 101* + *Subagents*. Polish MCP server. | Agentic-workflow basics |
| **Wknd** | GH-500 **mock exam / scenario drill** → readiness score. Ship MCP server **v1** + write a short build note. | Readiness score; portfolio artifact #1 |
| **Day 14** | **Checkpoint:** if readiness ≥ target, keep the GH-500 date; else schedule a focused prep week. Decide S0 exit. | Go/no-go on exam |

> After Day 14 you're mid-Stage-0: finish the remaining Deep-Dive courses (Claude Code in Action, Agent Skills, optionally Bedrock/Vertex) and sit GH-500 on the booked date to close S0.

---

## D. Cross-cutting workstreams (always-on, all stages)

These are not stages — they run continuously. Reference them from every PRD.

**D1 · NotebookLM audio pipeline.** One notebook per stage. Source volume (not the length toggle) drives episode length — load 15–20 substantial sources for a 45–60 min gym listen. Formats: **Deep Dive** to learn, **Brief** to revise pre-exam, **Debate/Critique** for security & governance trade-offs. Set expertise = expert; keep the persona prompt < ~1,500 chars. Download as .wav → MP3 for offline. Free tier = 3 gens/day + 50 sources; Plus = 20/day + 300 sources. Use Claude to write the persona prompt.

**D2 · Active recall.** An Anki deck per stage, built as you learn. Automatos mock exams / scenario drills are the recall *gate* — a mock score is a pass/fail, not a formality.

**D3 · Portfolio (the "Prove").** One shippable artifact per stage (see each PRD). Projects beat badges; write a short note per build for visibility.

**D4 · Evals & observability.** Not a stage, a habit: instrument every build with tracing + a small eval set (correctness, latency, cost). This is the biggest gap in most cert paths and your clearest differentiator.

**D5 · Cost / FinOps.** Track token cost, caching hit-rate, and model routing on every build. Keep a running "cost per feature" note.

---

## E. The stages (PRD-shaped)

### Stage S0 — Deepen the Core

1. **Objective:** Convert CCA-F architecture judgment into demonstrable hands-on fluency with the Claude API, MCP, and secure-SDLC tooling.
2. **Why now:** You hold the architecture cert but not the build-level proof underneath it; GH-500 also seeds the security stage.
3. **In scope:** Anthropic Dev Deep-Dives (*Building with the Claude API*; *Intro to MCP*; *MCP: Advanced Topics*; *Claude Code 101*, *Claude Code in Action*, *Subagents*, *Agent Skills*); **GH-500 (GitHub Advanced Security)**; optionally **GH-200 (Actions)**; optionally *Claude with Amazon Bedrock* / *Claude via Vertex AI* to pre-load S5.
4. **Out of scope:** GH-900 / GH-100 (beneath current level unless enterprise-admin signal needed); new-vendor material (that's S4).
5. **Deliverables:** Completed Academy certificates; **GH-500 pass**; a running **MCP server** (tools + resources + prompts) in a GHAS-scanned repo.
6. **Ready gate:** GH-500 passed · MCP server demoable + Inspector-tested · Academy Deep-Dive certs earned · Anki deck ≥ 80% mature.
7. **NotebookLM:** Notebook `S0-core`. Sources: API course notes, MCP course pages, GHAS objective domains, your repo README. Persona: *"Assume CCA-F + GH-300. Skip basics; focus on production trade-offs, failure modes, and exam-critical distinctions."* Cadence: 1 Deep Dive at start, 1 Brief before GH-500.
8. **Dependencies:** None (entry stage).
9. **Risks:** API course is long (8+ hrs) → chunk it; don't let it block the MCP build. GH-300 changed Jan 2026 → verify current GH-500 objectives before prep.
10. **Effort:** ~12–16 course hrs + ~8 build hrs + ~6 exam-prep hrs.

### Stage S1 — Custom Automatos

1. **Objective:** Achieve working mastery of the Automatos platform and ship a reference build on it.
2. **Why now:** Consolidate on the platform you actually build on before disappearing into content-heavy external syllabi; reinforces CCA-F in a concrete product context.
3. **In scope:** Full Automatos platform training run through Learn→Build→Decide→Prove→Ready; one reference application.
4. **Out of scope:** External certifications.
5. **Deliverables:** Platform training complete; **reference build** deployed on Automatos.
6. **Ready gate:** Reference build live · training readiness score met · build note written.
7. **NotebookLM:** Notebook `S1-automatos`. Sources: platform docs, your build spec, training notes. Format: Deep Dive + a Debate on "when to use Automatos vs. raw API".
8. **Dependencies:** S0 (API/MCP fluency makes the platform build faster).
9. **Risks:** Scope creep on the reference build → cap it at one clear use case.
10. **Effort:** ~6–10 hrs.

### Stage S2 — AI Security

1. **Objective:** Be able to threat-model and harden LLM applications and infrastructure.
2. **Why now:** Direct continuation of GH-500's secure-SDLC mindset; high and rising market demand; complements the architect profile.
3. **In scope:** **Certified AI Security Engineer** (course + 30+ labs); **OWASP Top 10 for LLM Applications**; a red-team exercise against your own S0/S1 build.
4. **Out of scope:** General (non-AI) pentest certs.
5. **Deliverables:** Security cert; a **hardened LLM gateway**; a written **red-team report** on your own app.
6. **Ready gate:** Cert earned · gateway enforces input/output controls · red-team report lists findings + fixes · OWASP LLM Top 10 mappable from memory.
7. **NotebookLM:** Notebook `S2-security`. Sources: cert labs, OWASP LLM doc, your red-team notes. Format: **Debate** ("is prompt-injection defense solvable?") + Deep Dive.
8. **Dependencies:** S0 (GH-500, MCP server as the target to harden).
9. **Risks:** Labs can sprawl → time-box each lab; capture only exam-relevant takeaways in Anki.
10. **Effort:** ~10–14 course/lab hrs + ~6 build hrs.

### Stage S3 — AI Governance

1. **Objective:** Speak fluently to AI governance, risk, and compliance for regulated/enterprise buyers.
2. **Why now:** Converts technical credibility into enterprise-sales credibility; EU context is directly relevant to your region.
3. **In scope:** **IAPP AIGP**; **ISO/IEC 42001** auditor concepts; **EU AI Act** (risk tiers, obligations, timelines); GDPR × LLM intersection (PII in prompts, logging, data residency).
4. **Out of scope:** Non-AI privacy certs (CIPP/E etc.) unless a client needs them.
5. **Deliverables:** AIGP credential; a **governance pack** for one app (risk classification + model card + EU AI Act mapping).
6. **Ready gate:** AIGP passed · governance pack complete for one real app · can classify an app under the EU AI Act risk tiers unaided.
7. **NotebookLM:** Notebook `S3-governance`. Sources: AIGP body of knowledge, ISO 42001 summary, EU AI Act text/summaries, GDPR-for-AI notes. Format: **Critique** (surfaces obligations & gaps).
8. **Dependencies:** S2 helpful (security controls feed governance evidence).
9. **Risks:** Governance is dry → lean hard on Debate/Critique audio to keep engagement.
10. **Effort:** ~12–16 hrs (AIGP is content-dense).

### Stage S4 — Cross-Vendor Fluency

1. **Objective:** Be credibly platform-agnostic across the major model providers and the open-weight tier.
2. **Why now:** Enterprises value architects who can advise build-vs-buy and provider portability, not single-vendor loyalists.
3. **In scope:** **OpenAI Academy** (courses, no exam); **Google Gemini / Vertex AI** basics; **open-weight literacy** (Llama, Ollama, Hugging Face).
4. **Out of scope:** Deep fine-tuning research; a second heavyweight cloud exam (that's S5's single lane).
5. **Deliverables:** OpenAI Academy completion; your S1/S2 reference app **re-implemented against a second provider** (portability proof).
6. **Ready gate:** Same app runs on ≥ 2 providers · you can articulate cost/capability/data-residency trade-offs between them.
7. **NotebookLM:** Notebook `S4-vendors`. Sources: OpenAI Academy notes, Vertex docs, an open-weight setup guide. Format: **Debate** ("hosted vs. open-weight for enterprise").
8. **Dependencies:** S0 (API/MCP patterns transfer across providers).
9. **Risks:** Breadth without depth → the portability build keeps it concrete.
10. **Effort:** ~8–10 hrs.

### Stage S5 — Cloud Specialization *(pick ONE lane)*

1. **Objective:** Hold one recognized, proctored cloud AI credential matching where you deploy.
2. **Why now / last:** These exams are content-heavy and expensive; tackle them once §D systems are habitual and Bedrock/Vertex context (S0) is done.
3. **In scope — choose one:**
   - **AWS** — *Certified Generative AI Developer – Professional* ($300, 180 min, 75 Q; Bedrock-centric). Lighter: *ML Engineer – Associate* (MLA-C01, $150). *(ML Specialty retired Mar 2026.)*
   - **Azure** — *AI-102 (Azure AI Engineer Associate)*. *(Fundamentals AI-900 retires Jun 30 2026 → AI-901; skip the dead one.)*
   - **Google Cloud** — *Professional ML Engineer* ($200, 2-hr); or *Generative AI Leader* (lighter).
4. **Out of scope:** A second cloud lane. One is the signal; two is diminishing returns.
5. **Deliverables:** Cloud exam pass; a **production deploy** of your reference app on that cloud with evals + a cost dashboard.
6. **Ready gate:** Exam passed · app deployed with tracing + eval set + cost view · renewal date calendared.
7. **NotebookLM:** Notebook `S5-cloud`. Sources: chosen exam's objective domains, relevant Bedrock/Vertex Academy notes, your deploy runbook. Cadence: Deep Dive per domain + one full Brief the day before the exam.
8. **Dependencies:** S0 (Bedrock/Vertex course), §D4/D5 (evals + cost) mature.
9. **Risks:** Front-loading burnout — mitigated by placing it last. Objective drift — re-check the study guide before prep.
10. **Effort:** ~20–30 hrs (the heaviest stage).

> **⚠️ Open decision blocking S5 scope:** which cloud is your primary lane — **AWS, Azure, or GCP**? Everything else is lane-agnostic; this one choice fixes the S5 exam, cost, and objective set.

---

## F. Recertification & maintenance cadence

- Calendar every expiry the day you pass (cloud certs ~3 yrs).
- GH-300 objectives changed Jan 2026 — re-check vendor study guides before any resit or recommendation.
- Watch for the **next Anthropic tiers** (developer, advanced architect, seller) announced for later 2026 — as a CCA-F holder you're positioned for early access; slot the next architect/developer tier in as a future stage.
- Quarterly: regenerate a "state of my stack" NotebookLM Brief from updated sources to catch what moved.

---

## G. Open decisions / RAID

| Item | Type | Status | Notes |
|---|---|---|---|
| Primary cloud lane (AWS/Azure/GCP) | Decision | **Open** | Blocks S5 scope only |
| NotebookLM free vs. Plus | Decision | Open | Plus (20 gens/day, 300 sources) pays off from ~S2 |
| GH-200 (Actions) in S0 or skip | Decision | Open | Include if you own CI/CD; else defer |
| Hours/week commitment | Assumption | ~6–8 | Drives all durations in §A |
| Objective drift on vendor exams | Risk | Monitored | Re-check study guides pre-prep |

---

## H. How to turn this into PRDs

1. Each **§E stage → one PRD** using the §B skeleton (fields already filled).
2. Lift the §D workstreams into a shared "Ways of Working" doc referenced by all PRDs.
3. Use §A as the epic/roadmap view; §C as the Sprint-1 backlog.
4. Ready gates (field 6 in each stage) become your PRD acceptance criteria.
5. Resolve the §G cloud decision before writing the S5 PRD.
