# APA source survey — 2026-07-02 (grounding map for track authoring)

**Method:** read-only Opus survey across five repos — `automatos-gitbook` (56 md; the ONLY proof of
LIVE), `automatos-ai/docs` (~26 topical dirs + ~155 PRDs; WHY/architecture only, never shipped-proof),
`automatos-shopify`, `automatos-skills`, `automatos-widget-sdk` — plus a dedicated Shopify status
deep-dive. Feeds the APA authoring swarm; also the freshness baseline for
[PRD-OPS-FRESHNESS](../prds/PRD-OPS-FRESHNESS.md) §4's "platform drift vs APA/ABF content" row.

## Ground rule for authors

The gitbook is the only proof of **live**. `automatos-ai/docs` teaches the **why** (architecture
judgment) and must never be cited as evidence a feature is shipped. Where the two disagree, the
gitbook wins for "what you can do today"; the design doc may be taught **labelled** as architecture
direction.

## Vocabulary map (canonical vs drift to avoid)

**Canonical** (cite `automatos-gitbook/about.md` Key Concepts): Agent · Workspace · Playbook ·
Plugin · Skill · Tool (Composio, 1,000+ apps) · Knowledge Base · Universal Router · Mission ·
Channel · Knowledge Graph · Memory (short-term/long-term) · Voice Chat. Command Centre = the
Activity page (tabs Dashboard/Feed/Reports/Memory/Missions). Marketplace tabs =
Applications/Agents/Playbooks/LLMs/Capabilities (Capabilities = Plugins + Skills).

**Drift to avoid:**
- Say **"playbook", never "recipe"** ("recipe" ≈ backend/design vocab; FORGE's "recipe builder" blurb is legacy naming)
- "Routine" exists only in the mission → **Save as Routine** conversion
- **"Blueprint" is not a user-docs term** (internal/design) — module 09 treats it as a labelled teaching metaphor only
- **Memory: user docs = two tiers** (short/long) + scope + consolidation; "five layers L0–L4", "field memory", "operating graph" are design vocabulary — label as architecture direction
- Roles are **Admin / Member / Viewer** + the "Context Engineering" permission — never "owner"/"super_admin"
- Routing tiers, exact names: **Tier 0 user-override · Tier 1 cache · Tier 2 rules · Tier 2.5 semantic · Tier 3 LLM**
- "Heartbeat" and "board"/tasks exist in skills/design but have **no gitbook surface** — don't teach them as UI
- Widget vocabulary (from the SDK docs — the gitbook has no widget guide): public key (`ak_pub_*`), widget types chat|blog, proactive engagement, callback handoff

## Live-vs-roadmap markers (currency traps)

| Area | Live (gitbook) | Label as in-development / direction |
|---|---|---|
| Cloud sync | Dropbox, S3 "Available" | Google Drive, OneDrive "Coming soon" |
| Memory | two tiers, scope, consolidate, pin/edit/delete | five-layer L0–L4, field memory (PRD-166) |
| Deliverables | markdown templates ({{placeholders}}), markdown reports at `/reports/{agent}/…`, grading 1–5★ | branded PDF/DOCX generation, block templates, brand kit (PRD-167 — verify in product) |
| Budgets/approvals | mission cost-by-task + pause/resume-with-budget, cost alerts (Settings→General), mission plan approve/reject, "Approval required" delegation rule | a standalone budget/policy plane |
| Marketplace | browse/install all five tabs + Submit/Publish with review | contributor economy / monetization (zero gitbook language — "coming") |
| Shopify | see below | see below |
| Voice | STT/TTS voice chat incl. cloned voice profiles documented | — |
| Models | OpenRouter primary (100+ models) / OpenAI / Anthropic / DeepSeek; BYOK; default embedding qwen3-embedding-8B (2048-dim) | — |

Other confirmed-live: 9 documented channels (Telegram/Slack/WhatsApp/Discord/Teams/Google
Chat/iMessage/Matrix/Signal) · 10 starter agents in new workspaces · batch agent creation + "Run
Capability Test" · NL2SQL with golden-SQL benchmarking · feature flags as admin toggles · REST API
with Clerk bearer + X-Workspace-ID, SSE, Vercel-AI-SDK-compatible.

## Shopify status (the applied vertical for module 08 + capstone)

**Two-agent pattern CONFIRMED as documented core design:** parent **Operations Manager** with scoped
children — storefront-facing **Support Agent / Product Expert / Merchandiser** via the widget
(Flow W) and back-office **Business Analyst / Inventory Watchdog** via Shopify Admin/App Bridge
(Flow E) — same orchestrator runtime, same workspace, ~400-API Composio SHOPIFY toolset, 8
merchant-ops skills mapped from `automatos-skills/shopify/` (21 skills in the group).

- ✅ **Live:** partner app deployed · `/api/shopify/*` on api.automatos.app · widget CDN
  `widgets.automatos.app/v0` · **one production merchant running end-to-end storefront widget chat
  since 2026-04-12** · proactive engagement (PRD-007)
- 🟡 **Spec'd / in-dev:** multi-agent seeding on install; admin agents not confirmed live in production
- ❌ **Not yet:** public App Store listing — PRD-004 (Composio onboarding automation) is the P0 blocker

**Author caveat line (verbatim):** *architecture supports both storefront and admin agents from a
single workspace; currently only the storefront Support Agent is confirmed live on production
stores; admin agents and multi-widget seeding are in-development pending PRD-004.*

## Widget SDK status (module 08's universal-surface story)

Shipped production monorepo: `@automatos/core` (~3.6KB client/auth/SSE) · `chat-widget` (~8KB
Shadow-DOM, zero deps) · `blog-widget` · `loader` (CDN IIFE) · React wrapper + `useAutomatosChat`.
Live CDN `widgets.automatos.app/v0`. Contract: origin-allow-listed `ak_pub_*` → `POST
/api/widgets/auth` (short-lived JWT) → `POST /api/widgets/chat` SSE, backed by a workspace agent;
`GET /api/widgets/config` drives proactive engagement (time-on-page/scroll/exit-intent/idle);
`/api/widgets/blog/*`; callback handoff (PRD-008-A). Explicitly universal — Shopify themes, static
HTML, React/Next/Vite, WordPress, Webflow. **Two live proof points authors can cite:** the
automatos.app landing site and **the Academy's own tutor** (`public/js/tutor.js` on the widget
contract). Gitbook coverage is one endpoint table in `api-reference.md` — `automatos-widget-sdk/docs/EMBEDDING.md`
is the canonical how-to. Teach as live: script-tag + React embeds, chat + blog widgets, public-key
origin-locked auth, CSS-variable theming. Verify-before-demo: the Sites/Destinations admin surface,
callback/proactive features (recent).

## Skills inventory (module 02)

README canon: **"128 skills indexed"** in 16 groups (filesystem holds 137 SKILL.md — drift; say
"125+" or cite the README's 128, don't assert a precise live count). Structure:
`{group}/{slug}/SKILL.md`, YAML frontmatter (name/description/version/tags/category/tools[]) + body
sections (Identity, Workflow with real JSON tool calls, Output Format, What NOT To Do); 60–100-line
quality bar; identity = frontmatter name; platform loader upserts by name; marketplace import via
git URL. Groups: team(9) shopify(21) engineering(11) social(12) design(11) quality(9) product(8)
sales(8) integrations(8) marketing(7) content(7) devops(6) analytics(5) people-ops(3) research(2)
support(1). **The 9 signature agents:** SENTINEL (infra watchdog) · PATCHER (bug-fixer) · SCOUT
(lead intel) · HARPER (content) · ECHO (support) · ATLAS (BI) · FORGE (playbook builder — blurb
says "recipe", legacy) · ORACLE (knowledge curator) · RALLY (community). (`team/` has 11 dirs —
`auto` and `vector` are not among the 9.) Tooling: 15 `platform_*` tools, 6 `workspace_*` tools,
`composio_execute` meta-tool. Reference patterns for SKILL.md authoring: `team/sentinel`, `team/scout`.

## Per-module source map (files to Read when authoring)

| Module | Gitbook (live-proof) | Design docs (why only) |
|---|---|---|
| 00 | README, about, SUMMARY, activity/README+dashboard+feed | docs/overview, glossary, getting-started, architecture |
| 01 | chat/* (README, routing, quick-actions, history, voice), agents/README+creating+roster+details+configuration | universal-router, chat-interface, agents |
| 02 | marketplace/capabilities+README, agents/details + `automatos-skills` README/SKILL-GUIDE/team/sentinel+scout | community-marketplace, platform-actions |
| 03 | knowledge/* (README, documents, **cloud-sync**, database, knowledge-graph, codegraph), tools/README+connecting-apps+assigning+security | knowledge-base-rag, tools-integrations, context-service |
| 04 | agents/playbooks+coordination, tools/README, analytics/workflows, marketplace/playbooks | workflows-recipes, heartbeat-proactive-assistant |
| 05 | activity/missions+dashboard, agents/coordination | missions-multi-agent-coordination |
| 06 | activity/memory, settings/general | memory-system/* (five-layer), context-service |
| 07 | knowledge/templates, activity/reports, knowledge/documents | workspace-execution, unified-notification-system |
| 08 | tools/channels, api-reference (Widgets), chat/routing + `automatos-widget-sdk` README+EMBEDDING + academy tutor.js/chat-config/ACADEMY_TUTOR_PROMPT + `automatos-shopify` STATUS/ARCHITECTURE/NORTH-STAR/SETUP-GUIDE/PRDS-INDEX | channel-integrations/*, PRDS 38.0 widget master plan, 141 widget vertical-agnostic, SHOPIFY-AGENT-DESIGN, SHOPIFY-AGENTS-SPEC, prd-blog-widget |
| 09 | team/* (README, inviting, roles), analytics/* (README, overview, llm-costs, agents), settings/* (README, general, credentials, models, audit-logs), activity/missions | authentication-multi-tenancy, analytics-monitoring, deployment-infrastructure |
| 10 | marketplace/* (all six) | community-marketplace, PRDS 38.5 widget marketplace |

---
_Refresh trigger: re-run this survey (or the cert-watch agent's platform-drift check) after each
major platform release; the APA/ABF "Do it now" steps rot fastest._
