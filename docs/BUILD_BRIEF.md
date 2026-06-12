# Keystone — Master Build Brief

> **Codename:** Keystone *(placeholder — rename freely; it's the wedge stone that locks an arch, and the thing that locks in a pass)*
> **For:** Claude Fable 5, building autonomously in a fresh repo
> **Author of brief:** Claude Opus 4.8, grounded in live research + current Anthropic platform facts (June 2026)
> **Owner:** Gerard Kavanagh
> **Status:** Ready to build. Phase 1 = ship the Anthropic CCA‑F track end-to-end.

---

## 0. How to use this document

This is the entire spec. Read it once, top to bottom, then build. There is a paste-ready kickoff prompt in **§1**. Everything after it is the binding specification: architecture, data model, surfaces, content, design, phases, and a hard definition of done.

Two rules that override your defaults:

1. **Think big, then ship a vertical slice.** The end state is "the best certification-prep platform that has ever existed." But Phase 1 must deliver one fully-authored, working track (Anthropic CCA‑F) — real lessons, real quiz engine, real mock exam, real videos — not ten half-built features. Depth over breadth.
2. **Build the engine vendor-agnostic from line one, author only Anthropic content now.** OpenAI, GitHub Copilot, AWS, Google tracks must drop in as *data*, with zero engine rewrite. If you ever find yourself hardcoding the word "Anthropic" or "Claude" into the engine, stop — it belongs in content. (See **§4**.)

---

## 1. Kickoff prompt (paste this to start)

> You are building **Keystone**, a vendor-agnostic certification-prep platform, in a new standalone Next.js repo. The first and only fully-authored track for now is the **Claude Certified Architect – Foundations (CCA‑F)** exam. Your job: take a motivated engineer from zero to *passing*, using tutorials, source papers, full-length timed mock exams, interactive architecture-scenario drills, hands-on labs against the real Claude API, a video hub, a curated resource graph, spaced-repetition review, and a personal readiness score.
>
> The platform engine knows nothing about Anthropic specifically — it renders any vendor/track/domain/lesson/question/scenario/lab from a typed content model (§4). Anthropic is simply the first track populated with real content. Adding OpenAI or Copilot later must be a content-authoring task, never an engineering one.
>
> Build for the spec below. Where it specifies the real exam blueprint, treat it as authoritative but **verify every technical claim in the curriculum against the live Anthropic docs** listed in §15 before publishing a lesson — the platform moves fast and a cert-prep site that teaches stale API shapes is worse than useless. Where the spec gives a TypeScript schema, implement it exactly. Where it gives acceptance criteria (§13), they are your definition of done.
>
> Start with Phase 1 (§12). Stand up the repo, the content model, the engine, then author the Anthropic track domain by domain against the blueprint in §3. Ask me nothing you can decide from this brief; flag only genuine forks.

---

## 2. The vision (what "best that ever existed" means)

Most cert-prep sites are a PDF dump and a multiple-choice quiz. Keystone is a **learning system** with seven reinforcing surfaces, all wired to one progress model:

1. **Curriculum** — the spine. Every domain from the official blueprint, weighted exactly as the exam weights it, broken into lessons with a clear learning objective and a "you can now…" outcome.
2. **Tutorials (lessons)** — MDX. Prose + runnable code + diagrams + callouts + an inline knowledge-check at the end of each. Written for an engineer who learns by doing.
3. **Source library** — the canonical papers, docs, and primary sources behind each concept (Anthropic's own docs, the MCP spec, the Agent SDK, key research). Annotated, not just linked. "Read the thing the exam is actually testing."
4. **Video hub** — Gerard's 10 NotebookLM videos embedded per-domain, plus a documented pipeline (§11) for producing more. Video is a first-class learning mode, not a bolt-on.
5. **Assessment engine** — three tiers: (a) per-lesson knowledge checks, (b) per-domain quizzes, (c) full **60-question, 120-minute, proctored-style timed mock exams** that mirror the real format including the 4-of-6 scenario structure.
6. **Scenario simulator** — the exam's defining feature is 6 real-world architecture scenarios. Keystone makes them interactive: a branching decision flow where you make architectural calls (which model, how to manage context, how to design the tool surface, where to put the human-in-the-loop) and get graded reasoning, not just a letter.
7. **Hands-on labs** — the exam rewards people with ~6 months of real hands-on time. So Keystone includes guided labs: build a tool-use loop, wire an MCP server, design a CLAUDE.md, run a multi-agent workflow, set up prompt caching. Real code, real API, copy-paste-run.

Tying it together: a **readiness model** — per-domain mastery, weighted to the blueprint, spaced-repetition review queue, and a single honest "you are X% ready, your weakest domain is Y" score. Plus a **resource graph** — a navigable map of how every concept connects (Gerard already has a `graphify` skill; the curriculum can be emitted as a graph).

---

## 3. Ground truth — the real exam (Phase-1 target)

**This is the single most important section. Author the Anthropic track against this, not against a generic idea of "AI knowledge."**

**Credential:** Claude Certified Architect – Foundations (**CCA‑F**). Anthropic's first official technical certification, launched **2026‑03‑12**. Validates that an engineer can design and ship production-grade Claude applications at enterprise scale.

**Format (mirror this exactly in mock-exam mode):**
- 60 questions, 120 minutes
- Online-proctored, closed-book
- Scored on a **1000-point scale**, **720 to pass** (≈72%)
- Presents **4 of 6** possible architecture scenarios, randomly selected; each scenario is a real-world context requiring architectural decisions
- Recommended prep: ~6 months hands-on Claude API + Claude Code experience

**The five weighted domains (the blueprint — build curriculum modules 1:1 with these and weight question banks to match):**

| # | Domain | Weight | What it tests (author lessons to cover all of this) |
|---|--------|--------|------------------------------------------------------|
| **D1** | **Agentic Architectures** | **27%** | Agent SDK; the agentic loop; multi-agent orchestration & coordinator/sub-agent patterns; workflows vs. agents (when NOT to build an agent); session management; task decomposition; hooks; when a single API call or a code-orchestrated workflow beats an open-ended agent. |
| **D2** | **Tool Design & MCP Integration** | **18%** | Tool definition best practices (prescriptive descriptions, when-to-call); structured error responses; `tool_choice`; bash vs. dedicated tools; Model Context Protocol — servers, configuration, transport, auth; Claude's built-in/server-side tools; tool search for large tool sets. |
| **D3** | **Agent Operations & Claude Code** | **20%** | Claude Code config; CLAUDE.md hierarchy & precedence; custom commands, skills, subagents, hooks; plan mode; iterative refinement; CI/CD integration; batch processing; MCP in Claude Code. |
| **D4** | **Prompt Engineering** | **20%** | System vs. user roles; structured outputs; few-shot; XML structuring; thinking/effort; prompt caching mechanics; instruction-following calibration on modern models; eval-driven prompt iteration; avoiding over-/under-triggering. |
| **D5** | **Context Management & Reliability** | **15%** | Context windows & token budgeting; compaction; context editing; progressive-summarization risks; context positioning & degradation; error propagation; escalation & human-review patterns; information provenance; caching for reliability/cost. |

> **Weights sum to 100%.** They were reconstructed from multiple secondary sources (community guides + practice-test sites). **Before launch, verify the exact blueprint, weights, question count, and pass mark against the live Anthropic Academy / Skilljar source** (§15). Treat the live source as truth if it differs; the engine reads weights from data (§4) so a correction is a content edit, not a rebuild.

**Legal / ethical guardrail (non-negotiable):** Do **not** scrape, reproduce, or reconstruct the actual proctored exam questions — that violates the exam terms and produces brittle, useless "brain-dump" prep. **Author original practice questions and scenarios written to the blueprint and grounded in the official docs.** Quality bar: a learner who can answer Keystone's questions *and explain why* will pass the real exam because they understand the material, not because they memorized leaked items.

---

## 4. The vendor-agnostic content model (the load-bearing decision)

Everything renders from this. The engine imports it; it imports nothing about any specific vendor. Implement these types (TypeScript, Zod-validated at build time). Content lives as MDX + JSON/YAML frontmatter under `/content`, parsed into these shapes.

```ts
// The whole platform is a tree of these. The engine never references a vendor by name.

type Vendor = {
  id: string;                 // "anthropic" | "openai" | "github-copilot" | ...
  name: string;               // "Anthropic"
  brand: BrandTokens;         // colors, logo, accent — drives per-vendor theming
  tracks: Track[];
};

type Track = {
  id: string;                 // "cca-f"
  vendorId: string;
  name: string;               // "Claude Certified Architect – Foundations"
  status: "live" | "beta" | "coming-soon";
  exam: ExamSpec;             // format, pass mark, timing — see below
  domains: Domain[];          // weighted; weights must sum to 1.0 (validated)
  officialResources: Resource[];
};

type ExamSpec = {
  questionCount: number;      // 60
  durationMinutes: number;    // 120
  scoreScale: number;         // 1000
  passingScore: number;       // 720
  proctored: boolean;         // true
  closedBook: boolean;        // true
  scenarioPool?: number;      // 6  (total scenarios authored)
  scenariosPresented?: number;// 4  (shown per attempt)
  recommendedPrep?: string;   // "~6 months hands-on API + Claude Code"
};

type Domain = {
  id: string;                 // "d1-agentic-architectures"
  trackId: string;
  name: string;
  weight: number;             // 0.27 — drives question allocation & readiness math
  objectives: string[];      // measurable learning objectives
  lessons: Lesson[];
  scenarios: Scenario[];
  labs: Lab[];
  resources: Resource[];
  videos: VideoRef[];
};

type Lesson = {
  id: string;
  domainId: string;
  title: string;
  estMinutes: number;
  body: MDX;                  // prose + code + diagrams + callouts
  objective: string;         // "After this you can …"
  knowledgeCheck: Question[]; // 2–4 inline at the end
  prerequisites?: string[];   // lesson ids — drives the graph + suggested path
};

type Question = {
  id: string;
  domainId: string;
  type: "single" | "multi" | "scenario-step";
  difficulty: 1 | 2 | 3;
  stem: string;               // MDX (can include a code block)
  options: { id: string; text: string; correct: boolean }[];
  explanation: MDX;           // WHY each option is right/wrong — the actual teaching
  sourceRefs: string[];       // resource ids grounding the answer (provenance)
};

type Scenario = {              // the exam's defining feature, made interactive
  id: string;
  domainIds: string[];        // scenarios are usually cross-domain
  title: string;              // "Design a customer-support agent for a bank"
  context: MDX;               // the real-world brief
  steps: ScenarioStep[];      // branching architectural decisions
};

type ScenarioStep = {
  id: string;
  prompt: string;             // "How should this agent manage context across a 200-turn session?"
  choices: {
    id: string; text: string;
    verdict: "best" | "viable" | "wrong";
    rationale: MDX;           // graded reasoning, not just right/wrong
    next?: string;            // branch to next step id
  }[];
};

type Lab = {                   // hands-on; the exam rewards real experience
  id: string;
  domainId: string;
  title: string;              // "Build a tool-use loop with structured error handling"
  goal: string;
  steps: MDX;                 // guided, copy-paste-run against the real API
  starterRepo?: string;       // optional gist/stackblitz link
  checklist: string[];        // self-verify "did it work"
};

type Resource = {
  id: string;
  title: string;
  url: string;
  kind: "official-doc" | "paper" | "spec" | "blog" | "video" | "repo" | "tool";
  annotation: MDX;            // WHY it matters / what to extract — never a bare link
  domainIds: string[];
};

type VideoRef = {
  id: string;
  title: string;
  provider: "youtube";        // unlisted embeds (Gerard's choice)
  url: string;                // youtube watch/embed URL
  durationSec?: number;
  domainIds: string[];
  sourceNotebook?: string;    // which NotebookLM notebook produced it (for re-gen)
  status: "published" | "placeholder"; // placeholder = slot exists, URL pending
};

type BrandTokens = {
  primary: string; accent: string; logo: string; font?: string;
};
```

**Why this shape:** the engine's pages (`/[vendor]/[track]/[domain]/[lesson]`, exam mode, scenario sim, readiness dashboard) all consume this tree. To add OpenAI, you create `content/openai/...` with the same frontmatter — the engine renders it with zero changes. **Validate at build** that every track's domain weights sum to 1.0 and every `sourceRefs`/`prerequisites` id resolves.

---

## 5. Stack & repo

- **Next.js (App Router) + TypeScript**, deployable to Vercel. MDX for content (`next-mdx-remote` or `@next/mdx` + `contentlayer`-style typed pipeline; if Contentlayer is unmaintained at build time, hand-roll a `gray-matter` + `zod` content loader — do not block on a library).
- **Tailwind v4 + shadcn/ui** for the component system (Gerard has a tailwind-v4-shadcn setup skill — follow its `@theme inline` + CSS-variable pattern).
- **Content as files, not a DB**, for Phase 1: `/content/<vendor>/<track>/<domain>/...` MDX + frontmatter. Progress/state is **local-first** (localStorage/IndexedDB) so it works with no backend and no login. Leave a clean `ProgressStore` interface so a synced backend (Supabase) can drop in later without touching UI.
- **Quiz/exam engine, scenario engine, readiness math:** pure TypeScript modules, fully unit-tested (Vitest). These are the crown jewels — 80%+ coverage, table-driven tests.
- **Code samples in lessons** run via embedded snippets + optional StackBlitz/sandbox links; do not build a server-side code executor in Phase 1.
- **Search:** client-side (FlexSearch/Pagefind) over all lessons/resources/questions.
- **Analytics:** privacy-respecting, self-hostable (Plausible-style) — optional, behind a flag.

Recommended structure:

```
keystone/
  app/                       # routes (see §9)
  components/                # design system + surface components
  lib/
    content/                 # loader + zod schemas (§4)
    engine/
      quiz.ts                # selection, scoring, mastery
      exam.ts                # 60q/120min mock, 4-of-6 scenario pick
      scenario.ts            # branching graph evaluation
      readiness.ts           # weighted mastery + spaced repetition (SM-2-ish)
    progress/                # ProgressStore interface + localStorage impl
    graph/                   # curriculum → graph emitter (feeds resource map)
  content/
    anthropic/
      cca-f/
        track.yaml           # ExamSpec + domain weights
        d1-agentic-architectures/
          _domain.yaml
          lessons/*.mdx
          questions/*.yaml
          scenarios/*.yaml
          labs/*.mdx
          resources.yaml
          videos.yaml
        d2-tools-mcp/ ...
        d3-agent-ops-claude-code/ ...
        d4-prompt-engineering/ ...
        d5-context-reliability/ ...
    openai/                  # empty shell — track.yaml with status: coming-soon
    github-copilot/          # empty shell
  content-authoring/
    AUTHORING.md             # how to add a lesson/question/scenario (§7)
    VIDEO_PIPELINE.md        # NotebookLM → YouTube → registry (§11)
    QUESTION_STYLE.md        # how to write original, blueprint-grounded items (§3 guardrail)
  tests/
```

---

## 6. The seven surfaces (build all; Phase-1 depth on Anthropic)

1. **Curriculum / track home** — domain cards weighted to the blueprint (D1 visually larger/first), per-domain progress rings, suggested learning path, "start here." Shows the ExamSpec (60q/120m/720) prominently.
2. **Lesson reader** — clean long-form MDX: sticky TOC, prev/next, est. time, code blocks with copy + syntax highlight, callout components (Note/Warning/ExamTip/Gotcha), diagram support (Mermaid), inline knowledge-check at the end that writes to progress.
3. **Source library** — filterable resource index (by domain, by kind), each with an annotation explaining what to extract. A "read these first" curated path per domain.
4. **Video hub** — per-domain video sections + a top-level "watch the series" view. Embeds unlisted YouTube. Placeholder slots render a tasteful "video coming" card so the IA is complete before all 10 URLs are in.
5. **Assessment** — three modes:
   - *Knowledge check* (inline, per lesson)
   - *Domain quiz* (10–20 Q, immediate explanations)
   - *Mock exam* (**60 Q, 120-min countdown, closed-book UI, scenario-weighted, 4 of 6 scenarios drawn, score /1000, pass at 720**, then a full review with per-domain breakdown and links back to weak-area lessons)
6. **Scenario simulator** — pick a scenario, walk the branching decisions, get graded rationale at each step, end with a scored architectural "debrief." This is the signature feature — make it excellent.
7. **Readiness dashboard** — single honest score, per-domain mastery bars (weighted), spaced-repetition review queue ("12 cards due"), weakest-domain callout, exam-day checklist, and an estimated "ready / not ready" verdict with the reasoning shown.

---

## 7. Content authoring system

Author content as files; the system enforces quality:

- **Schema validation at build** (Zod): missing fields, broken refs, weights ≠ 1.0, orphan questions → build fails with a clear message.
- **`AUTHORING.md`** documents the frontmatter for each content type and a worked example.
- **`QUESTION_STYLE.md`** codifies the §3 guardrail: original items, grounded in `sourceRefs`, every option explained, difficulty tagged, mapped to a domain. No leaked-exam content, ever.
- **Provenance is mandatory:** every question and scenario carries `sourceRefs` into the resource library. This is both a teaching feature (learner can verify) and the thing that keeps the content honest and current.
- Content is **hot-reloadable** in dev so authoring is fast.

---

## 8. Readiness & spaced repetition (the retention engine)

- **Mastery per domain** = f(lessons completed, quiz accuracy, recency) — weighted by blueprint weight to produce one overall readiness %.
- **Spaced repetition:** missed questions and key concepts enter an SM-2-style review queue; the dashboard surfaces what's due. Getting an item right repeatedly increases its interval.
- **Honest verdict:** "ready" requires per-domain mastery above a threshold *and* a passed mock at full length — not just clicking through lessons. Show the math; never fake-celebrate.
- All of this runs on the local `ProgressStore`; no login required.

---

## 9. Information architecture / routes

```
/                                   # platform landing — vision, pick a track
/tracks                             # all vendors/tracks (Anthropic live; others "coming soon")
/[vendor]/[track]                   # track home / curriculum (weighted domain map)
/[vendor]/[track]/[domain]          # domain overview (lessons, videos, labs, resources)
/[vendor]/[track]/[domain]/[lesson] # lesson reader
/[vendor]/[track]/library           # source library (annotated resources)
/[vendor]/[track]/videos            # video hub
/[vendor]/[track]/labs              # hands-on labs index
/[vendor]/[track]/scenarios         # scenario simulator index
/[vendor]/[track]/scenarios/[id]    # a scenario run
/[vendor]/[track]/exam              # mock-exam launcher
/[vendor]/[track]/exam/[attemptId]  # in-progress / review
/[vendor]/[track]/readiness         # dashboard
/[vendor]/[track]/graph             # resource/concept graph
/search
```

The `[vendor]/[track]` prefix is what makes multi-vendor free: the same routes serve OpenAI the day its content exists.

---

## 10. Design direction

Not generic AI-slop. This is a serious credential-prep tool for senior engineers — it should feel like a precision instrument, not a bootcamp landing page.

- **Distinctive, restrained, technical.** Strong typographic hierarchy, generous whitespace, a real type system (avoid Inter/Roboto defaults — pick something with character). Dark mode first-class.
- **Per-vendor theming via `BrandTokens`** so Anthropic feels like Anthropic and a future OpenAI track feels like OpenAI — same engine, different skin.
- **Information-dense where it counts** (dashboard, exam review) and **calm where you read** (lesson reader).
- Diagrams are first-class (Mermaid). Code is beautiful and copyable.
- Micro-interactions on progress (rings filling, mastery climbing) — earned, not gratuitous.
- Use Gerard's `frontend-design` / `ui-ux-pro-max` skills for the aesthetic pass. Reference, don't imitate, Anthropic's own docs design.

---

## 11. The "make more videos" pipeline (NotebookLM → YouTube → registry)

Gerard produced the initial 10 videos with NotebookLM. The platform must (a) host them and (b) teach the repeatable process so the library grows. Ship a `content-authoring/VIDEO_PIPELINE.md` **and** a `/[vendor]/[track]/videos/produce` page documenting the SOP:

1. **Source:** assemble inputs for a NotebookLM notebook — the domain's lesson MDX, the official Anthropic docs for that domain (§15), Gerard's notes. One notebook per domain keeps videos focused.
2. **Generate:** create a NotebookLM **Video Overview** for the topic; iterate the prompt/focus until the narrative matches the lesson's learning objective.
3. **Export:** download the MP4.
4. **Publish:** upload to YouTube as **unlisted**; grab the URL.
5. **Register:** add a `VideoRef` to the domain's `videos.yaml` (title, url, domainIds, `sourceNotebook`, `status: published`). The hub picks it up automatically.
6. **Map:** each video maps to one or more domains; the hub renders them in-context inside the relevant domain.

Seed the registry now with **10 placeholder `VideoRef` entries** (`status: placeholder`) mapped across the five domains (intro + the heaviest domains get coverage first: D1, D3, D4). Gerard fills in titles/URLs as he uploads; the IA is complete from day one.

---

## 12. Build phases

**Phase 0 — Foundation (engine, no content):**
- Repo, stack, CI (lint + typecheck + Vitest), Tailwind v4 + shadcn theme, deploy preview.
- Content model (§4) + Zod validation + content loader.
- `ProgressStore` (localStorage) + the three engine modules (`quiz`, `exam`, `scenario`, `readiness`) with unit tests.
- Route skeleton (§9) rendering from empty/fixture content.

**Phase 1 — Ship the Anthropic CCA‑F track (the real deliverable):**
- Author all five domains against §3: lessons, knowledge checks, domain quizzes.
- A **question bank** large enough to assemble a full 60-Q mock weighted to the blueprint (target ≥120 quality items so a mock can be drawn without repeats; difficulty-balanced).
- **6 authored scenarios** (so exam mode can draw 4); each playable in the simulator.
- ≥1 hands-on lab per domain (5 total minimum).
- Source library populated with the real §15 resources, annotated.
- Video hub with 10 placeholder slots wired.
- Full mock-exam mode (60/120/720, 4-of-6) + readiness dashboard working end-to-end.
- Landing page + track home that sell the vision.

**Phase 2 — Polish & retention:**
- Spaced repetition live, resource/concept graph view, search, exam-day checklist, shareable readiness badge, accessibility pass (axe clean), perf pass.

**Phase 3 — Multi-vendor proof:**
- Stand up an `openai/` or `github-copilot/` track shell end-to-end with even one authored domain — *to prove the engine needs zero changes*. This is the test that §4 succeeded.

---

## 13. Definition of done (acceptance criteria — Phase 1)

- [ ] A new visitor can land, pick the Anthropic CCA‑F track, and see all 5 domains weighted to the real blueprint (27/18/20/20/15 verified against the live source).
- [ ] Every domain has complete lessons with working knowledge-checks that move the readiness needle.
- [ ] **Mock-exam mode** runs a real 60-question, 120-minute, closed-book session, draws 4 of 6 scenarios, scores /1000, passes at 720, and produces a per-domain review linking back to weak lessons.
- [ ] **Scenario simulator** plays all 6 scenarios with branching, graded rationale.
- [ ] ≥5 hands-on labs run against the real current Claude API with copy-paste-correct code (model IDs and API shapes per §14 — verified, not from memory).
- [ ] Source library has the real §15 resources, each annotated.
- [ ] Video hub shows 10 domain-mapped slots; published ones embed, placeholders render cleanly.
- [ ] Readiness dashboard gives one honest score + weakest-domain guidance; verdict requires a passed full mock, not just lesson clicks.
- [ ] Engine modules ≥80% unit-test coverage; build fails on schema/weight/ref violations.
- [ ] Zero "Anthropic"/"Claude" strings in `lib/engine` or `lib/content` (grep-clean) — proof the engine is vendor-agnostic.
- [ ] Deploys green to Vercel; Lighthouse perf + a11y both strong; works offline-first (no login).

---

## 14. Canonical technical facts (teach these *correctly* — current as of June 2026)

A cert-prep site that teaches wrong API shapes is malpractice. Use these as ground truth for lab code and lesson examples, and **re-verify against §15 live docs at authoring time** (the platform changes fast):

- **Models & IDs (exact strings):** Claude **Fable 5** = `claude-fable-5` (most capable widely-released); **Opus 4.8** = `claude-opus-4-8` (default for most agentic/coding work); **Sonnet 4.6** = `claude-sonnet-4-6`; **Haiku 4.5** = `claude-haiku-4-5`. 1M context on the frontier models; never append date suffixes to aliases.
- **Thinking:** modern models (Fable 5 / Opus 4.8 / 4.7 / 4.6) use **adaptive thinking** (`thinking: {type: "adaptive"}`). Fixed `budget_tokens` is removed on Fable 5 / Opus 4.8 / 4.7 (400s) — teach `output_config.effort` (`low|medium|high|xhigh|max`) as the depth/cost control. This is a *common exam-adjacent gotcha* — worth a dedicated lesson.
- **Tool use:** single `POST /v1/messages` endpoint; tools are a feature of it. User-defined tools (SDK tool runners or manual loop), server-side tools (code execution, web search/fetch, memory), structured outputs via `output_config.format`. Prescriptive tool descriptions ("call this when…") materially improve tool-selection on modern models — core D2 content.
- **MCP:** Model Context Protocol — servers expose tools/resources/prompts; declared on the client/agent (`{type, name, url}`), auth handled separately (vaults for managed agents). Core D2 content; link the live MCP spec.
- **Managed Agents (Agent SDK / server-managed):** Agent (persisted, versioned config) created **once** → Session created per run. `model`/`system`/`tools` live on the **agent**, never the session. Environments, sessions, events/SSE, outcomes, multiagent coordinators, vaults, memory stores, scheduled deployments. This is the heart of **D1** — get the Agent→Session flow exactly right; it's the most common architectural mistake.
- **Context & caching (D5):** prompt caching is a **prefix match** (any byte change in the prefix invalidates downstream); keep the system prompt/tool list stable, put volatile content last. Compaction (beta) summarizes near the window limit and the compaction blocks must be passed back. Context editing prunes stale tool results. These mechanics are directly testable.
- **Claude Code (D3):** CLAUDE.md hierarchy & precedence, custom slash-command skills, subagents, hooks (Pre/PostToolUse, Stop), plan mode, MCP servers, settings.json, CI/headless usage. Teach the precedence model precisely.

> If any of the above looks unfamiliar, it's because it post-dates older training data — it's real. Verify against the live docs in §15 and trust those.

---

## 15. Real resources to wire in (Phase-1 source library)

**Official / primary (highest authority — annotate and route learners here first):**
- Anthropic Academy on Skilljar — the official free prep (≈13 courses): `https://anthropic.skilljar.com/`
- Anthropic docs — models/overview, tool use, MCP, managed agents, prompt caching, extended/adaptive thinking, effort, context editing, compaction (base: `https://platform.claude.com/docs/en/...`). Map each doc to its domain.
- Model Context Protocol spec & site: `https://modelcontextprotocol.io/`
- Anthropic Agent SDK / Claude Code docs.
- The practice exam itself (Gerard's link): `https://anthropic.skilljar.com/anthropic-certification-practice-exam/...`

**Community study guides (cross-reference for blueprint accuracy — cite, don't copy):**
- daronyondem/claude-architect-exam-guide (GitHub community study guide)
- claudecertifications.com, claudearchitectcertification.com, preporato.com, towardsai.net CCA‑F guide

**Verification step before launch:** confirm the blueprint (domains, weights, 60Q/120min/720) against the **official** Anthropic Academy / Skilljar exam page — community sources are the cross-check, the official page is the source of truth.

---

## 16. Guardrails (read once more)

1. **Original content only** — no scraped/leaked exam items. Write to the blueprint, ground in official docs, explain every answer.
2. **Current, verified technical facts** — §14 + live docs; never teach an API shape from memory.
3. **Vendor-agnostic engine** — grep-clean of vendor names in engine/content libs.
4. **Honest readiness** — the score reflects real mastery + a passed full mock, not click-through.
5. **Ship the vertical slice** — one excellent track beats ten skeletons.

Build it.
