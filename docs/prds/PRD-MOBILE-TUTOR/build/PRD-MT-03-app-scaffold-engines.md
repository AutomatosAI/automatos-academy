# PRD-MT-03 — App scaffold + engine port (app repo)

**Status:** ready to build after D-R1/D-R2 confirm · **Repo:** new — `automatos-academy-app` (D-R2) · **Wave:** 0
**Depends on:** D-R1 (Expo/RN confirm), D-R2 (repo), [CONTENT-API-CONTRACT.md](CONTENT-API-CONTRACT.md) shapes (API need not be live — fixtures suffice).
**Unblocks:** every app PRD (MT-04..08).
**Source design:** [../02-architecture.md](../02-architecture.md) §7 (stack), [../03-mastery-engine.md](../03-mastery-engine.md) (all engine math).

## 1. Why

Everything the app does sits on two foundations: a scaffold (navigation, auth, state, theming, CI) and the mastery engines. The academy's engines are pure and tiny — `store.js` (87 lines, SM-2), `engine/readiness.js` (90), `engine/exam.js` (117), `engine/quiz.js` (41), `engine/scenario.js` (49) — and the genuinely NEW math (4-bucket selector, decay, D7 readiness gate, path rollup) is fully specified in 03. All of it is pure functions: build it TDD, test it exhaustively in CI, before any screen exists.

## 2. Scope

**In:** repo bootstrap · theming from academy tokens · Clerk wiring · storage adapters · content client + fixtures · engine package (ported + new) with ≥80% coverage · CI.
**Out:** every screen beyond a dev-only smoke screen (MT-04/05 own real UI) · sync transport (MT-06) · notifications (MT-08).

## 3. Stack (locked once D-R1 signs)

Expo SDK 53 / RN 0.79 / TypeScript strict / expo-router / `@clerk/expo` + expo-secure-store / React Query (server state) / Zustand (client state) / **MMKV** for KV + `expo-file-system` for content blobs / Reanimated. Seeded from `automatos-mobile`'s proven config (same versions, `@/* → src/*` alias) — **copy patterns, not code with Automatos-platform coupling** (its `api-client.ts` stays behind).

## 4. User stories

### US-031: Repo bootstrap + CI
- [ ] Expo app boots in Expo Go with a placeholder home; TS strict; ESLint + Prettier configured.
- [ ] `.github/workflows/ci.yml`: typecheck + lint + unit tests on every PR — red blocks merge from day one.
- [ ] `app.json`: name/slug per D-R5 placeholder ("Academy Coach"), bundle id reserved but **no store assets yet** (O3 pending).
- [ ] README: build/run via EAS + Expo Go; env via `.env.example` (`EXPO_PUBLIC_CONTENT_API`, Clerk publishable key).

### US-032: Theme = academy brand (D2)
- [ ] `src/theme/` ports `academy.css` tokens: Bone/Pitch palettes, Instrument Serif / Geist / Geist Mono (bundled via `expo-font`), grade-seal ramp (A+…F), spacing/radius constants.
- [ ] Light/dark (bone/pitch) switch wired to system + manual override (matches web's `automatos-mood` semantics).
- [ ] One dev screen renders type scale + palette for visual sign-off (screenshot in PR).

### US-033: Storage adapters
- [ ] `src/storage/kv.ts` — tiny interface (`get/set/delete/keys`) with MMKV impl + in-memory impl for tests; **all engine state goes through it** (ports `store.js`'s two localStorage calls).
- [ ] `src/storage/blobs.ts` — content-file cache dir wrapper over `expo-file-system` (used by MT-06's prefetch; interface + trivial impl now).

### US-034: Content client
- [ ] `src/content/schemas.ts` — zod schemas for every contract shape (manifest, track, domain, question, scenario, lab, paths, levels) — **boundary validation, fail-fast with the offending path**.
- [ ] `src/content/client.ts` — fetch + ETag/`X-Content-Version` handling + `changes?since=` delta call per contract §4/§5 (transport only; cache policy is MT-06).
- [ ] `src/content/selectors.ts` — port `content.js` selectors (`domainById`, `allQuestions`, `scenarioById`, …) as pure functions over validated types.
- [ ] Fixtures: one real track (`cca-f`) + `paths.json`/`levels.json` snapshots checked in under `src/content/__fixtures__/`; client tested against fixtures, no network in CI.

### US-035: Engine port (TDD — tests first, from the academy's real cases)
- [ ] `src/engine/sm2.ts` — port `store.js` SM-2 math + state shape (immutable updates; storage via US-033); parity tests replicating `tests/engine.test.mjs` SM-2 cases (ease clamp [1.5,2.8], interval 0→1→3→round(i·ease), miss→1).
- [ ] `src/engine/competence.ts` — port `readiness.js` `domainStats/overall` (0.35·coverage + 0.65·knowledge, attempts factor) + **NEW** path rollup across member tracks (03 §2).
- [ ] `src/engine/decay.ts` — **NEW** per 03 §2: `effective = floor + (stored−floor)·e^(−λΔt)`, `λ = ln2/halfLife(blueprintWeight)`; stored-raw-decayed-on-read; property tests (monotonic, floor-bounded, weight-ordering).
- [ ] `src/engine/selector.ts` — **NEW** 4-bucket session builder per 03 §3 (due / weak-spot ranked by `(1−effective)·weight` / throttled-new / one stretch), urgency-driven mix, interleave, back-off to maintenance drip; the 10-step loop from 03 §3 reproduced as documented steps with a test per step.
- [ ] `src/engine/readiness-gate.ts` — **NEW** D7: READY ⇔ every in-scope domain ≥ threshold (default 0.85) AND best mock ≥ vendor pass mark (scale-aware — 1000 vs AIGP 100–500); honest verdict object `{ready, headlinePct, weakest:{domainId,pct}, mock:{best,passMark}, readyOnDate?}` incl. READY→NOT-READY soft state (03 §4); tests pin the 03 §5 worked example ("87% ready, weakest D2 (68%) → NOT READY").
- [ ] `src/engine/exam.ts` + `quiz.ts` + `scenario.ts` — port build/score/shuffle/branching state machines (needed by MT-05/07).
- [ ] Coverage ≥80% on `src/engine/**` enforced in CI.

### US-036: Clerk skeleton
- [ ] `@clerk/expo` provider + secure-store token cache + sign-in screen shell (email + Apple + Google buttons rendered; flows finished in MT-04); dev-only "continue without account" flag for local iteration, compiled out of release builds.

## 5. Functional requirements

- FR-1: Engines are pure TS modules — no React/Expo imports (portable to the Spine's `server/engine` if ever needed).
- FR-2: No `console.log` in src; a thin logger util gated by `__DEV__`.
- FR-3: All new-math constants (0.85 floor, decay halfLife curve, bucket mixes, 10-min soft-stop) live in `src/engine/constants.ts` — tunable without hunting.
- FR-4: Session-build P95 <50ms on-device for a 5-domain track (perf test with fixture data; generous bar, guards regressions).

## 6. Non-goals

No screens beyond dev/theme smoke. No sync. No push. No paywall anything (D1). No plan/pace model (F11).

## 7. Success / exit

CI green with engine parity + new-math tests; a reviewer can read `selector.ts` next to 03 §3 line-by-line; MT-04/05 start purely additive.

## 8. Open questions

- MMKV requires a dev build (not Expo Go) — acceptable? (Recommend yes; EAS dev builds are the Stage-1 path anyway. Fallback: AsyncStorage impl of the same interface for Expo Go days.)
