# PRD-FACTORY-GATE — the draft plane verifies what the git lane verifies

**Status:** APPROVED for build · **Owner:** Academy · **Source:** `docs/CONTENT-FACTORY.md` §09 (R1–R4, R8) · **Created:** 2026-08-28

## 1. Introduction

The content factory (CONTENT-FACTORY.md) has Automatos agents authoring lessons, questions,
scenarios, whole courses and podcast entries through the Academy's draft plane. That plane
currently **trusts where the git lane verifies**: submission checks scope shape, JSON
validity and size; approval flips a status inside a transaction and checks nothing
semantic. Every guard the git lane runs — dead-link detection (the 211-dead-links
incident), markdown-token leaks (the GH-500 D1 leak), unanswerable questions, weight sums,
card-contract errors, episode-shape errors — is bypassed by a draft.

That was acceptable while drafts came from Gerard. It is not acceptable once a Writer
agent submits thirty questions at a time, and it blocks phases 3–4 of the factory plan.

This wave closes the gap (R1, R2), gives the platform a signal to react to (R3), gives
agents a path to fire the already-dispatchable render workflows (R4), and arms the
machine principal (R8). R5–R7 are explicitly deferred.

## 2. Goals

- A draft that would fail `npm run validate` on the git lane **cannot be approved**.
- A new-course batch (manifest + track + domains) approves **atomically or not at all**,
  with cross-document references resolving within base + batch.
- Approval and rejection emit a **signed outbound event** the platform can watch, so
  "media on a watch" (factory phase 4) has something to watch.
- An agent holding the machine key can **dispatch an allowlisted CI workflow** without a
  GitHub credential of its own.
- Zero new behaviour when the new env vars are unset — every addition is default-off,
  matching the repo's `SPINE_ENABLED` posture.

## 3. User Stories

### US-001: Extract the validators into a pure tree library
**Description:** As the approve endpoint, I need the git lane's validators callable
against an in-memory tree so the same checks can run where no disk tree exists.

`scripts/validate-content.mjs` today reads from `public/content` and accumulates into
module-level `errors[]`/`warnings[]`. The checks themselves (`validateUrl`,
`validateQuestion`, `checkPlainFieldsDeep`, weight sums, id uniqueness, episode +
card errors) are sound — they are just welded to disk and shared state.

**Acceptance Criteria:**
- [ ] New pure module `server/content/validate-tree.js`: `validateContentTree(documents)`
      → `{ errors: string[], warnings: string[] }`, where `documents` is a map of
      relPath → parsed JSON (the same shape the content index holds).
- [ ] `scripts/validate-content.mjs` becomes a thin wrapper: read disk → build the map →
      call the library → print + exit non-zero on errors. **Byte-identical error strings**
      on the current tree (diff the output before/after on real content).
- [ ] `npm run validate` output unchanged (CI proof: the content-publish gate still passes).
- [ ] Zero-framework tests: known-bad fixtures (dead repo-relative link, `**markdown**` in
      a plain field, question whose `answer` is not among `options`, weights ≠ 1.0,
      duplicate question id) each produce their expected error through the library.

### US-002: Approval blocks on validation (R1)
**Description:** As the human gate, I want approval to run the full validators against the
tree-as-it-would-be, so an agent draft with defects the git lane would reject never
reaches a learner.

**Acceptance Criteria:**
- [ ] `POST /api/admin/content/drafts/:id/approve` builds the **effective tree** — current
      served documents (base + already-approved overrides) with this draft's document
      overlaid — and runs `validateContentTree` before the status flip.
- [ ] Errors → `422 { error: "validation_failed", errors: [...] }`, draft stays pending,
      nothing committed. Warnings alone do not block and are returned in the 200 body.
- [ ] **No override parameter exists.** No `force`, no `skipValidation`. (§9 rule: the
      git lane has no publish-anyway; the draft lane gets none.)
- [ ] Rejection (`/reject`) is untouched — rejecting bad content must never be blocked.
- [ ] Tests: approving a draft that introduces each US-001 fixture defect 422s with that
      error; approving a clean draft still 200s and serves through the overlay.

### US-003: Batch approve validates the resulting tree (R2)
**Description:** As the human gate approving a new course, I want the whole batch
validated as one future tree, so a manifest entry can never go live pointing at a track
document that is not part of the same approved set.

**Acceptance Criteria:**
- [ ] `POST /api/admin/content/batches/:batchId/approve` overlays **all** the batch's
      pending drafts onto the effective tree and validates once, before any status flips.
- [ ] Cross-document integrity in the library: every `domainFiles` entry in a track doc
      resolves to a domain doc in the tree; every manifest track entry resolves to a
      track doc; a manifest `domains` count that disagrees with the track's actual
      domain files is an error.
- [ ] Any error rejects the **entire batch** (422, per-error list, no partial approval) —
      preserving the existing all-or-nothing transaction posture.
- [ ] Test: a three-draft new-course batch (manifest + track + one domain) approves clean;
      the same batch minus the track draft 422s naming the unresolvable reference.

### US-004: Submit-time advisory validation (R1)
**Description:** As a Writer agent, I want validation feedback at submission so I can
iterate before a human ever reviews, without submission becoming a gate.

**Acceptance Criteria:**
- [ ] `POST /api/admin/content` runs the same effective-tree validation and returns an
      `advisory: { errors, warnings }` block in the 201 response.
- [ ] Advisory findings **never block submission** — a draft with errors is stored (it
      cannot be approved, per US-002, but it exists for a human to read).
- [ ] Existing callers unaffected: response stays a superset of today's shape.
- [ ] Test: submitting a draft with a dead link stores it and reports the error in
      `advisory.errors`; approving that same draft 422s.

### US-005: Signed approval webhooks (R3)
**Description:** As the platform (watches), I want a signed event when content is approved
or rejected, so a Media mission can fire the moment a domain goes live.

**Acceptance Criteria:**
- [ ] Env: `ACADEMY_WEBHOOK_URL` + `ACADEMY_WEBHOOK_SECRET`. Both unset → feature is a
      no-op (default-off; boot log says so in one line).
- [ ] On approve/reject (single and batch), after COMMIT, POST to the URL:
      `{ event: "content.approved" | "content.rejected", scopeKind, vendorId, trackId,
      domainId, draftId, batchId, sha, at }` — one event per draft, batch events carry
      the shared `batchId`.
- [ ] Header `X-Academy-Signature: sha256=<HMAC-SHA256(secret, rawBody)>` — the Stripe
      pattern already precedented in this repo's webhook consumption.
- [ ] Fire-and-forget with 3 retries (1s/5s/25s backoff): a dead receiver **never fails,
      slows, or rolls back an approval**. Failures log one warning line.
- [ ] Tests: stub receiver asserts payload + signature verify; receiver down → approve
      still 200s; secret unset → zero fetches.

### US-006: CI dispatch proxy (R4)
**Description:** As an agent holding the machine key, I want to trigger an allowlisted
render workflow, so media renders start without the workspace holding a GitHub token.

**Acceptance Criteria:**
- [ ] `POST /api/admin/ci/dispatch` behind the existing `requireAdmin` (machine key or
      Clerk allowlist): `{ workflow, ref?, inputs? }`.
- [ ] Hard allowlist of dispatchable workflows (the seven that exist:
      `deploy-media`, `render-infographic`, `render-minivideo`, `voice-catalog`,
      `voice-sample`, `content-publish`, `sync-tutor-corpus`); anything else → 400.
- [ ] Server-held `GITHUB_DISPATCH_TOKEN` (fine-grained, actions:write only) calls the
      GitHub `workflow_dispatch` API; token unset → `503 not_configured` (fail closed,
      the repo's standard posture) — never a silent success.
- [ ] Response relays GitHub's status; GitHub errors surface as `502` with the message,
      never a stack.
- [ ] Tests: stubbed GitHub — allowlisted workflow dispatches with inputs; unlisted 400s;
      no token 503s; GitHub 500 → 502.

### US-007: Arm-state boot log + config docs (R8)
**Description:** As the operator, I want one glance at boot output to tell me which
factory seams are armed, so a missing env var is a log line and not a silent dead lane.

**Acceptance Criteria:**
- [ ] Boot logs one line per seam: content plane (machine key set?), webhook (URL set?),
      CI dispatch (token set?) — pattern of the existing `[wire]`/`[events]` lines.
- [ ] `docs/CONTENT-FACTORY.md` §09 gains the definitive env table:
      `ACADEMY_ADMIN_KEY`, `ACADEMY_WEBHOOK_URL`, `ACADEMY_WEBHOOK_SECRET`,
      `GITHUB_DISPATCH_TOKEN` — each with its default-off behaviour.
- [ ] No behaviour change beyond logging.

## 4. Functional Requirements

- FR-1: `validateContentTree(documents)` is pure — no disk, no network, no shared state —
  and is the **single definition** of content validity for both the git lane and the
  draft plane.
- FR-2: Single-draft approve validates base + approved overrides + the candidate draft;
  batch approve validates base + approved overrides + **all** batch drafts, once.
- FR-3: Validation errors block approval with 422 and a complete error list (not
  first-error-only — the agent fixing the draft needs the full account, matching
  validate-content.mjs's collect-everything behaviour).
- FR-4: There is no parameter, header, role, or env var that approves past a validation
  error.
- FR-5: Webhooks are emitted only after COMMIT, signed HMAC-SHA256, retried ×3, and can
  never affect the approval's outcome or latency beyond fire-and-forget dispatch.
- FR-6: CI dispatch accepts only allowlisted workflow names and fails closed without its
  token.
- FR-7: Every new env var is default-off with one boot log line stating its state.

## 5. Non-Goals

- **R5** (podcasts read-modify-write concurrency), **R6** (NotebookLM prompt payload
  home), **R7** (draft diff review UI) — deferred until load-bearing.
- No platform-repo work: agents, blueprints, playbooks, watches subscribing to the
  webhook, blog-widget `ak_pub_*` auth — all tracked in CONTENT-FACTORY.md, none here.
- No validation of **media bytes** (plane 2) — binds remain CI/human territory.
- No draft plane for `wire` content (the Wire is platform-managed since #115).
- No "publish anyway" override — permanently out of scope, not deferred.

## 6. Technical Considerations

- **The extraction is the risk.** US-001 must produce byte-identical error strings on the
  real tree before anything builds on it — diff `npm run validate` output pre/post as the
  proof, since `content-publish.yml` gates deploys on that exact output.
- The effective tree already exists in memory: the served index + overrides cache
  (`server/content/overlay.js` composes it per request). The approve path reuses that
  composition, overlaying candidates — no second tree-builder.
- Validators that already import cleanly (`collectEpisodeErrors`, `validateCards`,
  `cardsFromDomain`) stay where they are; the library orchestrates, it does not absorb.
- Webhook emission extends the existing `notify()` seam in `registerContentRoutes` —
  the cache refresh and the webhook are the same "something was approved" moment.
- Repo rules apply: `"type": "module"`, zero-framework tests in the explicit `npm test`
  chain, CI is the only gate, migrations-on-boot untouched (no schema change needed).

## 7. Success Metrics

- Every US-001 fixture defect is **impossible to approve** (422, test-proven).
- `npm run validate` output unchanged on the current tree (CI diff clean).
- A stubbed three-draft new-course batch approves atomically; removing one draft turns
  the whole batch into a named 422.
- Approve latency with webhook enabled ≤ approve latency today + one async dispatch
  (no measurable blocking).

## 8. Decision Register

| # | Decision | Resolution |
|---|---|---|
| D-FG1 | Webhook transport | **HMAC-SHA256 + 3 retries, no queue.** A queue is scheduler-shaped infrastructure the viewer must not grow; the platform side owns durable delivery (watches can poll `/drafts` as backstop). |
| D-FG2 | R4 shape: Composio GitHub token vs Academy proxy | **Academy proxy.** Keeps every agent capability behind the one machine key, no GitHub credential in the workspace, allowlist enforced server-side. Composio remains open as a later alternative. |
| D-FG3 | Submit-time validation blocking? | **Advisory only.** The gate lives at approve; blocking at submit would stop agents storing work-in-progress for human eyes. |
| D-FG4 | Batch failure granularity | **Whole batch.** Partial approval of a new course is exactly the manifest-pointing-at-nothing state R2 exists to prevent. |

Proceeding on these four as stated — flag any you want reversed and the affected story
re-cuts cleanly.

## 9. Open Questions

- Webhook receiver: which platform surface subscribes — a watch on a generic inbound
  endpoint, or a dedicated trigger type? (Platform-side; does not block this build.)
- Should `sync-tutor-corpus` auto-dispatch on approval of a `domain`/`track` scope
  (R3 consumer #1), or stay manual until the factory settles? Default: manual.
