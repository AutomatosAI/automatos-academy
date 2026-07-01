# GitHub Copilot GH-300 — research & source library

**For:** [PRD-COPILOT-GH300.md](../prds/PRD-COPILOT-GH300.md) · **Last updated:** 2026-07-01
**Method:** [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md) (Firecrawl official docs) · **Guardrail:**
official primary sources only — **no third-party braindumps / real exam items** ([AUTHORING.md](../AUTHORING.md)).

## A. Exam facts (verified against live Microsoft Learn, Feb 2026)

| Attribute | Value |
|---|---|
| Exam | **GH-300 — GitHub Copilot** (Microsoft/GitHub credential) |
| Level | Intermediate · roles: Developer, DevOps, App Maker, Tech Manager |
| Duration | **100 minutes** |
| Questions | **~60 scored** (+ 10–15 unscored pretest items on the live exam) |
| Passing score | **700 / 1000** |
| Price | **$99** per attempt |
| Delivery | Proctored via **Pearson VUE** (online or test center) |
| Languages | English, Spanish, Portuguese (BR), Korean, Japanese |
| Validity | 2 years (free online renewal) |
| Last updated | Study guide 2026-02-19; **major Jan 2026 refresh** added Agent/Plan Mode, MCP, Sub-Agents, Copilot CLI, Spaces, Spark, Code Review |

> **Unverified — do NOT assert:** a "two-section / no-back-navigation" structure. It appears in some
> secondary summaries but is **not** confirmed on the official cert page or study guide. Leave it out
> of learner-facing copy until confirmed.

**Source-of-truth URL (Firecrawl seed #1):**
`https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-300`
Cert page: `https://learn.microsoft.com/en-us/credentials/certifications/github-copilot/`

## B. Blueprint — 6 domains (official ranges → normalized weights)

The official skills-measured lists **six** domains with percentage ranges. Normalized to sum 1.0
(within range; Features taken at the top of its band to close the rounding gap). **Verify against the
live study guide before authoring and adjust within the ranges.**

| d | Domain (official title) | Official range | Weight | slug |
|---|---|---|---|---|
| d1 | Use GitHub Copilot features *(incl. org-wide management/policies)* | 25–30% | **0.30** | `d1-copilot-features` |
| d2 | Use GitHub Copilot responsibly | 15–20% | **0.18** | `d2-responsible-ai` |
| d3 | Understand GitHub Copilot data and architecture | 10–15% | **0.13** | `d3-data-architecture` |
| d4 | Apply prompt engineering and context crafting | 10–15% | **0.13** | `d4-prompt-engineering` |
| d5 | Improve developer productivity with GitHub Copilot | 10–15% | **0.13** | `d5-developer-productivity` |
| d6 | Configure privacy, content exclusions, and safeguards | 10–15% | **0.13** | `d6-privacy-safeguards` |

Sum = 1.00 ✓ (`npm run validate` will enforce this once authored.)

> The agent research initially showed "7 domains" — that was a parse artifact duplicating the
> Features row. The canonical published blueprint is these **six**.

## C. Firecrawl seed list (official only)

Crawl these roots/pages into the knowledge base (per KNOWLEDGE_INGEST). GitHub reorganizes doc
paths often — **treat `docs.github.com/en/copilot` as the root and re-verify deep links at authoring
time**; the study guide is the stable blueprint anchor.

1. **Blueprint:** the GH-300 study guide + cert page (above) + the exam sandbox demo `https://aka.ms/GHExamDemo-enu` + the official practice assessment (linked from the cert page).
2. **Microsoft Learn paths (the closest to official study material):**
   - Part 1 — `https://learn.microsoft.com/en-us/training/paths/copilot/`
   - Part 2 — `https://learn.microsoft.com/en-us/training/paths/gh-copilot-2/`
   - Responsible AI module — `https://learn.microsoft.com/en-us/training/modules/responsible-ai-with-github-copilot/`
3. **GitHub Copilot product docs** (root `https://docs.github.com/en/copilot`): features overview, code suggestions, chat, Agent/coding agent, Plan Mode, Copilot CLI, MCP, Spaces, Spark, Code Review & PR summaries.
4. **Trust / data / privacy:** Copilot Business privacy statement (`/site-policy/privacy-policies/github-copilot-business-privacy-statement`), content-exclusion docs.
5. **Responsible use hub:** `https://docs.github.com/en/copilot/responsible-use`.
6. **Model/architecture reference:** supported models + model comparison under `docs.github.com/en/copilot/reference/ai-models`.

## D. Drafted `resources[]` (paste into track.json + domain files)

Split these between `track.json → officialResources[]` (the `off-*`) and each domain's `resources[]`
(the `r-*`, by `domainIds`). Annotations kept original; `kind` uses the engine's label convention
(`official-doc | spec | learning-path | blog | repo`).

```jsonc
// track.json → officialResources[]
[
  { "id": "off-gh300-guide", "title": "GH-300 Study Guide — official (Microsoft Learn)",
    "url": "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-300",
    "kind": "spec", "domainIds": [],
    "annotation": "The authoritative blueprint: the six skills-measured groups, their weight ranges, and the Jan 2026 changelog. The curriculum is built directly to this." },
  { "id": "off-gh300-cert", "title": "GitHub Copilot (GH-300) — certification page",
    "url": "https://learn.microsoft.com/en-us/credentials/certifications/github-copilot/",
    "kind": "official-doc", "domainIds": [],
    "annotation": "Exam overview, price, languages, Pearson VUE scheduling, and the link to the official practice assessment + sandbox." },
  { "id": "off-lp1", "title": "GitHub Copilot Fundamentals — Part 1 (Microsoft Learn path)",
    "url": "https://learn.microsoft.com/en-us/training/paths/copilot/",
    "kind": "learning-path", "domainIds": [],
    "annotation": "Free official learning path: intro, features, prompt engineering, Spaces, management. Closest thing to official study material — work it end to end." },
  { "id": "off-lp2", "title": "GitHub Copilot Fundamentals — Part 2 (Microsoft Learn path)",
    "url": "https://learn.microsoft.com/en-us/training/paths/gh-copilot-2/",
    "kind": "learning-path", "domainIds": [],
    "annotation": "The Jan-2026 features: Agent Mode, cloud/coding agent, MCP, code review, language-specific use." }
]
```

```jsonc
// domain resources[] — assign by domainIds
[
  { "id": "r-copilot-docs", "title": "GitHub Copilot documentation (root)",
    "url": "https://docs.github.com/en/copilot", "kind": "official-doc",
    "domainIds": [], "annotation": "Primary source for every feature claim. When a community guide and the docs disagree, the docs win." },
  { "id": "r-features", "title": "GitHub Copilot features & feature matrix",
    "url": "https://docs.github.com/en/copilot/get-started/features", "kind": "official-doc",
    "domainIds": ["d1-copilot-features"], "annotation": "Code suggestions, chat, CLI, agents, code review, PR summaries — and where each is available by IDE/plan." },
  { "id": "r-agents", "title": "Copilot agents — Agent Mode, coding/cloud agent, Plan Mode",
    "url": "https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent", "kind": "official-doc",
    "domainIds": ["d1-copilot-features"], "annotation": "Autonomous multi-step development, planning before code, iteration. Core Jan-2026 content. (Edit Mode was deprecated/removed in 2026 — exclude it.)" },
  { "id": "r-mcp", "title": "Model Context Protocol in Copilot",
    "url": "https://docs.github.com/en/copilot/concepts/context/mcp", "kind": "official-doc",
    "domainIds": ["d4-prompt-engineering", "d1-copilot-features"], "annotation": "Open standard for feeding context/tools to Copilot; setup in the IDE and CLI. New in Jan 2026." },
  { "id": "r-cli", "title": "GitHub Copilot CLI",
    "url": "https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli", "kind": "official-doc",
    "domainIds": ["d1-copilot-features"], "annotation": "Terminal-native agent; interactive/plan modes, task delegation, custom agents." },
  { "id": "r-spaces", "title": "GitHub Copilot Spaces",
    "url": "https://docs.github.com/en/copilot/concepts/context/spaces", "kind": "official-doc",
    "domainIds": ["d1-copilot-features", "d4-prompt-engineering"], "annotation": "Curate and share context/knowledge with a team. New in Jan 2026." },
  { "id": "r-spark", "title": "GitHub Spark",
    "url": "https://docs.github.com/en/copilot/concepts/spark", "kind": "official-doc",
    "domainIds": ["d1-copilot-features", "d5-developer-productivity"], "annotation": "Generate full-stack apps from natural language; deploy via GitHub. New in Jan 2026." },
  { "id": "r-code-review", "title": "Copilot code review & PR summaries",
    "url": "https://docs.github.com/en/copilot/concepts/agents/code-review", "kind": "official-doc",
    "domainIds": ["d5-developer-productivity", "d1-copilot-features"], "annotation": "Automated PR review (effort levels, full-context) and AI-generated PR summaries." },
  { "id": "r-prompt", "title": "Prompt engineering for Copilot",
    "url": "https://docs.github.com/en/copilot/concepts/prompting/prompt-engineering", "kind": "official-doc",
    "domainIds": ["d4-prompt-engineering"], "annotation": "Prompt structure, context inclusion, zero/few-shot, iterative refinement, prompt files." },
  { "id": "r-responsible", "title": "Responsible use of GitHub Copilot",
    "url": "https://docs.github.com/en/copilot/responsible-use", "kind": "official-doc",
    "domainIds": ["d2-responsible-ai"], "annotation": "The responsible-AI hub: principles, risks, mitigation, validate-the-output discipline, per-feature application cards." },
  { "id": "r-models", "title": "Supported AI models & model comparison",
    "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models", "kind": "spec",
    "domainIds": ["d3-data-architecture"], "annotation": "Which LLMs back Copilot, how to switch models, and their trade-offs. Grounds the data/architecture domain." },
  { "id": "r-privacy", "title": "Copilot Business privacy statement (Trust Center)",
    "url": "https://docs.github.com/en/site-policy/privacy-policies/github-copilot-business-privacy-statement", "kind": "official-doc",
    "domainIds": ["d3-data-architecture", "d6-privacy-safeguards"], "annotation": "Data collection, retention, flow, and compliance. The authority for data-handling questions." },
  { "id": "r-exclusion", "title": "Content exclusion for GitHub Copilot",
    "url": "https://docs.github.com/en/copilot/how-tos/configure-content-exclusion/exclude-content-from-copilot", "kind": "official-doc",
    "domainIds": ["d6-privacy-safeguards"], "annotation": "Exclude files/repos from Copilot; how exclusion affects suggestions and chat; org-level auditing." },
  { "id": "r-productivity", "title": "Developer use cases & unit testing with Copilot",
    "url": "https://learn.microsoft.com/en-us/training/modules/develop-unit-tests-using-github-copilot-tools/", "kind": "learning-path",
    "domainIds": ["d5-developer-productivity"], "annotation": "SDLC integration, refactoring, docs, and test generation — the productivity domain in practice." }
]
```

## E. Notes for the authoring phase

- **Jan-2026 currency trap — the Edit Mode nuance.** GitHub's *product* deprecated and removed Edit
  Mode during 2026, **but the GH-300 exam blueprint (Jan 2026) still lists it** ("Use Agent Mode,
  Edit Mode, and MCP…"). Teach Edit Mode as **exam-relevant** — a scoped, review-first multi-file
  edit — *with* that product caveat, and still lead the Features domain with Agent Mode / Plan Mode /
  MCP / CLI / Spaces / Spark / Code Review.
- Re-point the tutor agent ([ACADEMY_TUTOR_PROMPT.md](../ACADEMY_TUTOR_PROMPT.md)) at this corpus for
  a GH-300 tutor (swap the exam name, domains, and weights; keep the pedagogy).
- Community repos (e.g. `github/awesome-copilot`) are fine as *worked-example* references, **not** as
  answer sources — every question still grounds in an official `sourceRef` above.
