# PRD — Academy Track Roadmap (AI Architect program, S0–S4)

**Status:** planning · **Owner:** Gerard · **Last updated:** 2026-07-02
**Supersedes for scope:** the vendor-by-vendor view in [PRD-EXPANSION.md](./PRD-EXPANSION.md) (still valid for the add-a-track mechanics).
**Per-stage PRDs:** [S0 GH-500](./PRD-S0-GH500.md) · [S1 APA](./PRD-S1-APA.md) · [S2 AI-Security](./PRD-S2-AI-SECURITY.md) · [S3 AIGP](./PRD-S3-AIGP.md) · [S4 Cross-Vendor](./PRD-S4-CROSS-VENDOR.md) · [B1 AI-Business](./PRD-B1-AI-BUSINESS.md) *(Operator lane)*
**Companion PRDs (cross-cutting, added 2026-07-02):** [Credentials](./PRD-CREDENTIALS.md) · [Growth](./PRD-GROWTH.md) · [Ops/Freshness](./PRD-OPS-FRESHNESS.md) — see [STRATEGY-REVIEW-2026-07-02.md](../STRATEGY-REVIEW-2026-07-02.md)

## 1. Why

The academy ships two tracks today — **CCA-F** (flagship) and **GH-300** (just built). This roadmap
expands it into a full **AI Architect program**: a staged path (S0–S4) a learner walks from the
Claude architecture cert outward through GitHub security, own-platform mastery, AI security, and AI
governance. Source = Gerard's *AI Architect Roadmap*, reframed from a personal study plan into the
**academy's product backlog** — each stage becomes a cert-prep (or skills) track on the same engine.

**Cloud specialization (S5) is deferred** by owner decision — it's content-heavy, lane-dependent,
and best sequenced last. It appears here only as a future stage, no PRD yet.

**Two lanes (added 2026-07-02).** The S-stages above all serve **practitioners** chasing
credentials. The academy's second audience — **operators** (owners, team leads, non-technical
professionals; the people who "don't understand AI or how to run their business with it", i.e.
the actual Automatos prospect) — gets its own lane, opened by **B1 AI Business Foundations**
([PRD-B1-AI-BUSINESS.md](./PRD-B1-AI-BUSINESS.md)). Rationale:
[STRATEGY-REVIEW-2026-07-02.md](../STRATEGY-REVIEW-2026-07-02.md) §3.

## 2. Pedagogy alignment (why the fit is natural)

Gerard's roadmap runs every stage through **Learn → Build → Decide → Prove → Ready** — which *is* the
academy's own model. So each stage maps cleanly onto the engine: lessons (Learn), labs (Build),
quizzes (Decide), scenarios (Prove), mock-exam + readiness gate (Ready). The roadmap's cross-cutting
workstreams (§D) map to features we already have or plan:

| Roadmap workstream | Academy feature |
|---|---|
| NotebookLM audio pipeline | The video/NotebookLM pipeline ([NOTEBOOKLM_PROMPTS.md](../NOTEBOOKLM_PROMPTS.md)) |
| Active recall (Anki) | The quiz engine + SM-2 spaced repetition (`store.js`) |
| Portfolio ("Prove") | Labs (hands-on artifacts per domain) |
| Evals & observability | Mock exam + readiness scoring |
| Cost / FinOps | (content topic inside relevant tracks) |

## 3. Stage → track map (verification status baked in)

| Stage | Academy track | Credential | Real proctored exam? | Verified | Build cost |
|---|---|---|---|---|---|
| **S0** | GitHub Advanced Security | **GH-500** | ✅ yes | **live-verified 2026-07-01** (MS Learn, refreshed Jul 2026) | **Low** — reuses GH-300 ~1:1 |
| **S1** | Automatos Platform Architect | **APA** (first-party) | first-party (we define it) | n/a | Medium — own-platform blueprint |
| **S2** | AI Security | GAIPS skeleton + OWASP-LLM | ❌ no clean MCQ blueprint yet (GAIPS lab-format, not GA until 2026-07-28) | **live-checked** | **Skills track** + upgrade trigger |
| **S3** | AI Governance | **AIGP** (IAPP) | ✅ yes | **live-verified 2026-07-01** (IAPP, BoK v2.0.1: 100Q/2.75h/300-of-500, 4 domains) | Medium |
| **S4** | Cross-Vendor Fluency | skills + **Gen-AI-Leader** sub-track | ✅ Gen-AI-Leader is a real exam ($99/90m/4 domains); OpenAI/open-weight none | **live-verified** | Skills + optional exam sub-track |
| **B1** | AI Business Foundations (Operator lane) | **ABF** (first-party, no exam) | first-party (we define completion) | n/a | Low-Medium — first-party like APA; 9 modules authored 2026-07-02 |
| ~~S5~~ | ~~Cloud Specialization~~ | one of AWS/Azure/GCP | ✅ (per lane) | **deferred** | Deferred |

## 4. Sequencing (product logic, not personal study order)

1. **S0 GH-500 — build first.** Live-verified and structurally identical to GH-300 (100 min, 700/1000,
   Pearson VUE, 6 domains, same 5 languages). The GH-300 pipeline reuses almost unchanged. Fastest,
   safest win.
2. **S3 AIGP — build second.** Live-verified, published Body of Knowledge, and the clearest
   *differentiator* (governance is underserved; regulated/EU buyers value it).
3. **S1 APA — in parallel.** First-party, no external dependency, activates the existing
   `automatos/platform-architect` manifest stub. We control the blueprint end-to-end.
3b. **B1 ABF — with S1 (recommended).** Same build profile as APA (first-party, zero external
   verification), but it's the only track serving the *operator* audience — the stated business
   goal. Module prompts are already authored ([`docs/roadmap/ai-business/`](../roadmap/ai-business/));
   deferring it defers the funnel itself. Owner's call on exact timing
   ([PRD-B1](./PRD-B1-AI-BUSINESS.md) §8).
4. **S2 AI Security — skills track (live-checked).** No candidate (GIAC GAIPS, CAISP) offers a clean
   weighted MCQ blueprint — GAIPS isn't GA until 2026-07-28 and both are hands-on lab exams. Build as
   a skills track (GAIPS 8-domain skeleton + OWASP LLM Top 10 (2025) + MITRE ATLAS + NIST AI 600-1);
   re-check GAIPS after GA and promote to exam-prep if it publishes mechanics.
5. **S4 Cross-Vendor — skills track + a bonus real-exam sub-track.** OpenAI/open-weight have no exam →
   skills track. But live verification found **Google "Generative AI Leader" is a real, self-enrollable
   proctored exam** ($99, 90 min, 4 weighted domains) that fits the engine — recommend including it as
   an exam sub-track. (OpenAI stays parked — [PRD-OPENAI-PARKED.md](./PRD-OPENAI-PARKED.md).)

## 5. Verification discipline (hard rule — we got burned)

An offline research agent (early-2025 cutoff, no live fetch) reported that GH-500 "doesn't exist" and
that AIGP "doesn't exist" — **both false**, caught by live WebFetch on the vendor pages. Rule for
every stage PRD: **verify each credential against the live official page, cite the URL, and mark
confidence. If it can't be confirmed live, say so — never assert existence, price, or a blueprint
from model memory.** This is the same discipline that made CCA-F and GH-300 accurate.

## 6. What each stage PRD must contain (the shape)

Model on [PRD-COPILOT-GH300.md](./PRD-COPILOT-GH300.md): verified exam facts, blueprint → domains with
normalized weights (sum 1.0), per-domain content plan, official source-library seeds (Firecrawl
targets), NotebookLM video plan, and a Ready-gate/acceptance section. First-party tracks (APA) define
their own blueprint; no-exam tracks (S4) use a skills-track shape (no mock exam / readiness gate).

## 7. Open decisions (owner)

- **B1 Operator lane** — approve ABF + its build slot (recommended: with S1). Also the two-door
  home + tagline change it implies ([PRD-GROWTH.md](./PRD-GROWTH.md) §5).
- **Credentials v1 timing** — badge/certificate/LinkedIn loop before or with S0 launch
  (recommended: before — every completion after it compounds; [PRD-CREDENTIALS.md](./PRD-CREDENTIALS.md)).
- **S2 shape** — confirmed skills track (no clean MCQ blueprint exists yet); OK to ship as skills + re-check GAIPS after its 2026-07-28 GA?
- **S4 Gen-AI-Leader sub-track** — include Google's Generative AI Leader as a real-exam sub-track now (recommended — verified $99 blueprint, reuses the flow), or spin out later?
- **Cloud lane (S5, later)** — AWS / Azure / GCP. Fixes the S5 exam when we get there; not needed now.
- **NotebookLM tier** — free vs Plus (Plus pays off once several tracks are generating video).

## 8. Out of scope (this planning pass)

Authoring any track's domain JSON, recording videos, or building the APA blueprint content. This pass
produces the **roadmap + per-stage PRDs + research seeds** only, per owner direction.
