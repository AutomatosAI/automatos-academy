# Platform Program — PRD Status Tracker

The living board for the platform build (the unified content/data plane, admin console,
content lifecycle, voice). Updated as each PRD lands. See
[`docs/architecture/PLATFORM-ARCHITECTURE.md`](../architecture/PLATFORM-ARCHITECTURE.md) for the design.

_Last updated: 2026-07-23._

## Program PRDs

| PRD | Purpose | Status | PR |
|---|---|---|---|
| [Video-page fixes](./PRD-MEDIA-DOMAIN-SLOTS.md) (Part 1a) | module-00 → Start here; hide unproduced slots from visitors | ✅ **shipped** | #58 |
| Architecture + PRD set | design/flow diagrams + the 5 PRDs | ✅ **shipped** | #59 |
| [**PRD-ADMIN-CONSOLE**](./PRD-ADMIN-CONSOLE.md) | users · payments (Stripe) · progress · content | ✅ **BUILT** (S1–S4,S6; S5 text deferred) | #60 |
| [PRD-MEDIA-DOMAIN-SLOTS](./PRD-MEDIA-DOMAIN-SLOTS.md) (Part 1b) | media plane + overlay for **domain** video/audio slots | 🔜 **next** | — |
| [PRD-PLATFORM-ACTIVATION](./PRD-PLATFORM-ACTIVATION.md) | deploy Spine+Postgres+Clerk; flip content→DB | 🟡 owner env work | — |
| [PRD-VOICE-PIPELINE](./PRD-VOICE-PIPELINE.md) | JSON→MP3 (Kokoro→ElevenLabs); app consumer already merged | ⏳ needs engine pick + pod URL | — |
| [PRD-CONTENT-LIFECYCLE](./PRD-CONTENT-LIFECYCLE.md) | text write-back API + daily Automatos mission + cert-watch | 📋 design | — |
| [PRD-PLATFORM-DOCUMENTS-FIXES](./PRD-PLATFORM-DOCUMENTS-FIXES.md) | automatos-ai / D-CO6: 🔴 tags-drop, by-hash, scoped keys, KG rebuild | 📋 design (platform repo) | — |

Legend: ✅ built · 🔜 next up · 🟡 owner action · ⏳ blocked on a decision · 📋 designed, not built.

## Recommended order

1. **PRD-MEDIA-DOMAIN-SLOTS** (Part 1b) — makes the admin Upload button work on real lessons, not just overviews.
2. **PRD-PLATFORM-ACTIVATION** (owner env) — lights up the Spine → the admin console + cross-device sync go live.
3. **PRD-VOICE-PIPELINE** — biggest learner-quality jump; needs the engine pick.
4. **PRD-CONTENT-LIFECYCLE** + **PRD-PLATFORM-DOCUMENTS-FIXES** — the daily generate/review/verify loop + the tutor-KG fixes.

## Owner switches (unlock the dormant plane)

| Switch | Unlocks |
|---|---|
| `DATABASE_URL` (Railway Postgres) | content-DB + the Spine tables |
| `SPINE_ENABLED=true` + prod Clerk (`CLERK_SECRET_KEY`, `ACADEMY_AUTHORIZED_PARTIES`) | cross-device progress sync · media admin plane · **the admin console** |
| `ACADEMY_ADMIN_CLERK_IDS=<your clerk id>` | bootstraps you as the first **owner** |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_DEFAULT_PRICE_ID` | academy billing (checkout/portal/webhook → `users.plan`) |
| `CONTENT_SOURCE=db` (after the 7-day dual-run) | content ships without a redeploy |

## Content still owed (NotebookLM)
AIGP + CH-500 (legacy-source call) · AIX m01 gap regen · the deep-dive `…-2` set across tracks.

## Recently shipped (this program)
- **2026-07-23:** 66 videos live on the CDN (5 tracks uploaded + published); video-page fixes (#58); architecture + 5 PRDs (#59); **admin console S1–S6 (#60)**.
