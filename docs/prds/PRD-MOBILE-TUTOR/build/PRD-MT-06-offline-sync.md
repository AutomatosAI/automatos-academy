# PRD-MT-06 — Offline cache + delta sync + conflict resolution

**Status:** ready after W0 · **Repo:** app · **Wave:** 1
**Depends on:** MT-01 (delta endpoint), MT-02 (sync API), MT-03 (storage adapters, content client).
**Source design:** [../02-architecture.md](../02-architecture.md) §5 (local-first + gap #8), F16 prefetch policy.

## 1. Why

P1 studies at the gym and on the tube. The Feed must be fully usable offline (02 §5: Feed + cards offline; progress syncs later), which means a disciplined content cache, an outbound event queue, and the locked conflict rules — later-answer-timestamp wins, **rollups never merged client-side**.

## 2. User stories

### US-061: Content cache
- [ ] `src/cache/content.ts` over MT-03's blob adapter: stores domain files + track/paths/levels JSON keyed by `(vendorId, trackId, domainId, contentVersion)`; the F16 policy (per-track full domain set, weight-prioritized, ~25MB/track cap, text-only) implemented here, invoked by MT-04's prefetch and by refresh.
- [ ] Refresh loop: on app foreground + daily background fetch — `GET /catalog/version`; changed → `changes?since=` → refetch only listed in-scope scopes; `410` → full refetch of in-scope tracks (contract §5).
- [ ] Cache eviction: tracks removed from scope are deleted; version-superseded files pruned after successful refresh; cap enforcement drops lightest-weight domains first (inverse of prefetch priority), never the current session's domains.
- [ ] Cache state inspectable via a dev screen (per-track version, size, last refresh) — support/debug lifeline.

### US-062: Outbound event queue
- [ ] `src/sync/queue.ts`: append-only durable queue (MMKV) of answer/telemetry/mock/scenario events from `recordOutcome()` (MT-05) with device-clock `answeredAt`; survives kill/restart.
- [ ] Flush on connectivity + foreground + post-session; batched to MT-02's endpoints; idempotency keys per event (uuid) so retries never double-apply.
- [ ] Backpressure: queue >5k events or >7 days old triggers a visible "sync needed" nudge (not silent data risk).

### US-063: Reconcile pull
- [ ] After successful flush: `GET /api/me/state?since={lastSync}` → apply server-reconciled item states + **server-derived** `mastery_map` to local mirrors — local rollups are provisional display-only between syncs and are overwritten without ceremony (02 §5).
- [ ] Multi-device conflict honored by construction: device pushes raw events; later `answeredAt` wins server-side; pull applies the winner locally. Test: two simulated devices, interleaved offline answers on the same item, both converge to the later answer's SM-2 state.

### US-064: Sync status surface
- [ ] One small, honest status affordance (Settings row + subtle Feed badge when offline): last synced, queued count, tap-to-flush; errors say what failed and that data is safe locally.

## 3. Functional requirements

- FR-1: All queue/cache writes immutable-update style over the kv adapter; no direct MMKV imports outside `src/storage`.
- FR-2: Clock sanity: events stamped with device time + a monotonic sequence; server rejects >48h-future stamps (MT-02 FR-2) — client surfaces that rejection rather than retry-looping.
- FR-3: No sync on cellular toggle **not** offered in pilot (content is text ~MBs; keep surface small) — noted as a post-pilot Settings candidate.
- FR-4: Unit tests run the queue/cache against the in-memory adapters; one integration test suite runs against a local Spine in CI (service container from MT-02's harness).

## 4. Non-goals

No CRDTs/merging competence client-side (explicitly forbidden), no full-catalog hoarding (in-scope tracks only), no media prefetch, no background *upload* beyond flush-on-events (battery).

## 5. Success / exit

Airplane-mode session → land → auto-flush → readiness reflects it; the two-device convergence test passes; cache respects the 25MB cap on the heaviest track (ai-explained, 13 domains) while keeping session-critical domains resident.
