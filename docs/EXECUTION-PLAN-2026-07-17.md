# Execution Plan — Engagement Wave and beyond (2026-07-17)

Everything discussed to date, mapped to who executes it and in what order.
PRD shelf: `docs/prds/PRD-WAVE-ENGAGEMENT.md` (merged) + PRD-UNIFIED (built) +
the two gap PRDs riding this branch (PRD-WEB-LOOP, PRD-DIGEST).

Owners: **Session** = Fable in-session agent builds (PR per slice, CI-gated) ·
**Ralph** = per-PRD overnight kit (prd.json + worktree; human-launched) ·
**Gerard** = dashboard/env/decision work · **Platform pod** = the automatos-ai
repo (separate session; academy only carries the interface contract).

## Wave A — fired 2026-07-17 (Session)

| Item | PRD/slice | State |
|---|---|---|
| Wire ingest + views + RSS | PRD-WIRE S1–S2 | agent running → PR |
| Share cards | PRD-COMMUNITY S1 | agent running → PR |
| Gap PRDs (web loop, digest) | PRD-WEB-LOOP · PRD-DIGEST | agent running → this branch |
| Already landed this wave | TUTOR-LIVE S1–S2 (#30 merged) · MT-12 S1–S3 (app #27) · burger #31 · hero #32 | merge queue |

## Wave B — Ralph overnight kits (after Wave A merges; launch is human-only)

| Kit | Slices | Gate |
|---|---|---|
| ralph/mt12-tail | MT-12: celebrations, notifications policy, weak-area drill entry | freezes slice ONLY if D-122 signed |
| ralph/voice-core | PRD-VOICE S1–S2 (read-aloud + audio quick-fire) | none |
| ralph/wire-tail | PRD-WIRE S3–S5 (shells/teaser, contract doc+seed, corrections) | Wave A Wire merged |
| ralph/web-loop | PRD-WEB-LOOP (web Today, earned-value ask, pathfinder-personalized home, session end-states) | gap PRD merged |
| ralph/tutor-context | PRD-TUTOR-LIVE S3 (consented learner context) | D-T1 confirmed (rec: ask-once) |

## Wave C — gated on Gerard (any order, ~1h total)

1. **Platform pod:** widgets CORS preflight fix — repro in PRD-TUTOR-LIVE S0
   (`OPTIONS /api/widgets/chat` → 403, no ACAO). Revives the tutor end-to-end.
2. **Tutor corpus:** `npm run tutor-corpus` regen + workspace upload per
   `docs/KNOWLEDGE_INGEST.md` §5 (multi-track prompt already merged).
3. **Content seed:** GitHub repo secret `DATABASE_URL` (public URL) → run
   content-publish → 7-day dual-run → `CONTENT_SOURCE=db`.
4. **Mobile envs:** `EXPO_PUBLIC_SPINE_API=https://academy.automatos.app` +
   rebuild → two-device linked test.
5. **Prod Clerk instance (D-U1):** domain CNAMEs + real Google/Apple OAuth
   creds; swap pk/sk both surfaces (dev-tenant accounts don't migrate).
6. **Decisions:** D-122 freezes (amends the no-loss-mechanics stance — needs
   explicit signature) · Wire D-W1 publish policy · Voice D-V1 TTS staging ·
   remaining boxes default to their recommendations.
7. **Ops:** `AWS_SDK_DEPLOY_*` secrets → media→CDN (U3 S7, repo 767MB→<80MB) ·
   one Android device pass (tab dock, Funnel weights, Today strip screenshots).

## Wave D — later, deliberately

- PRD-DIGEST build (needs email-provider box from the gap PRD).
- PRD-COMMUNITY S2 percentile (volume floor 50) · S3 Discord (ops + CoC).
- PRD-VOICE S3 commute mode · S5 platform voice service (interface unconfirmed).
- Wire platform-side daily mission (platform pod, contract in PRD-WIRE S4).
- Parked with triggers: leagues, native community, guest mode, Next.js fork.

## Standing invariants

Git-canonical course content · real numbers only · credential honesty on every
share surface · full notification opt-in, one/day · PII-minimal consented
context · CI is the only gate; no local runs on Gerard's machine.
