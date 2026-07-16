# PRD Wave — Engagement & the Agentic Academy (2026-07-16)

**Status:** DRAFT — five PRDs, decision boxes await Gerard
**Evidence base:** `docs/research/competitor-scan-2026-07-16.md` (verdict: content stack competitive; the daily-return stack is the gap) + the 2026-07-16 flow discussion.

The unified-accounts wave (U1–U3) made web + mobile one product with one learner record.
This wave makes people **come back** — and makes the Academy the first public showcase of
Automatos agents doing real editorial work.

## The five PRDs

| PRD | One line | Ships value when |
|---|---|---|
| [PRD-TUTOR-LIVE](./PRD-TUTOR-LIVE.md) | Resurrect the tutor (platform CORS preflight = S0, repro included), refresh its 11-track knowledge, then make it progress-aware (consented learner context) | S0+S1 land — existing feature returns |
| [PRD-MOBILE-TUTOR/build/PRD-MT-12-daily-loop](./PRD-MOBILE-TUTOR/build/PRD-MT-12-daily-loop.md) | The bossy tutor: Today mission, exam pacing, streak freezes + milestones, at-risk nudges, weak-area drills, iOS widget, celebrations | Each slice independently |
| [PRD-WIRE](./PRD-WIRE.md) | Agent-written daily news surface (`#/wire`) — platform mission → verified-sources ingest API; course content stays git-canonical (refreshes go as PRs via OPS-FRESHNESS) | S1+S2 — first verified posts |
| [PRD-COMMUNITY](./PRD-COMMUNITY.md) | Share cards → percentile lines (volume-floored) → Discord v0 → native community parked with revisit triggers | S1 — wins become shareable |
| [PRD-VOICE](./PRD-VOICE.md) | Hands-free study: lesson read-aloud, audio quick-fire over the shipped voice input, commute mode; staged TTS (on-device → pre-generated → automatos-voice `/v1/audio/speech` when confirmed) | S1+S2 on mobile |

## Recommended build order

1. **TUTOR-LIVE S0–S2** — unblocks a built feature; S0 is a one-middleware platform fix (preflight 403 repro in the PRD).
2. **MT-12 S1–S6** — the daily loop; the research's three highest-leverage items live here.
3. **WIRE S1–S2** — daily fresh reasons to return + the Automatos dogfood story.
4. **COMMUNITY S1** (share cards ride any celebration moment) → S3 Discord when sharing shows pull.
5. **VOICE S1–S2** — after the loop exists, audio extends where it reaches.

## Cross-PRD invariants

- Course content is **git-canonical** (validate → PR → publish pipeline); no runtime path mutates it — the Wire announces, PRs change.
- Real numbers only (the stats cold-start honesty rule extends to percentiles and learner counts).
- Credential honesty rules (PRD-CREDENTIALS) apply verbatim to every share surface.
- Every engagement mechanic respects reduced-motion, quiet hours, and full notification opt-in.
- Progress-aware features use PII-minimal, consented context — ids and numbers, never identity.
