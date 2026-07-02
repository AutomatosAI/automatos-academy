# Academy Strategy Review — 2026-07-02

**Reviewer:** Claude (Fable 5) · **Scope:** all of `docs/prds/`, `docs/roadmap/`, the master
[AI-Architect-Roadmap-Staged.md](./AI-Architect-Roadmap-Staged.md), the live engine
(`public/content/manifest.json`, 2 live tracks), and the stated goals:

> 1. Make the academy a top learning space for AI. 2. Use it as marketing for Automatos AI —
> teach what AI can do, then offer the tool. 3. Fix "people don't understand Automatos AI, or AI
> in general, or how to run their business with it." 4. Self-learning for Gerard + team (certs,
> skills). 5. LinkedIn credibility — certified founder who teaches.

---

## 1. Verdict

The work is strong — unusually strong on the parts most cert-prep products fake. But the plan as
written serves **goal 4 and 5 completely, goal 1 partially, and goals 2 and 3 barely**. Every
planned track targets *practitioners chasing credentials*; the person in your problem statement —
the business owner who doesn't understand AI — has **no track, no path, no entry point**. And the
marketing loop (teach → tool) is designed at the content level ("Apply it in Automatos") but has
**no distribution, no shareable artifact, and no measurement**, so it can't yet compound.

This pass closes those gaps with four new PRDs, a full new track (`ai-business/`), and edits to
the umbrella roadmap. Everything below explains why.

## 2. What's genuinely excellent — keep and defend

1. **The verification discipline** (roadmap §5: live-verify every credential fact, cite the URL,
   never assert from memory, no dumps). This is the quality bar competitors don't have. It caught
   two false "doesn't exist" claims. It should become a *public* trust feature, not just an
   internal rule — see PRD-OPS-FRESHNESS.
2. **Honest shapes.** Refusing to fake a blueprint for S2 (skills track until GAIPS publishes
   mechanics) is exactly right. Most competitors would have invented weights.
3. **Vendor-agnostic engine, content-as-data.** Adding a track is authoring, not engineering.
   That's the scaling decision that makes everything else cheap.
4. **The pedagogy** — Learn → Build → Decide → Prove → Ready, blueprint-weighted readiness, SM-2
   recall, branching scenarios. Coherent and real.
5. **The "Apply it in Automatos" thread.** Subtle, useful, non-salesy. The right marketing
   mechanic. (It just needs the other four loop stages around it — §4.)
6. **The module-file format** (`docs/roadmap/*/NN-*.md`) — paste-ready NotebookLM prompts of
   genuinely high prompt-engineering quality. This is a repeatable content factory.
7. **Reuse-driven sequencing** (GH-500 reuses GH-300 ~1:1; AIGP anchored to a published BoK).

## 3. The one big gap — you have two audiences and plan for one

Split your goals by who they're about and the mismatch is obvious:

| Audience | Their question | Serves your goal | What the plan gives them today |
|---|---|---|---|
| **Practitioners** (devs, architects, security, GRC) | "How do I get certified / skilled?" | #1, #4, #5 | CCA-F, GH-300, GH-500, AIGP, AI-Security, Cross-Vendor, APA — **everything** |
| **Operators** (owners, founders, team leads, non-technical professionals) | "What is AI, where does it fit *my business*, can I trust it?" | #2, #3 — **the Automatos customer** | **Nothing.** The nearest is Gen-AI-Leader, buried as an S4 sub-track |

"Teach people what AI can do, then offer them the tool" only converts if the people you teach are
the people who'd *buy the tool*. Cert-seekers are your peers, community, and future hires —
valuable, but they mostly aren't the confused SMB operator Automatos serves. The academy needs
**two named lanes**:

- **Practitioner lane** — the existing S0–S5 program. Credibility, community, talent, your own
  cert journey. Rigorous, exam-anchored where honest.
- **Operator lane** — new. Plain-language, jargon-free, outcome-first: *run your business with
  AI*. This is the actual top-of-funnel for Automatos, and it's also the "understand AI in
  general" education you keep finding missing in prospects.

**Built this pass:** [PRD-B1-AI-BUSINESS.md](./prds/PRD-B1-AI-BUSINESS.md) + a complete
[`docs/roadmap/ai-business/`](./roadmap/ai-business/) track (9 modules, same NotebookLM format,
every module ends in a do-it-in-Automatos step). First-party, no external verification burden,
buildable in parallel with APA exactly like S1.

The two lanes also fix the site's front door: a confused visitor should choose between two doors
("Run your business with AI" / "Get certified in AI") — not scan a vendor list. That's a copy/IA
change, not an engine change (PRD-GROWTH §5).

## 4. The marketing loop is missing four of its five stages

The thesis is a loop: **Reach → Teach → Show → Share → Measure**. Today only "Teach" and half of
"Show" exist:

| Stage | Status | Fix (this pass) |
|---|---|---|
| **Reach** — can anyone find it? | ❌ Hash-routed SPA = zero SEO; cert-prep is a search-driven category ("GH-500 study guide", "AIGP practice questions"). No sitemap, no schema, no per-track landing pages. | PRD-GROWTH §2 — static landing shells per track + sitemap + Course schema now; prerender later. Plus the learning-in-public calendar (§6 below). |
| **Teach** — is the content great? | ✅ Best-in-class plan | Keep the bar; WIP limit (§7). |
| **Show** — does it demo Automatos? | 🟡 "Apply it in Automatos" boxes + the tutor **is** an Automatos agent, but nobody says so | Make dogfooding explicit: "This academy runs on Automatos" (tutor callout, cert-watch agent, §5). |
| **Share** — does completion recruit the next learner? | ❌ No shareable artifact. Readiness/A+ exists; no certificate page, no LinkedIn Add-to-Profile, no OG images | PRD-CREDENTIALS — the compounding growth mechanic and *directly* your goal #5, for learners and for your team. |
| **Measure** — does academy → platform? | ❌ No analytics, no UTM discipline, no email capture. The thesis is currently unfalsifiable | PRD-GROWTH §3/§4 — privacy-clean events, UTM-tagged CTAs, email capture at badge claim + "notify me" on coming-soon tracks. |

## 5. Dogfood the platform — the academy is itself the demo

The strongest proof for a prospect isn't a lesson *about* Automatos — it's noticing the academy
**runs on it**:

- The **tutor** is already an Automatos workspace agent. Label it: *"You're talking to an
  Automatos agent right now — build your own in APA module 01."*
- The **freshness problem** (§6 of PRD-OPS-FRESHNESS) is a scheduled Automatos mission:
  *cert-watch* re-fetches every exam page quarterly, diffs the facts, files a report. That's a
  live, public, self-referential case study — and it feeds the newsletter.
- Future: badge issuance, content-pipeline missions, analytics digests — each one an APA/ABF
  case study.

Stated as a principle in the roadmap README now: *every academy operation should be an Automatos
showcase where sensible.*

## 6. Your cert journey is the content calendar (goal #5, systematized)

You're walking S0→S5 anyway. Each stage is a LinkedIn arc: *"I'm sitting GH-500 in 4 weeks — I
turned my entire prep into a free track, here's the 6-domain map."* → study-along posts → pass
post → track-launch post. Authentic founder-teacher story, zero extra study time, and each track
launch lands with an audience. PRD-GROWTH §6 sketches the 12-week calendar mapped to your actual
stage plan. Your team walking the same tracks = the "certified team" page + a case study each.

## 7. Risks you should manage deliberately

1. **WIP sprawl.** 7 planned tracks + 2 live, one founder, plus the platform's own 14-wave PRD
   program. The A+ claim dies on half-finished tracks. **Rule: one track in authoring at a time;
   finish CCA-F's open items (DNS/deploy, remaining video URLs) before S0 authoring starts.**
   "One excellent track beats ten skeletons" is already in BUILD_BRIEF §16 — hold your own line.
2. **Tone mismatch for the operator lane.** The manifest tagline — *"A+ prep. Only top people
   qualify."* — is right for exam tracks and wrong for the audience that already feels stupid
   about AI. Recommend a dual-lane tagline (owner call, copy options in PRD-GROWTH §5).
3. **Trademark/brand hygiene.** Vendor names in nominative use is fine, but add a standard
   disclaimer ("independent; not affiliated with or endorsed by Anthropic/GitHub/IAPP/Google")
   per track + site footer; link, never rehost, the IAPP BoK PDF; verify NotebookLM output terms
   for commercial publication. (PRD-GROWTH §8.)
4. **Freshness debt.** Verification is authoring-time only; exams refresh (GH-300 Jan 2026,
   GH-500 Jul 2026 renames, GAIPS GA 2026-07-28, AIGP BoK versioning). Without a cadence, the
   quality bar silently rots. (PRD-OPS-FRESHNESS.)
5. **Completion-rate reality.** Self-paced solo courses complete at single-digit rates. The
   cheap counters: visible streaks/readiness (built), shareable badges (PRD-CREDENTIALS),
   study-along cohorts on LinkedIn first — don't stand up an empty Discord (PRD-GROWTH §7).

## 8. What this pass adds/changes (the artifacts)

| Artifact | Type | Closes |
|---|---|---|
| [PRD-B1-AI-BUSINESS.md](./prds/PRD-B1-AI-BUSINESS.md) | new PRD | §3 operator lane |
| [`docs/roadmap/ai-business/`](./roadmap/ai-business/) — README + 9 modules | new track content | §3 |
| [PRD-CREDENTIALS.md](./prds/PRD-CREDENTIALS.md) | new PRD | §4 Share |
| [PRD-GROWTH.md](./prds/PRD-GROWTH.md) | new PRD | §4 Reach/Measure, §6, §7.2/7.3/7.5 |
| [PRD-OPS-FRESHNESS.md](./prds/PRD-OPS-FRESHNESS.md) | new PRD | §5, §7.4 |
| [PRD-ACADEMY-ROADMAP.md](./prds/PRD-ACADEMY-ROADMAP.md) | edited | lanes, B1 sequencing, companion PRDs |
| [`docs/roadmap/README.md`](./roadmap/README.md) | edited | track table, persona paths, dogfood principle |

## 9. Recommended order (owner's call)

1. **Now:** finish CCA-F open items → author S0 GH-500 (your exam is the forcing function) →
   ship PRD-CREDENTIALS v1 (badge page + LinkedIn link is days, not weeks, and every future
   completion compounds).
2. **Next:** B1 ai-business + S1 APA (the first-party pair; no external verification burden) +
   PRD-GROWTH v1 (landing shells, analytics, UTM, notify-me capture) alongside.
3. **Then:** S3 AIGP → S2 → S4, exactly as already sequenced. Freshness runbook starts the day
   two tracks are live; cert-watch agent when convenient (great APA capstone demo).

## 10. Open decisions for Gerard

1. **Approve the operator lane** (B1) and its position in the build order (recommended: with S1).
2. **Tagline/two-door home** — copy options in PRD-GROWTH §5.
3. **Badge honesty copy** — wording in PRD-CREDENTIALS §4 (completion ≠ the vendor credential).
4. **YouTube: unlisted vs public channel** — public turns every module video into a discovery
   surface; unlisted keeps the academy the only door. PRD-GROWTH §2.4 argues public.
5. Existing open decisions stand (S2 skills shape ✓ recommended, Gen-AI-Leader sub-track ✓
   recommended, S5 cloud lane deferred, NotebookLM tier).
