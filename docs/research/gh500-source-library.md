# GitHub Advanced Security GH-500 — research & source library

**For:** [PRD-S0-GH500.md](../prds/PRD-S0-GH500.md) · **Last updated:** 2026-07-02
**Method:** [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md) (official docs only) · **Guardrail:**
official primary sources only — **no third-party braindumps / real exam items** ([AUTHORING.md](../AUTHORING.md)).

## A. Exam facts (verified against live Microsoft Learn, 2026-07-02)

| Attribute | Value |
|---|---|
| Exam | **GH-500 — GitHub Advanced Security** (exam maintained by GitHub, delivered by Microsoft) |
| Level | **Intermediate** · roles: Administrator, Developer, DevOps Engineer, Solution Architect, **Student** |
| Duration | **100 minutes** (stated on the cert page) |
| Questions | **NOT stated** on the study guide or cert page — Academy models **~60 scored** (GitHub/MS exam-family norm; **flag before launch**) |
| Passing score | **700 / 1000** (700 stated on the study guide; the 1000 scale is standard MS scoring, not restated) |
| Delivery | Proctored via **Pearson VUE** (online or test center) |
| Languages | English, Spanish, Portuguese (Brazil), Korean, Japanese |
| Question format | "You **may have interactive components** to complete as part of this exam"; sandbox lets you "interact with different question types" — **no named scenario / case-study format** |
| Practice | Official practice assessment (`assessmentId 590484996`) + exam sandbox (`https://GHCertDemo.starttest.com`) |
| Last updated | Study guide `ms.date` 2026-04-26 / `updated_at` 2026-05-14; cert page Last Updated 05/04/2026 |
| Change log | "This exam has **changed significantly** … on July, 2026" — new/removed/moved/reworded objectives |

> **Unverified — do NOT assert as fact:** the exact **question count** (not on either official page — the `~60` is a modeling assumption, confirm before launch) and any **scenario/case-study question structure** (the branching drills on this track are an Academy training device, not an official GH-500 question type).

**Source-of-truth URLs (live-checked 2026-07-02):**
- Study guide (canonical target of `https://aka.ms/GH500-StudyGuide`, 301): `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-500`
- Certification page: `https://learn.microsoft.com/en-us/credentials/certifications/github-advanced-security/`

## B. Blueprint — 6 domains (official ranges → normalized weights)

The official "Skills measured as of July 2026" lists **six** domains with percentage ranges.
Weights are each taken **inside** their band so the six sum to **1.00** exactly. **Use the verbatim
official titles below** — including the `(formerly …)` parentheticals — for currency-trap fidelity.

| d | Domain (verbatim official title) | Official range | Weight | slug |
|---|---|---|---|---|
| d1 | Describe GitHub Security suites, features, and ecosystem | 15–20% | **0.18** | `d1-security-suites` |
| d2 | Configure and use Secret Protection (formerly secret scanning) | 15–20% | **0.18** | `d2-secret-protection` |
| d3 | Configure and use supply chain security (formerly Dependabot/Dependency Review) | 15–20% | **0.18** | `d3-supply-chain` |
| d4 | Configure and use Code Security (formerly Code Scanning with CodeQL) | 10–15% | **0.13** | `d4-code-security` |
| d5 | Security operations: best practices, prioritization, and remediation | 15–20% | **0.18** | `d5-security-operations` |
| d6 | GitHub Security suites administration | 10–15% | **0.15** | `d6-administration` |

Sum = **1.00** ✓ (`npm run validate` enforces this). Each weight sits strictly inside its official
range (D6 at the top of its 10–15% band to close the rounding gap).

> **Title drift vs PRD-S0-GH500 (§3):** the PRD table paraphrases and drops the `(formerly …)`
> parentheticals — d4 shows `(CodeQL)` for the official `(formerly Code Scanning with CodeQL)`; d5
> shows `— prioritization & remediation` for the official `: best practices, prioritization, and
> remediation`; d2/d3 drop their parentheticals; d3 is officially lowercase `supply chain security`.
> The **weights and exam facts need no correction** — only the display titles were re-verbatim'd.

## C. Official source seed list (official only)

Crawl these roots/pages into the knowledge base (per KNOWLEDGE_INGEST). GitHub reorganizes doc paths
often — **treat `docs.github.com/en/code-security` as the root and re-verify deep links at authoring
time**; the study guide is the stable blueprint anchor.

1. **Blueprint:** the GH-500 study guide + cert page (above) + the exam sandbox (`https://GHCertDemo.starttest.com`) + the official practice assessment (linked from the cert page).
2. **Microsoft Learn paths (the closest to official study material):**
   - Part 1 — `https://learn.microsoft.com/en-us/training/paths/github-advanced-security/` (intro to GHAS, Dependabot, secret scanning, code scanning)
   - Part 2 — `https://learn.microsoft.com/en-us/training/paths/github-advanced-security-2/` (CodeQL analysis, code scanning, GHAS administration, sensitive data & policies)
3. **GitHub code security docs** (root `https://docs.github.com/en/code-security`): secret scanning & push protection; supply chain (dependency graph, Dependabot, Dependency Review, SBOM/SPDX); code scanning/CodeQL & SARIF; security overview, configurations, campaigns.
4. **Enterprise administration:** security configurations (Cloud + Server), enterprise policies, security managers & custom org roles, GHAS billing, and the code-security configurations REST API (all under `docs.github.com`).

## D. Consolidated `resources[]` (as authored in the six domain files)

Split across `track.json → officialResources[]` (the `off-*` + the code-security docs root) and each
domain's `resources[]` (the `r-*`). `kind` uses the engine's label convention
(`official-doc | spec | learning-path | learning-module | official-blog | official-blueprint`).
The study guide appears in every domain file (as `r-studyguide` / `r-study-guide`) as the per-domain
task-statement anchor; it is registered once at track level as `off-gh500-guide`.

### track.json → officialResources[]

```jsonc
[
  { "id": "off-gh500-guide", "kind": "spec",
    "url": "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-500",
    "annotation": "The authoritative blueprint: six skills-measured domains ('as of July 2026'), weight ranges, audience profile, July-2026 change log; current Secret Protection / Supply Chain Security / Code Security names with their '(formerly …)' parentheticals." },
  { "id": "off-gh500-cert", "kind": "official-doc",
    "url": "https://learn.microsoft.com/en-us/credentials/certifications/github-advanced-security/",
    "annotation": "Exam overview: 100 min, proctored, Intermediate, roles, languages, Pearson VUE, sandbox, practice assessment; exam maintained by GitHub, delivered by Microsoft." },
  { "id": "off-gh500-lp1", "kind": "learning-path",
    "url": "https://learn.microsoft.com/en-us/training/paths/github-advanced-security/",
    "annotation": "MS Learn Part 1 of 2 (4 modules): intro to GHAS, Dependabot security updates, secret scanning, code scanning with CodeQL/Actions. Grounds D1–D4." },
  { "id": "off-gh500-lp2", "kind": "learning-path",
    "url": "https://learn.microsoft.com/en-us/training/paths/github-advanced-security-2/",
    "annotation": "MS Learn Part 2 of 2 (4 modules): CodeQL analysis, code scanning with CodeQL, GHAS administration, managing sensitive data & security policies. Grounds D4–D6." },
  { "id": "r-code-security-docs", "kind": "official-doc",
    "url": "https://docs.github.com/en/code-security",
    "annotation": "Primary source for every product claim: secret scanning & push protection, supply chain, code scanning/CodeQL & SARIF, security overview / configurations / campaigns. Docs win over community guides." }
]
```

### D1 — Describe GitHub Security suites, features & ecosystem (weight 0.18)

- `r-ghas-overview` — About GitHub Advanced Security — `https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security` — GHAS is now two standalone products (Secret Protection, Code Security) on Team/Enterprise; which features fall in each; free-vs-paid split.
- `r-features` — GitHub security features — `https://docs.github.com/en/code-security/getting-started/github-security-features` — full feature inventory by tier ('all plans' / 'Secret Protection' / 'Code Security').
- `r-security-overview` — About security overview — `https://docs.github.com/en/code-security/security-overview/about-security-overview` — the Overview dashboard, Risk/Coverage/Enablement views, and the three levels (repo/org/enterprise).
- `r-push-protection` — About push protection — `https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection` — prevention-first flagship: blocks pushes containing secrets before they reach the repo; delegated bypass.
- `r-campaigns` — About security campaigns — `https://docs.github.com/en/code-security/concepts/security-at-scale/about-security-campaigns` — coordinated remediation of existing alerts at scale; code-vs-secret campaigns; auto-triggered Copilot Autofix.
- `r-configurations` — Choosing a security configuration — `https://docs.github.com/en/code-security/securing-your-organization/introduction-to-securing-your-organization-at-scale/choosing-a-security-configuration-for-your-repositories` — reusable enablement bundles; the GitHub-recommended config.
- `r-dependabot-alerts` — About Dependabot alerts — `https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts` — alerts fire when an Advisory Database advisory affects a dependency in the graph.
- `r-dependabot-metrics` — Prioritizing Dependabot alerts using metrics (EPSS) — `https://docs.github.com/en/code-security/securing-your-organization/understanding-your-organizations-exposure-to-vulnerabilities/prioritizing-dependabot-alerts-using-metrics` — EPSS (FIRST), 0–1 probability, `epss_percentage` filter, updated daily.
- `r-sbom` — Exporting an SBOM — `https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/exporting-a-software-bill-of-materials-for-your-repository` — SPDX (v2.3) export via UI (Insights → Dependency graph → Export SBOM) or REST API; SPDX (SBOM) vs SARIF (code scanning results).

### D2 — Configure and use Secret Protection (weight 0.18)

- `r-about-secret-scanning` — About secret scanning — `https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning` — product-vs-engine naming; public-free vs private-needs-Secret-Protection; partner/non-provider/custom pattern types.
- `r-intro-secret-scanning` — Secret scanning intro & enablement — `https://docs.github.com/en/code-security/secret-scanning` — full-history scan on all branches; availability tiers; where you enable it.
- `r-about-push-protection` — About push protection — `https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection` — prevention-at-the-push; the three bypass reasons and their alert outcomes (used in tests/false positive → closed; I'll fix it later → open).
- `r-push-protection-concept` — Push protection (concept) — `https://docs.github.com/en/code-security/concepts/secret-security/push-protection` — prevention-vs-detection; push protection can be enabled for custom patterns.
- `r-validity-checks` — About validity checks — `https://docs.github.com/en/code-security/concepts/secret-security/about-validity-checks` — active/inactive/unknown verification with the provider; periodic + on-demand re-checks; drives prioritized alerts.
- `r-resolving-alerts` — Resolving secret scanning alerts — `https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-secret-scanning-alerts/resolving-alerts` — revoke/rotate remediation; the trap that removing a token does NOT auto-close the alert.
- `r-custom-patterns` — About custom patterns — `https://docs.github.com/en/code-security/concepts/secret-security/custom-patterns` — regex patterns at repo/org/enterprise; additional match/must-not-match; push protection; dry run.
- `r-delegated-bypass` — Delegated bypass for push protection — `https://docs.github.com/en/code-security/concepts/secret-security/delegated-bypass` — who bypasses directly vs a review cycle; requests expire after 7 days; bypass permission vs full exemption.
- `r-delegated-dismissal` — Enable delegated alert dismissal — `https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-secret-scanning-alerts/enable-delegated-dismissal` — security-manager approval for alert closures; the alert-side mirror of delegated bypass.
- `r-enable` — MS Learn: Configure and use secret scanning — `https://learn.microsoft.com/en-us/training/modules/configure-use-secret-scanning-github-repository/` — GH-500-aligned hands-on module (Part 1).

### D3 — Configure and use supply chain security (weight 0.18)

- `r-depgraph` — About the dependency graph — `https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-the-dependency-graph` — manifest/lock parsing + submission API; direct vs transitive; underpins alerts, Dependency Review, SBOM.
- `r-depgraph-config` — Configuring the dependency graph — `https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/configuring-the-dependency-graph` — on by default (public), must be enabled (private). Public-on/private-enable trap.
- `r-sbom` — Exporting an SBOM — `https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/exporting-a-software-bill-of-materials-for-your-repository` — SPDX export; versions/licenses/identifiers/transitive paths; excludes dependents.
- `r-quickstart` — Dependabot quickstart — `https://docs.github.com/en/code-security/getting-started/dependabot-quickstart-guide` — alerts vs security updates vs version updates; enabling Dependabot auto-enables the graph; where `dependabot.yml` lives.
- `r-dependabot-alerts` — About Dependabot alerts — `https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts` — vulnerable-dependency alerts (no code change); require the graph; contrast with security updates.
- `r-security-updates` — About Dependabot security updates — `https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates` — alert-driven PRs to the minimum patched version; require graph + alerts.
- `r-version-updates` — About Dependabot version updates — `https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates` — config-driven (`dependabot.yml`) PRs even without a vulnerability; semver.
- `r-epss-changelog` — EPSS scores for Dependabot (GA changelog) — `https://github.blog/changelog/2025-02-19-dependabot-helps-users-focus-on-the-most-important-alerts-by-including-epss-scores-that-indicate-likelihood-of-exploitation-now-generally-available/` — EPSS (FIRST); 0–1 probability over next 30 days; only ~0.5% score above 50%.
- `r-epss-metrics` — Prioritizing Dependabot alerts using metrics — `https://docs.github.com/en/code-security/tutorials/manage-security-alerts/prioritizing-dependabot-alerts-using-metrics` — EPSS alongside CVSS; `epss_percentage>=0.10`; likelihood vs severity.
- `r-epss-filters` — Dependabot alerts filters — `https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-alerts-filters` — `epss_percentage` filter, `sort:epss-percentage`, and companion filters (severity, ecosystem, package, manifest, scope, has:patch).
- `r-dep-review` — About Dependency Review — `https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review` — pre-merge PR gate; rich-diff view vs the action (fails a check); relies on the graph.
- `r-dep-review-action` — Configuring the dependency review action — `https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/configuring-the-dependency-review-action` — fail-on-severity, allow/deny-licenses (SPDX, mutually exclusive), fail-on-scopes, allow-ghsas; only blocks a merge as a required check.
- `r-grouping` — Optimizing PR creation (groups) — `https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/optimizing-pr-creation-version-updates` — the `groups` key consolidates updates; `applies-to` version-updates/security-updates.
- `r-auto-triage` — About Dependabot auto-triage rules — `https://docs.github.com/en/code-security/dependabot/dependabot-auto-triage-rules/about-dependabot-auto-triage-rules` — auto-dismiss/snooze before notifications; the dev-dependency preset (on by default for public repos); dismissed alerts auto-reopen.
- `r-campaigns` — About security campaigns — `https://docs.github.com/en/code-security/securing-your-organization/fixing-security-alerts-at-scale/about-security-campaigns` — group alerts + share with developers; named campaign manager; auto-triggered Copilot Autofix for code scanning.
- `r-campaigns-create` — Creating and tracking security campaigns — `https://docs.github.com/en/code-security/securing-your-organization/fixing-security-alerts-at-scale/creating-tracking-security-campaigns` — ≤1000 alerts; due date; managers must be org owners or security managers.

### D4 — Configure and use Code Security (CodeQL) (weight 0.13)

- `r-about-code-scanning` — About code scanning — `https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning` — CodeQL vs third-party; SARIF interoperability; Actions vs external CI; free-public / licensed-private.
- `r-about-codeql` — About code scanning with CodeQL — `https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql` — the database→query→alert flow; default vs advanced setup; supported languages.
- `r-sarif` — SARIF support for code scanning — `https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning` — SARIF **2.1.0** (only supported version); rules/result/ruleId/level; category via `runAutomationDetails.id`.
- `r-upload-sarif` — Uploading a SARIF file — `https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github` — three upload paths (CodeQL CLI, upload-sarif action, API); `security-events: write`.
- `r-codeql-cli` — About the CodeQL CLI — `https://docs.github.com/en/code-security/codeql-cli/getting-started-with-the-codeql-cli/about-the-codeql-cli` — external CI: `database create` → `database analyze` (SARIF) → `github upload-results`.
- `r-advanced-config` — Customizing advanced setup — `https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning` — the `queries` key (security-extended / security-and-quality), language matrix, build-mode, on: push/pull_request/schedule.
- `r-query-suites` — CodeQL query suites — `https://docs.github.com/en/code-security/code-scanning/managing-your-code-scanning-configuration/codeql-query-suites` — default → security-extended → security-and-quality (coverage-vs-noise ordering).
- `r-about-alerts` — About code scanning alerts — `https://docs.github.com/en/code-security/code-scanning/managing-code-scanning-alerts/about-code-scanning-alerts` — severity vs security severity; dataflow (source→sink); Copilot Autofix; PR vs default-branch behaviour.
- `r-resolving-alerts` — Resolving code scanning alerts — `https://docs.github.com/en/code-security/code-scanning/managing-code-scanning-alerts/resolving-code-scanning-alerts` — fix vs dismiss; dismissal closes an alert in all branches and can be re-opened.
- `r-rest-api` — Code scanning REST API — `https://docs.github.com/en/rest/code-scanning/code-scanning` — the authoritative `dismissed_reason` enum: `false positive` / `won't fix` / `used in tests`.
- `r-copilot-autofix` — Autofix for CodeQL code scanning — `https://docs.github.com/en/code-security/code-scanning/managing-your-code-scanning-alerts/about-autofix-for-codeql-code-scanning` — Autofix suggests fixes the developer must assess and commit (not automatic). *(Grounding also drawn from the About code scanning alerts page; the dedicated concept URL was 404-prone on the 2026-07-02 check.)*

### D5 — Security operations: best practices, prioritization & remediation (weight 0.18)

- `r-security-overview` — About Security Overview — `https://docs.github.com/en/code-security/security-overview/about-security-overview` — the org-wide reporting surface; Overview/Risk/Coverage/Enablement/Campaigns views.
- `r-campaigns-about` — About security campaigns (concept) — `https://docs.github.com/en/code-security/concepts/security-at-scale/about-security-campaigns` — supported alert types (code scanning default-branch; secret scanning in public preview); point of contact; auto Copilot Autofix.
- `r-campaigns-manage` — Creating and managing security campaigns — `https://docs.github.com/en/code-security/how-tos/manage-security-alerts/remediate-alerts-at-scale/creating-managing-security-campaigns` — max 1000 alerts; managers must be org owners or security managers; required name/description/due date.
- `r-campaigns-best-practice` — Best practices for fixing alerts at scale — `https://docs.github.com/en/code-security/securing-your-organization/fixing-security-alerts-at-scale/best-practice-fix-alerts-at-scale` — scope to a single vuln type (e.g. XSS / CWE-79); keep to ≤1000; build momentum.
- `r-epss` — Dependabot alerts filters (EPSS definition) — `https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-alerts-filters` — EPSS = Exploit Prediction Scoring System, 0–100% over next 30 days + percentile, from FIRST, updated daily.
- `r-dependabot-metrics` — Prioritizing Dependabot alerts using metrics — `https://docs.github.com/en/code-security/securing-your-organization/understanding-your-organizations-exposure-to-vulnerabilities/prioritizing-dependabot-alerts-using-metrics` — severity + exploitability (EPSS) + relationship (direct/transitive) + scope (runtime/dev).
- `r-dependabot-alerts` — About Dependabot alerts — `https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts` — GitHub-reviewed advisories vs the graph; the default 'Most important' sort blends CVSS, scope, and vulnerable-function analysis.
- `r-advisory-db` — About the GitHub Advisory Database — `https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/about-the-github-advisory-database` — CVSS levels (Low/Medium(Moderate)/High/Critical); 'ecosystem' = a package registry; GitHub-reviewed advisories.
- `r-repo-advisories` — About repository security advisories — `https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/about-repository-security-advisories` — coordinated disclosure; GitHub is a CVE Numbering Authority (CNA).
- `r-auto-triage` — About Dependabot auto-triage rules — `https://docs.github.com/en/code-security/dependabot/dependabot-auto-triage-rules/about-dependabot-auto-triage-rules` — preset rules (e.g. 'Dismiss low impact issues for development-scoped dependencies', on by default for public repos).
- `r-code-scanning-alerts` — About code scanning alerts (severity & CWE) — `https://docs.github.com/en/code-security/code-scanning/managing-code-scanning-alerts/about-code-scanning-alerts` — 'severity' = Error/Warning/Note; 'security severity' = Critical/High/Medium/Low (CVSS-based); CWE tagging.
- `r-ms-learn-part2` — MS Learn GitHub Advanced Security Part 2 — `https://learn.microsoft.com/en-us/training/paths/github-advanced-security-2/` — administration + managing sensitive data & security policies modules.

### D6 — GitHub Security suites administration (weight 0.15)

- `r-config-concept` — Security configurations (concept) — `https://docs.github.com/en/enterprise-cloud@latest/code-security/concepts/security-at-scale/security-configurations` — Not set/Enabled/Disabled per feature; recommended vs custom; 'Use as default for newly created repositories' scopes.
- `r-apply-custom` — Applying a custom security configuration — `https://docs.github.com/en/code-security/how-tos/secure-at-scale/configure-organization-security/establish-complete-coverage/applying-a-custom-security-configuration` — the enforcement rule (owners blocked from changing enabled/disabled features; 'not set' isn't enforced).
- `r-establish-coverage` — Establish complete coverage — `https://docs.github.com/en/enterprise-cloud@latest/code-security/how-tos/secure-at-scale/configure-organization-security/establish-complete-coverage` — recommended rollout order (apply recommended → evaluate → customize).
- `r-manage-coverage` — Manage your coverage — `https://docs.github.com/en/enterprise-cloud@latest/code-security/how-tos/secure-at-scale/configure-organization-security/manage-your-coverage` — edit/detach/delete configurations; detach a repo to return it to individual management.
- `r-about-enterprise-config` — About security configurations (enterprise) — `https://docs.github.com/en/enterprise-cloud@latest/admin/managing-code-security/securing-your-enterprise/about-security-configurations` — apply to any repo in an org/enterprise; the two products' contents.
- `r-security-managers` — Managing security managers — `https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization` — the four verbatim security-manager permissions.
- `r-custom-roles` — About custom organization roles — `https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/about-custom-organization-roles` — exact repo-level security permission names for composing a role.
- `r-enterprise-policy` — Enforcing policies for code security & analysis — `https://docs.github.com/en/enterprise-cloud@latest/admin/enforcing-policies/enforcing-policies-for-your-enterprise/enforcing-policies-for-code-security-and-analysis-for-your-enterprise` — Allow/Disallow/Allow-for-selected; disallow blocks new enablement but doesn't disable existing.
- `r-rest-configs` — REST API for code security configurations — `https://docs.github.com/en/rest/code-security/configurations` — org + enterprise create/list/get/update/delete, `/attach` scopes, `/defaults` (`default_for_new_repos`).
- `r-about-ghas` — About GitHub Advanced Security — `https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security` — the two standalone products; free on public / purchased on private; Team-or-Enterprise; Server note.
- `r-server-config` — Security configurations (Enterprise Server 3.16) — `https://docs.github.com/en/enterprise-server@3.16/code-security/concepts/security-at-scale/security-configurations` — Server gating: only site-admin-installed features appear; GHAS features need a license; Actions required for Dependabot security updates + code scanning default setup.
- `r-billing` — GitHub Advanced Security license billing — `https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security` — per-committer model; standalone Secret Protection / Code Security / GHAS billing; metered vs volume/subscription.
- `r-mslearn-path` — MS Learn GitHub Advanced Security Part 1 — `https://learn.microsoft.com/en-us/training/paths/github-advanced-security/` — four-module GHAS foundation path.

## E. Notes for the authoring phase

- **July-2026 currency trap — the refresh names.** The exam was renamed/reworded in July 2026. The
  study guide leads with **Secret Protection / Supply Chain Security / Code Security** and keeps the
  `(formerly secret scanning / Dependabot·Dependency Review / Code Scanning with CodeQL)` parentheticals.
  Teach the **new product names as primary**, with the old engine names as the "formerly" pointer.
- **Two standalone products, not one add-on.** GHAS is now **Secret Protection** and **Code Security**
  purchased separately on Team/Enterprise; secret scanning and code scanning are **free on public
  repos**. Ground every availability claim on `r-about-ghas` / `r-features`.
- **Verbatim enum discipline.** The only place the docs enumerate the code-scanning dismissal reasons
  verbatim is the **REST API** (`false positive` / `won't fix` / `used in tests`, `r-rest-api`); the
  push-protection **bypass** reasons are documented (`It's used in tests` / `It's a false positive` /
  `I'll fix it later`). The secret-scanning alert-resolution dropdown labels and the Dependabot
  **dismissal-reason** strings were **not** enumerated on any live page on 2026-07-02 — teach those
  conceptually, do **not** quote them as exact UI labels.
- **404-prone deep links (re-verify at authoring/refresh time):** the dedicated Copilot Autofix concept
  page, the `prioritizing-dependabot-alerts-using-epss` page, and the older
  `fixing-security-alerts-at-scale/creating-a-security-campaign` path all 404'd or redirected on
  2026-07-02 — the affected facts are grounded on the current pages cited above.
- **Question count is unverified.** `~60` is a modeling assumption (GitHub/MS exam-family norm), not on
  either official page — confirm before launch and edit `track.exam.questionCount` if GitHub publishes it.
- **Re-point the tutor agent** ([ACADEMY_TUTOR_PROMPT.md](../ACADEMY_TUTOR_PROMPT.md)) at this corpus
  for a GH-500 tutor (swap the exam name, domains, and weights; keep the pedagogy).
