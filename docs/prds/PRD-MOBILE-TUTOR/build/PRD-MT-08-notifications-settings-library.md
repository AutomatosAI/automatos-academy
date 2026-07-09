# PRD-MT-08 — Notifications + widget (SC8), Settings (SC7), Library (SC6), deletion UI

**Status:** ready after W1 · **Repo:** app · **Wave:** 2
**Depends on:** MT-04 (account), MT-05 (deep links), MT-06 (sync/queue), MT-02 (deletion/export endpoints).
**Source design:** [../05-ux-flows.md](../05-ux-flows.md) SC6/SC7/SC8, [../02-architecture.md](../02-architecture.md) §4, [../06-risks-compliance.md](../06-risks-compliance.md) §5.

## 1. Why

The nudge is the third of the "genuinely new 30%" (00-INDEX): answerable notifications + a lock-screen widget make the habit ambient. Settings is where frequency stays humane (notification fatigue is the #1 register risk) and where the second Stage-1 **compliance gate (F8 account deletion, both paths)** gets its UI. Library is the low-cost reference satellite.

## 2. User stories

### US-081: Answerable notifications
- [ ] Daily nudge via `expo-notifications`: a real due/weak-spot question with **answer-action buttons on the notification itself** (iOS notification category actions / Android action buttons); tap-answer records through the same `recordOutcome()` path (offline-safe via MT-06 queue); body never leaks answers.
- [ ] Fallback content when no question is servable: streak/readiness nudge deep-linking to Feed (`coach://feed`).
- [ ] Permission asked **in context** (after first completed session, with a "get one question a day" pitch), not at first launch; denial respected — a Settings row explains how to enable later, no re-nagging.
- [ ] Scheduling local-first (works without push infra): local scheduled notifications from the selector's due-forecast; server push deferred until factory-era freshness needs it (noted as post-pilot).
- [ ] Frequency/quiet-hours from SC7 settings enforced exactly; default 1/day.

### US-082: Lock-screen widget (U1)
- [ ] iOS WidgetKit extension (EAS dev-build + config plugin): lock-screen + home-screen sizes showing streak, due count, readiness headline; taps deep-link to Feed. **Native-code risk: spike first** — timebox a walking skeleton before committing layout polish.
- [ ] Widget data via shared app-group storage refreshed on session end/sync; stale-data grace copy ("as of {time}").
- [ ] Android: home-screen widget only if the RN widget path is cheap after the iOS spike; otherwise explicitly deferred post-pilot (Android lock-screen widgets aren't a platform primitive) — decision recorded in the PR, not silently dropped.

### US-083: Settings (SC7)
- [ ] Rows per 05 SC7: nudge frequency + quiet hours · exam date per in-scope track (drives selector urgency + the F10 "did you pass?" prompt) · lean-in/lean-back override (F14) · **Manage my tracks** (→ SC1b additive chooser, MT-04) · sync status (MT-06 US-064) · theme (bone/pitch/system).
- [ ] Trust block: disclaimer re-read, privacy summary, **report an issue** (06 §4 moderation story: mailto/form capturing app version + content item id — the content-flag loop), OSS licenses.

### US-084: Account + data rights UI (F8 — Stage-1 compliance gate)
- [ ] **Export my data** → `GET /api/me/export` → share-sheet a JSON file.
- [ ] **Delete my Coach data** → confirm ("removes your progress in this app; your sign-in remains") → `DELETE /api/me/data` → local wipe (kv + cache + queue) → back to scoped-empty state.
- [ ] **Delete my account** — separate row, separate screen, consequence named per 02 §4 ("removes your sign-in across Academy surfaces"), typed/explicit confirmation → `DELETE /api/me/account` → local wipe → signed-out first-run state.
- [ ] Both paths tested end-to-end in CI against the MT-02 harness; screenshots in PR (compliance-gate evidence for the 07 §5 Stage-1 exit).

### US-085: Library / cheat-sheets (SC6)
- [ ] Per-track library: cheat-sheets and reference cards from cached content (offline-once-cached per 05); markdown render with provenance links; searchable within scope (simple local filter, not a search engine).
- [ ] Wrong-answer "related reference" links from Feed cards land here (05 SC6 cross-link).

## 3. Functional requirements

- FR-1: All notification copy through the compliance register; no shame mechanics ("you're losing your streak!" is out — 06 risk register).
- FR-2: Notification taps/answers produce the same telemetry shape as in-app answers, tagged `source: notification|widget|app` (nudge tap-through is a 01 §9 metric).
- FR-3: Quiet hours respected even across timezone changes (schedule in local wall-clock).
- FR-4: Deletion flows work with a dead network for the local-wipe half: server confirm first, then wipe; no state where server rows are gone but the app pretends they exist.

## 4. Non-goals

No marketing/re-engagement push campaigns, no email, no server-side push infrastructure in pilot, no Android lock-screen claims, no data-sale-adjacent telemetry sharing (06 §5 purpose statement is the boundary).

## 5. Success / exit

A user answers a real question from the lock screen and sees it reflected in readiness; F8 evidenced (both deletion paths, screenshots + tests) — with F15 (MT-04) that completes the Stage-1 compliance-gate pair; nudge frequency provably ≤ settings.
