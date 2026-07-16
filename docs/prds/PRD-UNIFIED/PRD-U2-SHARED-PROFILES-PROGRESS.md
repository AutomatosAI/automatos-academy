# PRD-U2 — Shared progress + profiles: web becomes a first-class Spine peer

**Status:** DRAFT · depends on U1 · blocked on D-U4 (profile scope), D-U5 (backfill consent)
**Repos:** `automatos-academy` (web client + small server rollup addition) · `automatos-academy-app`
(profile de-orphan + real data)

## 1. Problem

Progress is per-device. Web keeps everything in localStorage (`store.js`, key
`automatos-academy:v1:{vendor}/{track}`); mobile syncs to the Spine but web never pushes or pulls.
The mobile profile screen renders **demo numbers** and is unreachable (orphan route). "Same
profile and progress on web and mobile" requires: a web sync client honouring the mobile client's
invariants, a one-time backfill of existing local progress, and profile surfaces fed by
server-derived data on both platforms.

## 2. Goals

1. A signed-in learner sees the **same mastery, readiness, mock history and scenario state** on
   web and mobile, within one sync cycle.
2. Signed-out web behaviour is byte-identical to today (localStorage only; backup/restore keeps
   working).
3. A **profile** exists on both surfaces showing only true data (D-U4a): per-track readiness +
   grade, mastery map, mock attempt history, credentials claimed, study streak (server-derived),
   member-since.
4. GDPR self-service on web: export my data, delete my data, delete my account — the Spine
   endpoints exist; web gets the UI.

## 3. Non-goals

- No XP/points/levels economy (D-U4a) — the mobile profile's placeholder XP/level tiles are
  replaced by real widgets, not backed by a new model.
- No real-time sync (no sockets); the cadence is event-driven flush + periodic reconcile.
- No change to conflict semantics — the Spine's later-device-wall-clock-wins stands.
- No leaderboards/social; profiles are private to the account.

## 4. Design

### 4.1 Web sync client (`public/js/sync/`) — a port of the mobile invariants

New modules (ES modules, no build step), mirroring `automatos-academy-app/src/sync/*` semantics:

- **events.js** — wire shapes **field-for-field** from the app's `events.ts`: lowercase uuid-v4
  `eventId`, epoch-ms timestamps, `answeredAt` = device wall-clock, `correct_count` snake_case
  (everything else camelCase). Validation bounds respected client-side (ease 1–4, seen ≥ 1,
  correct_count ≤ seen, ≤ 48 h future skew).
- **queue.js** — durable outbound queue in localStorage (`automatos-academy:v1:sync-queue`),
  idempotent on `eventId`, bounded (oldest-dropped at cap), removed **only after server ack**;
  `400 invalid_event:{i}:{reason}` quarantines exactly that event; transport errors leave the
  queue intact. `clearAll()` is the wipe seam (same rule that bit mobile D-H1: wipe goes through
  the seam on every path).
- **flush.js / reconcile.js / syncer.js** — kind-ordered drain (progress→telemetry→mock→scenario,
  batches ≤ 500) → then `GET /api/me/state?since=<cursor>`; **FLUSH before RECONCILE, always**;
  single-flight; persist `serverTime` as the next cursor. Reconcile **overwrites** local mirrors
  (mastery is never computed client-side, never pushed). 429 → exponential backoff.
- **Write path:** `store.js` gains one hook — `recordAnswer`/`recordExam`/`recordScenario` also
  enqueue the wire event when signed in (single write path, mirroring mobile `outcomes.ts`).
  Signed out ⇒ hook is inert.
- **Triggers:** answer recorded (debounced), `visibilitychange`/`online`, sign-in, and a modest
  interval. Multi-tab: queue writes go through a `storage`-event-aware guard so two tabs don't
  double-flush (single-flight + eventId dedupe makes races harmless server-side regardless).

### 4.2 Backfill — existing local progress joins the account (D-U5)

On first sign-in (per browser), prompt once: *"Bring this device's progress into your account?"*
- Yes → synthesize wire events from the store: each `q{}` item → one progress event
  (`answeredAt` = stored `at`), `exams[]` → mock events, `scenarios{}` → scenario events;
  generated `eventId`s persisted before sending (idempotent retry). The Spine's
  later-wall-clock-wins merge makes replays and cross-device backfills safe by construction.
- No → local stays local; the prompt is re-reachable from the profile ("Sync this device").
- The existing file backup/restore (`progress-io.js`) stays; restoring a backup while signed in
  triggers the same backfill offer for the restored state.

### 4.3 Profile surfaces

- **Web `#/profile`** (new view, periwinkle system): identity header (Clerk name/avatar,
  member-since), per-track readiness ring + grade (existing `readiness.js` math over reconciled
  state), mastery-by-domain bars, mock history, credentials claimed (from the badge flow),
  study streak, and the account actions (export/delete — §4.4). Uses the retheme's motion kit
  (`RingSweep`-equivalent CSS ring sweep + animated bars — the pieces PR #20 built but left unwired).
- **Mobile `app/profile.tsx`**: de-orphan (link from feed header — or the tab bar if that decision
  lands first), replace demo constants with: mastery/readiness from the reconciled mirrors, mock
  history from local+synced state, streak from the server (below), credentials via the existing
  badge deep link.
- **Streak (server-derived, no schema change):** a rollup query over `progress.answered_at` +
  `telemetry.created_at` distinct-UTC-days computes current/best streak on read; exposed as
  `streak{current,best}` on `GET /api/me/state` (additive envelope field). Mobile's local streak
  (`feed:streak.ts`) becomes display-fallback when signed out. Timezone: UTC-day boundaries v1,
  noted in UI copy ("days are UTC").

### 4.4 GDPR on web

Account menu (from U1) wires the existing endpoints: `GET /api/me/export` → JSON download;
`DELETE /api/me/data` (keep account) and `DELETE /api/me/account` (with the
`X-Confirm-Account-Deletion: <clerk_user_id>` header) behind explicit typed-confirmation dialogs
(house UI primitives, not `window.confirm`). Both also clear the local queue **through the seam**
before local wipe (mobile D-H1 lesson) and honour the mobile keep-list philosophy (theme survives).

## 5. User stories

- **US-U10** — Answer questions on the phone over lunch, open the web at a desk: readiness ring
  and due reviews match after one sync cycle.
- **US-U11** — Long-time web learner signs in for the first time; accepts the backfill prompt;
  their months of localStorage history appears on mobile.
- **US-U12** — Two devices answer the same item offline; the later answer wins everywhere once
  both flush (no duplicates, no lost counts — Spine semantics, verified by an integration test).
- **US-U13** — A learner opens Profile on either surface and sees the same numbers, all real.
- **US-U14** — "Export my data" downloads everything; "Delete my data" empties the profile on
  BOTH surfaces after their next reconcile; deep links can't resurrect wiped state.

## 6. Slices

| # | Slice | DoD |
|---|---|---|
| S1 | events/queue/flush (web) + store hook | spine integration test: web-shaped batches accepted; quarantine + ack-removal proven |
| S2 | reconcile + cursor + mirrors feeding `readiness.js` | signed-in readiness renders from reconciled state; signed-out path untouched (existing engine tests stay green) |
| S3 | backfill prompt + synthesizer | idempotent under retry (same eventIds); declining leaves zero server rows |
| S4 | streak rollup on `/api/me/state` | SQL-level test: gap/duplicate-day cases; additive field ignored cleanly by the current mobile client |
| S5 | web `#/profile` + GDPR dialogs | profile renders Mist/Night; export downloads; both deletes leave local+server verifiably empty |
| S6 | mobile profile de-orphan + real data (app repo) | route reachable; no hardcoded stat constants remain in `profile.tsx` |
| S7 | cross-device integration test (two simulated clients vs one Spine) | US-U12 scripted in CI (`spine` job) |

## 7. Risks

- **Wall-clock skew** between devices decides merges (existing Spine rule) — backfill keeps
  original `at` timestamps so history ordering survives; the ≤ 48 h future-skew guard stands.
- **localStorage quota** — queue is bounded with oldest-dropped + a "sync now" nudge when near cap.
- **Multi-tab races** — eventId idempotence + single-flight makes the worst case duplicate-send,
  which the server dedupes; S1's test covers double-flush.
- **Streak semantics** (UTC days) will disagree with mobile's local-midnight streak in edge
  timezones — accepted for v1, copy states it; revisit if it grates.
