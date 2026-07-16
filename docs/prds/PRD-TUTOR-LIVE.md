# PRD-TUTOR-LIVE — Bring "Ask the Academy" back, then let it open knowing the learner

**Status:** DRAFT · S0 blocked on a platform-repo CORS fix (interface dependency, spelled out in §4.1) ·
S3 blocked on D-T1/D-T2/D-T3
**Repos:** `automatos-academy` (all client slices) · `automatos-ai` platform (S0 only — a preflight
contract, not an implementation plan)
**Prior art:** tutor client `public/js/tutor.js` · agent setup [ACADEMY_TUTOR_PROMPT.md](../ACADEMY_TUTOR_PROMPT.md) ·
ingest runbook [KNOWLEDGE_INGEST.md](../KNOWLEDGE_INGEST.md) · progress plumbing [PRD-U2](./PRD-UNIFIED/PRD-U2-SHARED-PROFILES-PROGRESS.md)
**Evidence:** [competitor-scan-2026-07-16.md](../research/competitor-scan-2026-07-16.md) — synthesis gap
"progress-aware proactive AI tutoring" (item #10; Khanmigo §6 tutors knowing skill mastery, Sololearn
Kodie §3 drills weak areas, Duolingo Lily §1 remembers past sessions). Academy has the tutor AND the
progress data; they have never met.

## 1. Problem

The tutor is fully built and fully down.

**What exists (all live in `public/js/tutor.js`):** a site-wide corner FAB + docked panel, a full
`#/tutor` study page, markdown + Mermaid rendering (XSS-safe by construction), a shared session across
both surfaces, and per-question **"Ask the tutor why"** deep links (single choke-point `lockAndExplain`
in `views/question.js` → exported `askTutor()`). It streams from the Automatos platform:
`POST https://api.automatos.app/api/widgets/chat`, `Authorization: Bearer ak_pub_…`, SSE response.
Config is hydrated at boot (`public/chat-config.js` from `ACADEMY_CHAT_PUBLIC_KEY` /
`ACADEMY_CHAT_AGENT_ID` — **both set in prod**).

**Why it's broken (diagnosed 2026-07-16):** the platform API fails the CORS preflight. A direct POST
with an academy `Origin` returns 200 and a streaming agent reply — the agent is alive. But
`OPTIONS /api/widgets/chat` with `Origin` + `Access-Control-Request-*` headers returns **403 with zero
`Access-Control-*` headers**, so every real browser blocks the request before the POST ever fires.

**What the learner sees:** not silence, but a wrong diagnosis. The blocked fetch rejects, and
`streamChat`'s error path (tutor.js:128) renders `⚠ Network error — check your connection.` in the
reply bubble (tutor.js:200) — blaming the learner's wifi for the platform's refused preflight. The
chips and input stay enabled (the key is set), so every send ends the same way. There is no retry
affordance, no health signal, and no way to tell "platform unreachable" from "you're offline."

Compounding problems even once unblocked: the copy is single-track (chips, page lede "Grounded in
everything Claude", and the agent prompt all assume CCA-F, while the catalog now has **10 live tracks
across two lanes**), and whether the current platform agent ever ingested the full multi-track corpus
is **unknown**.

## 2. Goals

1. A learner on any page can ask the tutor and get a streamed, grounded answer — in a real browser,
   on `academy.automatos.app`.
2. When the tutor *can't* answer, the panel says what's actually wrong (unreachable / auth / stream
   dropped) and offers a retry — never a false "check your connection."
3. The tutor teaches **every live track**, not just CCA-F, and its knowledge base verifiably contains
   the current corpus.
4. A learner who opts in gets a tutor that already knows their state — due-review count, weakest
   domains, readiness and grade, streak, exam date when set — and tutors *from* it ("you have 14
   reviews due and D3 is your weakest domain — want to start there?").
5. Progress sharing is explicit, PII-minimal, and inspectable: numbers and track/domain ids only,
   never name or email, off by a visible toggle.

## 3. Non-goals

- **No platform implementation plan.** S0 defines the preflight contract the academy needs and proves
  it with curl; how the origin-enforcement middleware satisfies it belongs to the platform repo.
- **No proactive openers yet.** The tutor greeting with the due-queue line ("2b") is one line here,
  coordinated with PRD-MT-12's Today screen — not specced in this PRD.
- **No voice build.** S4 is a one-line affordance stub pointing at PRD-VOICE.
- **No server-side storage of learner context.** The context rides the chat request; this PRD adds no
  progress persistence anywhere new.
- **No new progress computation.** Everything sent already exists client-side (store + engine + U2
  reconciled mirrors); the tutor consumes selectors, it doesn't grow rivals to them.

## 4. Design

### 4.1 S0 — the platform preflight contract (dependency, with repro)

The academy origin-allowlists its `ak_pub_*` key (`allowed_domains` = `academy.automatos.app`, the
Railway URL, `localhost:4321` — see chat-config template). The break, reproduced 2026-07-16:

```bash
# The agent is alive — a direct POST (no preflight) streams a reply:
curl -sN -X POST https://api.automatos.app/api/widgets/chat \
  -H "Origin: https://academy.automatos.app" \
  -H "Authorization: Bearer $ACADEMY_CHAT_PUBLIC_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"ping"}'                      # → 200 + SSE stream

# What every browser sends first — and where it dies:
curl -si -X OPTIONS https://api.automatos.app/api/widgets/chat \
  -H "Origin: https://academy.automatos.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
# → 403 · no Access-Control-* headers → fetch() never issues the POST
```

**Required interface (acceptance for S0):**
1. `OPTIONS /api/widgets/chat` from an allowlisted origin → **204** with
   `Access-Control-Allow-Origin: <origin>`, `Access-Control-Allow-Methods` including `POST`,
   `Access-Control-Allow-Headers` including `authorization, content-type`, and a sane
   `Access-Control-Max-Age`. Preflights **never carry Authorization** — the middleware must answer
   them from `Origin` alone (it cannot demand the key it will see on the actual POST).
2. The actual `POST` response (200, SSE) also carries `Access-Control-Allow-Origin` for the requesting
   origin — a green preflight alone doesn't let the browser read the stream.
3. Non-allowlisted origins keep failing (no ACAO) — this fix loosens preflights, not origin policy.
4. Verified end-to-end from a real browser on `academy.automatos.app` (devtools network tab: preflight
   204, POST 200, stream renders).

This is the only platform-repo item; everything below is academy-side and can land while S0 is open
(the panel's existing disabled/"coming online" state plus the S2 error states keep the site honest
in the meantime).

### 4.2 S1 — corpus verify + refresh, multi-track prompt

- **Exporter exists:** `npm run tutor-corpus` (`scripts/export-tutor-corpus.mjs`, last touched
  2026-07-03) walks every **live** track and emits KB-ready markdown — as of today's diagnosis, 78
  docs / 227 lessons / 1,691 Q&A with why-explanations, plus `INDEX.md` as the upload checklist. The
  manifest now lists **10 live tracks of 11** (openai `coming-soon`), so a fresh export is required —
  the uploaded corpus predates the newest tracks, and whether the prod agent has *any* full corpus
  ingested is unknown.
- **Verify:** per-track probe questions (one per track, answerable only from track content — e.g. the
  GH-500 blueprint split, an ABF module artifact) asked through the live agent. A miss on any track ⇒
  re-export → re-upload per `INDEX.md` → re-probe. Record "knowledge as of <date>" per
  KNOWLEDGE_INGEST §5.
- **Prompt update:** `ACADEMY_TUTOR_PROMPT.md` is CCA-F-only today — it hardcodes the five CCA-F
  domains and refuses "anything that isn't learning Claude." Rewrite (same file, same paste-in
  workflow): keep the identity, why-not-just-what teaching, quiz/grade behaviours, and Mermaid rule;
  make track awareness explicit (answer within the learner's current track when known — §4.4 —
  otherwise ask which track); map exam answers to *that track's* blueprint; and carry the Operator-lane
  tone rule (plain English first, no exam framing for ABF/AI-Explained learners — PRD-B1 §2).

### 4.3 S2 — panel refresh + honest error states

Verified in code: the `.tut-*` styles live in `academy.css` — the periwinkle token file itself — and
already consume `var(--accent)`, glass and radius tokens, so the panel wears Mist/Night correctly.
The refresh is therefore surgical, not a rescue:

- **Remnants:** hardcoded `rgba(39,60,89,.28)` box-shadows on `.tut-fab`/`.tut-panel` (ink-navy at
  fixed alpha — wrong in Night) → shadow tokens; the empty state's retired `serif-i` alias → current
  type classes.
- **Multi-track surface:** replace the six CCA-F-only `STUDY_PROMPTS` chips with chips derived from
  the current route's track (fallback: generic study actions), and fix the `#/tutor` lede + empty-state
  copy ("Ask anything about the exam or about Claude") to speak for the whole catalog.
- **Error states that tell the truth.** `streamChat` distinguishes four failures today but words them
  badly. New contract: fetch rejection → *"The Academy can't reach the tutor right now — this is on
  our side, not yours"* + **Retry** button (resends the failed message; `navigator.onLine === false`
  is the one case that *does* say "you're offline"); 401/403 → key/config problem worded for the
  learner + a "try again later"; other non-OK → status-coded tutor error; mid-stream drop → keep
  partial text, offer "continue". Failures render as a distinct state row, not a fake assistant bubble.
- **Health signal:** the FAB gains a quiet unavailable state after a failed send (cleared on success)
  so the panel never *looks* healthier than it is. No polling — send results are the only probe.

### 4.4 S3 — consented learner context (the progress-aware tutor)

All inputs already exist client-side; `views/profile.js#gatherStarted` shows the walk and the engine
has the selectors:

| Field | Source (existing) |
|---|---|
| `due_reviews` | `Store.dueQuestions()` — SM-2 due timestamps (`store.js:108`) |
| `readiness`, `grade` | `engine/readiness.js` `overall()` / `grade()` over the (reconciled) store |
| `weakest[]` | `engine/readiness.js` `domainStats()` — lowest-mastery domain ids |
| `mocks` | `store.s.exams` (count, best scaled, pass mark) |
| `streak` | U2 server snapshot (`sync/meta.js`) — signed-in only; omitted signed-out |
| `exam_date` | optional — **no web store today** (mobile-side setting); sent only once a web surface stores one |

**Wire shape** — compact, versioned, PII-minimal (numbers + track/domain ids only; no name, email, or
user id — the platform sees the public key and this JSON, nothing more), hard-capped at 1 KB:

```json
{ "v": 1, "track": "anthropic/cca-f", "readiness": 62, "grade": "B",
  "due_reviews": 14, "weakest": [{ "d": "D3", "mastery": 41 }, { "d": "D5", "mastery": 48 }],
  "mocks": { "count": 2, "best_scaled": 68, "pass": 70 },
  "streak": { "current": 6, "best": 21 }, "exam_date": null }
```

- **Track selection:** the track of the current route; off-track pages use the most-recently-studied
  track. One track per message — the tutor tutors the course you're in, it doesn't audit your life.
- **Consent:** a visible toggle in the panel header area — *"Let the tutor see my progress"* — plus a
  first-open explainer card showing exactly the fields above. State in localStorage; honoured on every
  send path including `askTutor()` deep links. Toggle off ⇒ **zero context bytes leave the device**
  (verifiable in devtools). Default: D-T1.
- **Transport:** D-T2 (platform-side `context` field vs client-side preamble). Cadence: D-T3.
- **Prompt section (with S1's rewrite):** "You may receive `learner_context`. Use it to tutor, not to
  recite: open with at most one natural line grounded in it, prioritise the weakest domain, offer a
  due-review quiz when `due_reviews > 0`, pace advice to `exam_date` when present. If absent, tutor
  normally and never guess at progress."
- **2b (not specced here):** once context flows, a proactive opener ("14 due — quick 10?") is one
  line coordinated with PRD-MT-12's Today screen so web and mobile say the same thing.

### 4.5 S4 — voice affordance stub

A disabled mic button in the input row, tooltip "Voice tutoring — coming with PRD-VOICE"; one line of
markup, zero engine work here.

## 5. User stories

- **US-T1** — A learner on `academy.automatos.app` opens the FAB, asks a question, and watches the
  answer stream — preflight 204, POST 200, Mermaid renders. (S0)
- **US-T2** — A learner reveals a wrong quiz answer, taps "Ask the tutor why", and the docked panel
  opens with a grounded explanation of that exact question. (S0+S1, existing deep link)
- **US-T3** — The platform is down; the panel says the Academy can't reach the tutor, blames itself
  not the learner's wifi, and Retry works when service returns. (S2)
- **US-T4** — A GH-500 learner asks about their track and gets track-correct content — no CCA-F
  domain weights leaking into a GitHub answer. (S1)
- **US-T5** — A learner flips "Let the tutor see my progress" on; the tutor's next reply opens with
  their due count and weakest domain and offers to drill it. Flipping it off provably stops the flow. (S3)
- **US-T6** — An ABF (Operator-lane) learner gets plain-English coaching with no exam framing. (S1)
- **US-T7** — A signed-out learner keeps a fully working tutor; context simply omits the
  server-derived streak. (S3)

## 6. Slices

| # | Slice | DoD |
|---|---|---|
| S0 | Platform preflight contract (dependency) | §4.1 acceptance 1–4: curl OPTIONS → 204 with correct ACAO/headers for allowlisted origins; POST carries ACAO; non-allowlisted still refused; verified in a real browser on prod |
| S1 | Corpus verify/refresh + multi-track prompt | fresh `npm run tutor-corpus` uploaded per INDEX.md; per-track probe questions pass on the live agent (all 10 live tracks); prompt no longer refuses non-CCA-F asks; "knowledge as of" recorded |
| S2 | Panel refresh + honest errors | shadow/type remnants tokenised; multi-track chips + copy; the four failure modes render distinct, truthful states with Retry; `navigator.onLine` is the only path that says "offline"; Mist + Night pass |
| S3 | Consented `learner_context` + prompt use | toggle + explainer shipped; off ⇒ no context bytes on the wire (devtools-verified); ≤ 1 KB enforced; on ⇒ agent's reply reflects real due/weakest numbers; deep-link path honours consent |
| S4 | Voice stub | disabled mic + PRD-VOICE pointer renders in both surfaces |

## 7. Risks

- **S0 sits in another repo** — the whole PRD is dark until the platform answers preflights. Mitigation:
  S1 verification runs over curl (no browser needed), S2/S3 land behind the panel's existing
  disabled/error states; flagged to the platform pod as an interface ask, nothing more.
- **A permissive preflight is not a permissive API** — S0 must not weaken origin enforcement on the
  POST itself; acceptance 3 pins that, and the ak_pub key's `allowed_domains` remains the gate.
- **Context vs privacy drift** — the schema is PII-minimal today; the risk is fields creeping in later.
  The versioned shape (`v:1`), the explainer card listing every field, and the 1 KB cap are the
  guardrails; any new field re-opens D-T1.
- **Token cost / prompt bloat** — per-message context multiplies tokens on long sessions; D-T3's
  per-conversation option bounds it. The cap keeps worst case ~250 tokens.
- **Corpus staleness recurs** — the agent quietly falls behind each content release. Re-export is one
  command; wire the reminder into the release runbook (PRD-OPS-FRESHNESS owns the cadence).
- **Mermaid rides a CDN** (`jsdelivr`, lazy import) — diagram rendering fails closed to source text
  today (kept); self-hosting is a follow-up candidate, not in scope here.

## 8. Decision boxes

- **D-T1 — Consent default for progress sharing.**
  (a) opt-in, toggle starts off · (b) opt-out for signed-in learners · (c) ask-once card on first
  tutor open, no silent default; signed-out starts off.
  *Recommendation: (c) — an explicit choice beats either silent default, and it doubles as the
  feature's announcement.* **Answer: ☐**
- **D-T2 — Context transport.**
  (a) client-side preamble block prepended to the first message text (no platform change; visible in
  transcript) · (b) additive optional `context` field on `POST /api/widgets/chat`, injected into the
  agent's prompt server-side (small platform ask, clean transcripts).
  *Recommendation: (a) to ship with S3, (b) requested alongside S0 as the durable form.* **Answer: ☐**
- **D-T3 — Context cadence.**
  (a) every message · (b) once per conversation, re-sent when the numbers materially change (new due
  items, readiness ±5) or the conversation is stale.
  *Recommendation: (b) — the tutor needs fresh-enough state, not a telemetry stream.* **Answer: ☐**
- **D-T4 — Tutor telemetry.**
  `track("tutor_message")` already fires (analytics.js — a no-op unless `ACADEMY_ANALYTICS_ENDPOINT`
  is set). Add privacy-clean counts for error states, consent flips, and context-attached sends?
  (a) yes, counts only · (b) no, leave the single event.
  *Recommendation: (a) — S2's error states are only provably rare if we can count them.* **Answer: ☐**
