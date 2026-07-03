# Academy QA audit 2026-07-02

Method: 12 read-only Opus auditors ran in parallel — 9 per-track deep passes (each read `track.json` plus every domain/module file in full: lessons, knowledge-checks, questions, scenarios, labs, resources, videos), 1 link-rot pass (WebFetch-verified all 251 unique external URLs across 77 JSONs), and 1 cross-track pass (vocabulary consistency, duplicate stems over 1,535 stems, inter-track seams, manifest-vs-track parity). Findings below are deduped across auditors and verified against the live files where the exact text is load-bearing.

## Verdict

Content health is good and the tracks are fundamentally sound: technical claims cross-check against authoritative sources, answer keys are internally consistent within each pool, weights sum to 1.0, and video-id / domainId conventions hold. The defects are concentrated and fixable — no track needs a rewrite. The material risks are three factual/AC breaches that mis-teach as fact: a GH-500 supply-chain question (`q-d3-21`) that names security campaigns as the tool for Dependabot alerts (campaigns cover only code-scanning + secret-scanning, and this directly contradicts D5 `q-d5-11`); a platform-architect miscount that asserts "eleven core concepts" six times over a list of twelve; and an APA `m09` acceptance-criteria breach surfacing the internal "heartbeat" control as a user-configurable UI. A second, larger cluster is a phantom "Module 5" threaded through the cross-vendor track (lab, overview, lesson bodies, and two graded answer-explanations) even though the track ships only m1–m4. The rest is link rot (7 genuine 404s), a handful of intra-domain / cross-domain duplicate stems in the Google track, and cosmetic schema/grammar inconsistencies. Priority is the AC breaches and mis-teachings first, then the dead links, then the polish.

## High

**gh-500 / d3-supply-chain.json · `q-d3-21`** — Marks "A security campaign" as the correct tool to burn down a backlog of existing supply-chain (Dependabot) alerts. D3 is entirely Dependabot/dependency alerts, but GitHub security campaigns support only code-scanning and secret-scanning alerts — not Dependabot. Factually wrong and directly contradicts D5 `q-d5-11`, whose key states Dependabot alerts are remediated via their own campaign/PR flow, not campaigns. Stem confirmed: "Which feature is the right tool to drive down a backlog of existing supply-chain alerts across many repositories, with owners and a deadline?" → correct = "A security campaign".
_Fix:_ Reframe stem + answer to code-scanning or secret-scanning alerts, or make the correct answer Dependabot's own remediation flow; align with D5 `q-d5-11`.

**automatos/platform-architect / m00-what-is-automatos.json · `m00-l2-vocabulary`** — Miscount taught as fact: the module says "eleven core concepts/terms" 6 times (tagline, overview, `objective[1]`, lesson title, and the lesson body twice — all verified: "eleven"×6, "twelve"×0) but every enumerated Key Concepts list contains 12: Agent, Workspace, Playbook, Plugin, Skill, Tool, Knowledge Base, Universal Router, Mission, Channel, Knowledge Graph, Memory (all 12 confirmed present). Learners are told to use them "without drift," so a learner who counts the list finds the count itself is wrong.
_Fix:_ Replace "eleven" with "twelve" in all six locations, or remove one concept if only eleven are intended.

**automatos/platform-architect / m09-governance-ops.json · `m09-l3-rbac-isolation`** — AC breach: the track AC says heartbeat must not appear as UI, but the Context Engineering permission is taught as a live user-configurable control that can "Configure heartbeat parameters" — surfaced in the lesson body, in `q-m09-8`'s correct answer (option a), and in resource `r-gitbook-roles`'s annotation, with zero "internal/architecture-only" framing. Faithfully copied from gitbook `team/roles.md` line 51, but the AC deliberately overrides that leak.
_Fix:_ Drop "heartbeat parameters" from the Context Engineering capability list (lesson body, `q-m09-8` option a, and the `r-gitbook-roles` annotation); keep global prompts, orchestrator soul, and coordination rules.

**cross/cross-vendor / m1-openai-api-agents.json · `lab-m1-tool-using-agent` (goal + steps + checklist)** — The lab tells learners the ship-on-two-providers capstone is "Module 5": goal calls the note the reference "you'll extend when Module 5 has you ship the same app on two providers"; checklist ends "ARTIFACT SAVED … for reuse in Module 5"; steps repeat "Modules 4 and 5". The track ships only m1–m4; that capstone is in m4. Dead-end cross-ref to a non-existent module.
_Fix:_ Replace every "Module 5" / "Modules 4 and 5" with "Module 4" (the m4 capstone), matching `track.json`'s folded-into-m4 note.

**cross/cross-vendor / m1-openai-api-agents.json · overview + `m1-l3` body (lines ~7, ~241)** — Learner-facing overview says the portability instinct is what "Modules 4 and 5 of this track pay off"; Lesson 3 body says moving the agent to Gemini/open-weight "in Module 5 is a config change." No Module 5 exists — portability/capstone is m4. Contradicts `track.json` blueprintNote ("ships four domain files m1–m4").
_Fix:_ Change "Modules 4 and 5" to "Module 4" and "in Module 5" to "in Module 4" throughout the overview and Lesson 3.

**cross/cross-vendor / m3-open-weight.json · `kc-m3-l3-3` (option d explanation) + `q-m3-12` (option c explanation)** — Two answer-explanations assert "Module 05 adds an eval harness to catch drift on swap" as a distinct later module. There is no m5; the eval harness (Lesson 3 Pattern 4) and the drift-catching swap both live in m4. Mis-teaches the track's structure inside graded feedback, not just prose.
_Fix:_ Change both "Module 05" references to "Module 4" (the capstone that adds the eval harness).

**automatos/ai-business / m3-teach-it-your-business.json · line 347 (resource url)** — url `https://services.google.com/fh/files/misc/genai_leader_exam_guide_english.pdf` → HTTP 404. Wrong filename slug: the correct file `generative_ai_leader_exam_guide_english.pdf` is live and used in 23 other academy files. This lone cite has the truncated slug.
_Fix:_ Change `genai_leader_exam_guide_english.pdf` → `generative_ai_leader_exam_guide_english.pdf`.

## Medium

**github-copilot/gh-300 / d4-prompt-engineering.json · `kc-d4-9`** — Explanation labels mid-conversation `{role:'system'}` messages "(beta)". Authoritative Anthropic docs: on Claude Opus 4.8 there is no beta header — use the regular `client.messages.create`. Teaches a wrong API requirement. Also appears in the `l4` lesson body ("beta, on supporting models") and `q-d4-10`'s explanation ("beta") — 3 occurrences.
_Fix:_ Drop the "(beta)" qualifier in the `l4` body, `kc-d4-9`, and `q-d4-10`; state it needs a supporting model (Opus 4.8) and no beta header.

**github-copilot/gh-300 / d3-data-architecture.json · `r-d3-duplication`** — Resource titled "Suggestions matching public code (duplication detection)" and annotated as how Copilot checks suggestions against public code, but its url is the content-exclusion doc (`how-tos/configure-content-exclusion/exclude-content-from-copilot`) — a different feature (WebFetch-confirmed: the page is about excluding files, not public-code matching). Six items cite it for public-code claims (`kc-d3-5`, `q-d3-3`, `q-d3-4`, `q-d3-18`, `q-d3-20`, `s-d3-dataflow`); a learner following the source lands on the wrong page. D6's `r-d6-referencing` points to the correct doc.
_Fix:_ Change `r-d3-duplication` url to `https://docs.github.com/en/copilot/concepts/completions/code-referencing` (matching D6's `r-d6-referencing`).

**gh-500 / d3-supply-chain.json · `kc-d3-12`** — Reinforces the `q-d3-21` misconception: inside the Dependabot-only supply-chain domain it presents "A security campaign" as fitting "~300 existing alerts across several repos" (stem + correct option a confirmed). A learner reads "alerts" as Dependabot alerts, which campaigns don't cover — contradicting D5. The `l4-scale` lesson body's exam-anchor ("a campaign organises remediation") carries the same framing.
_Fix:_ Scope the alert type explicitly to code/secret scanning, or note campaigns exclude Dependabot supply-chain alerts, consistent with D5 `q-d5-11`.

**automatos/ai-business / m5-delegation-guardrails.json · `tagline`** — Tagline lists what you give the AI as "…a plan you approve, a spending limit, a written record". "A spending limit" reads as a pre-set spend ceiling — the exact framing the track AC forbids and which the module's own body, overview, and three questions (`kc-m5-l2-1`, `q-m5-5`, `q-m6-10`) explicitly debunk ("watch and stop, not a hard cap"). The first line a learner reads contradicts the module's central honest point.
_Fix:_ Replace "a spending limit" with "a cost you watch (with alerts)" or "a budget you watch" to match the watch-and-stop framing.

**automatos/platform-architect / m08-channels-surfaces.json · `m08-l3-shopify-and-ide`** — AC tension: the track AC names "board" as something that must not appear as UI, but the IDE lesson presents "the board" as a live VS Code view ("brings your workspace into the editor — the board, chat with your orchestrator, and your agents as views"), repeated in resource `r-ide-auto`'s annotation. Grounded in `automatos-ide/AUTO.md` but still surfaces "board" as a learner-facing UI element.
_Fix:_ Describe the IDE surface as "chat with your orchestrator and your agents as views inside VS Code" and drop "the board" (both the lesson line and the `r-ide-auto` annotation).

**cross/cross-vendor / m3-open-weight.json · overview + `m3-l1`/`m3-l3` bodies + `lab-m3-local-openai-endpoint` + `r-ollama-openai`/`r-hf-inference-providers` annotations** — ~13 references to "Module 04" (and "Module 04 and 05") frame m4 as a downstream module that "generalises/revisits" the base-URL swap. Content-correct (m4 does this) but the numbering coexists with the wrong "Module 05" claims, and the 04/05 split implies two later modules where only one (m4) exists.
_Fix:_ Keep "Module 04" but collapse the 04/05 split — change "Module 04 and 05" to "Module 4" so the capstone reads as a single module. (Resolve together with the two m3 High items above.)

**google/gen-ai-leader / d2-google-offerings.json · `q-d2-31`** — Exam-bank item near-verbatim duplicates lesson knowledge-check `kc-d2-8`: same "which CES component gives real-time suggestions to a HUMAN agent" stem and identical four options in identical order (Agent Assist / Conversational Agents / Conversational Insights / Model Garden).
_Fix:_ Rewrite `q-d2-31` to a fresh angle or drop it; keep exam items distinct from lesson KCs.

**google/gen-ai-leader / d2-google-offerings.json · `q-d2-35`** — Near-duplicates `kc-d2-7`: same "compare Google + Claude + Llama in one place → Model Garden" stem and correct answer, distractors nearly identical.
_Fix:_ Differentiate `q-d2-35` (test open/self-deploy or a wrong-offering trap) or remove it.

**anthropic/cca-f / track.json · line 66 (resource `r-docs`)** — url `https://platform.claude.com/docs` → HTTP 404 (stable). The docs root is `/docs/en/…`; the bare `/docs` path returns 404.
_Fix:_ Use `https://platform.claude.com/docs/en/api/overview` (or `/docs/en`).

**github/gh-500 / d4-code-security.json · (resource url)** — `https://docs.github.com/en/code-security/code-scanning/managing-your-code-scanning-alerts/about-autofix-for-codeql-code-scanning` → HTTP 404. GitHub renamed the path segment `managing-your-code-scanning-alerts` → `managing-code-scanning-alerts` (no "your").
_Fix:_ Drop "your-": `.../managing-code-scanning-alerts/about-autofix-for-codeql-code-scanning`.

**github-copilot/gh-300 / d6-privacy-safeguards.json · (resource url)** — `https://docs.github.com/en/copilot/how-tos/manage-your-account/manage-policies-for-copilot-in-your-organization` → HTTP 404 (stable). GitHub restructured the Copilot how-tos; this path no longer exists.
_Fix:_ Relink to the current Copilot org-policy page under `docs.github.com/en/copilot/how-tos/`.

**automatos/ai-explained / m09-rag.json · (resource url)** — `https://developer.mozilla.org/en-US/docs/Web/AI/AI_basics` → HTTP 404. MDN has no page at that path (no `AI_basics` doc under `Web/AI`).
_Fix:_ Remove or replace with a real MDN/AI intro reference.

## Low

- **cca-f / d5-context-reliability.json · `q-d5-5`** — Pure prompt-caching question cites `r-d5-windows` (Context windows), which doesn't cover caching; no caching resource exists in D5. → Point at D4's `r-d4-caching`, add a caching resource, or stop citing `r-d5-windows`.
- **cca-f / d5-context-reliability.json · `q-d5-6` / `q-d5-7` / `q-d5-8`** — Provenance, honest-status, and error-propagation questions all cite `r-d5-windows` though `r-d5-errors` (Errors & rate limits) is the fitting source and exists. → Re-map to `r-d5-errors` (or a reliability-specific source).
- **gh-300 / d2-responsible-ai.json · `kc-d2-11`** — Option b carries an explicit `"correct": false` while every other distractor omits it (correctness implied by absence). → Remove the explicit `"correct": false` from option b.
- **gh-500 / d1-security-suites.json · `q-d1-16` (+ `q-d1-15`)** — D1 tests EPSS (`q-d1-16`) and SBOM SPDX-version trivia (`q-d1-15`, "version 2.3") but D1's objectives/overview never introduce EPSS or SBOM detail — that lives in D3. Facts are correct; blueprint-vs-content scope drift. → Add a one-line EPSS/SBOM mention to a D1 objective, or move the depth to D3.
- **iapp/aigp / d1-foundations.json · `l1-what-is-ai` body + `r-eu-commission-framework`** — D1 names the EU simplification package "AI Omnibus" (twice); d2–d4 use the official "Digital Omnibus on AI" (tabled 19 Nov 2025). One package, two names. → Standardise on "Digital Omnibus on AI" in d1; keep "AI Omnibus" only as a parenthetical alias.
- **iapp/aigp / d2-laws-standards.json · `q-d2-27` (vs `kc-d2-5`)** — Within one domain, `q-d2-27` (multi) and `kc-d2-5` (single) test the identical proposition (high-risk human oversight is shared: provider Art 14 designs, deployer assigns people) with the same two correct facts and distractor themes. Redundant reinforcement. → Re-angle `q-d2-27` to a different Art 14 facet (two-person biometric verification, or automation-bias).
- **google/gen-ai-leader / d2-google-offerings.json · `q-d2-6`** — "What are Gems?" duplicates `kc-d2-4` ("What are Gems in the Gemini app?"): same definitional stem and correct answer, distractors only reshuffled. → Fold into one, or convert `q-d2-6` into a when-to-use-a-Gem scenario.
- **automatos/ai-business / m0-what-ai-is.json · `q-m0-1`** — Distractor b: "A always-current fact database…" — "A" before a vowel; should be "An". Learner-facing typo. → Change to "An always-current".
- **automatos/ai-business / m6-memory.json · `m06-memory` (tagline)** — "…where you should uploading a document to a Knowledge Base instead." — "should uploading" is ungrammatical. → "where you should upload a document to a Knowledge Base instead." (Note: file is `automatos/ai-business/m6-…`; verify exact basename before editing.)
- **cross/ai-security / m2-prompt-injection-output.json · `kc-m2-l1-1`** — Distractor options b, c, d omit the `"correct": false` field that every other option in the track carries (only the correct option has `"correct": true`). → Add `"correct": false` to b, c, d.
- **cross/ai-security / m4-excessive-agency-agents.json · `kc-m4-l1-1`** — Same defect: options b, c, d lack `"correct": false` (only a has `"correct": true`). → Add `"correct": false` to b, c, d.
- **cross/ai-security / m3-poisoning-supply-chain.json · `r-owasp-llm04`** — Annotation ends "the shift-left bridge to GH-500"; GH-500 is never defined in this track (anchors on OWASP/ATLAS/NIST/GAIPS). Dangling cross-track reference. → Remove the GH-500 clause or replace with a self-contained phrase ("the shift-left / secure-SDLC bridge").
- **cross/ai-security / m4-excessive-agency-agents.json · `1-vocabulary-blueprint`** — "blueprint" used as an unlabelled current Automatos noun for an agent's config/system prompt in lab steps/checklist (also m5 lines 488/492, m2 line 481). Only APA m09 sanctions it as an explicitly-labelled teaching metaphor; ai-security never defines it, so it reads as a real UI object. → Say "system prompt / agent configuration", or add a one-line "we use 'blueprint' to mean the config" gloss as APA m09 does.
- **automatos/platform-architect / m01-chat-first-agent.json · `3-seam-abf-module-gloss`** — Overview says m01 is "the machinery behind [ABF] module 4 — where ABF taught you to write a brief and hand work to an AI." Brief-writing is ABF module 2 ("Working with AI day to day"); ABF module 4 is "From chats to systems". (m03 "first half of module 4 (giving an agent tools)" is similarly loose.) → Attribute brief-writing to ABF module 2, or reword to "where ABF module 4 turned that brief into a built worker".
- **public/content/manifest.json · `scope-note-ai-explained`** — Not a defect in the 9 audited tracks: ai-explained (AIX, 13 modules) is now `status:"live"` and fully built on disk (13 module files + track.json, dated today), though the task scoped "9 built tracks" and the start-of-session snapshot showed it "coming-soon". Spot-check: manifest name/code/domains=13/exam=null all match its track.json; no recipe/roles/five-layer-memory drift found. → Run the same cross-track audit over ai-explained (the 10th live track), or revert its status to coming-soon if flipped prematurely.

## Link rot

All 251 unique external URLs were WebFetch-verified once. Redirects-to-valid, transient flakes, PDFs, and known bot-blocked hosts (iso.org, certmetrics, help.openai, EUR-Lex ELI, aiact art.27) were classified as NOT rot. Only the genuine, stable 404s below.

| File | Broken URL | Fix | Sev |
| --- | --- | --- | --- |
| automatos/ai-business/m3-teach-it-your-business.json (line 347) | `services.google.com/fh/files/misc/genai_leader_exam_guide_english.pdf` | `…/generative_ai_leader_exam_guide_english.pdf` (live; used in 23 other files) | High |
| anthropic/cca-f/track.json (line 66, `r-docs`) | `platform.claude.com/docs` | `platform.claude.com/docs/en/api/overview` (or `/docs/en`) | Medium |
| github/gh-500/d4-code-security.json | `docs.github.com/en/code-security/code-scanning/managing-your-code-scanning-alerts/about-autofix-for-codeql-code-scanning` | drop `your-`: `…/managing-code-scanning-alerts/about-autofix-for-codeql-code-scanning` | Medium |
| github-copilot/gh-300/d6-privacy-safeguards.json | `docs.github.com/en/copilot/how-tos/manage-your-account/manage-policies-for-copilot-in-your-organization` | relink to current Copilot org-policy page under `docs.github.com/en/copilot/how-tos/` | Medium |
| automatos/ai-explained/m09-rag.json | `developer.mozilla.org/en-US/docs/Web/AI/AI_basics` | remove or replace with a real MDN/AI intro reference | Medium |

Note: the two content-mislink findings (`r-d3-duplication` → wrong doc, D5 caching/reliability `sourceRef` mis-maps) are live URLs pointing at the wrong page/topic, so they are tracked under High/Medium/Low above rather than as link rot.

## Fix plan

Grouped into 6 batched work items, ordered by learner impact (each item is self-contained for a fixer agent):

1. **Kill the campaigns-cover-Dependabot mis-teaching (gh-500 D3).** Reframe `q-d3-21` and `kc-d3-12` (and the `l4-scale` body exam-anchor) so security campaigns apply to code-scanning/secret-scanning alerts — or make the correct answer Dependabot's own remediation flow — and align wording with D5 `q-d5-11`.
2. **Purge the phantom "Module 5" from cross-vendor (m1 + m3).** Replace every "Module 5"/"Modules 4 and 5"/"Module 05" with "Module 4" across m1 (`lab-m1-tool-using-agent` goal/steps/checklist, overview, `m1-l3` body) and m3 (`kc-m3-l3-3` option-d and `q-m3-12` option-c explanations), and collapse the m3 "Module 04 and 05" numbering to a single "Module 4"; keep everything consistent with `track.json`'s m1–m4 blueprintNote.
3. **Enforce the internal-vocabulary ACs (platform-architect).** Fix the m00 "eleven"→"twelve" count in all six spots; drop "heartbeat parameters" from m09 (`m09-l3-rbac-isolation` body, `q-m09-8` option a, `r-gitbook-roles` annotation); and remove "the board" as a UI element from m08 (`m08-l3-shopify-and-ide` line + `r-ide-auto` annotation).
4. **Correct the Anthropic "(beta)" API claim (gh-300 D4).** Drop "(beta)" from the `l4` lesson body, `kc-d4-9`, and `q-d4-10`; state that mid-conversation system messages need a supporting model (Opus 4.8) and no beta header.
5. **Repair dead + mislinked resources.** Apply the five 404 URL fixes in the Link-rot table, plus repoint `r-d3-duplication` to `…/concepts/completions/code-referencing`, and re-map D5 `q-d5-5` (caching) and `q-d5-6/7/8` (reliability) off `r-d5-windows` to the correct sources.
6. **De-duplicate the Google exam bank + fix the m5 spending-limit tagline.** Rewrite or drop `q-d2-31`, `q-d2-35`, and `q-d2-6` so exam items no longer restate lesson KCs `kc-d2-8`/`kc-d2-7`/`kc-d2-4`; and change the ai-business m5 tagline "a spending limit" → "a cost you watch (with alerts)" to match the module's watch-and-stop framing.
