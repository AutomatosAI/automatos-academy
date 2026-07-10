# PRD-MT-11 — Claude Design handoff (hi-fi visual pass)

**Status:** ready — D5's scheduled handoff, triggered by Stage-0 exit · **Owner:** Gerard drives Claude Design; code side syncs via `/design-sync`
**Wave:** runs alongside W2/W3 builds (design is never the build's critical path — screens ship functional, then get the visual pass)
**Sources:** [../05-ux-flows.md](../05-ux-flows.md) (flows = the design input, per D4/D5) · [../01-vision-usecases.md](../01-vision-usecases.md) §8 (trust model) · app repo `src/theme/` (ported tokens) · `public/academy.css` (canonical brand)

## 1. Why

Every screen so far ships *functional* — correct flows, honest copy, brand tokens — but not *designed*. D5 locked the tooling: this week's flow diagrams become a *Claude Design* (claude.ai/design) system, and `/design-sync` keeps code ↔ design in lockstep component-by-component during build. This PRD is the brief that makes that session productive instead of a blank canvas, and it is what makes the app **look like a product, not a prototype**.

## 2. Design inputs (paste-ready for Claude Design)

### 2.1 Brand — the Academy identity (D2: companion, not a new brand)
- **Fonts:** Instrument Serif (display/serif-italic voice), Geist (UI), Geist Mono (labels/chips/numbers). Already bundled in the app via `@expo-google-fonts`.
- **Dual mood:** **Bone** (light) / **Pitch** (dark) — same semantics as the web academy's `automatos-mood`. Every screen designs in both from the start.
- **The grade-seal ramp is the brand motif:** A+…F color ramp (`--grade-aplus…--grade-f` in `academy.css`) — readiness rings, domain chips, verdict moments all draw from it. The A+ seal is the aspirational object of the whole product.
- **Accent:** the academy green (`oklch(0.45 0.06 155)` lineage); RN hex equivalents live in `src/theme/` (the port documents the oklch→hex mapping).
- **Voice:** mono-label kickers, serif-italic emphasis, honest footers — mirror the academy site's typographic rhythm, not generic mobile-app chrome.

### 2.2 Design principles (bind the visual language — from 01 §8, 05, 06)
1. **Honesty is the aesthetic.** The readiness verdict never decorates away bad news ("87% ready; weakest domain D2 (68%)"). Dated soft-transitions for decay ("you were ready on {date}"). No fake confetti; rewards are typographic, not slot-machine.
2. **Provenance is a first-class UI element.** Every card/answer carries "verify against official docs ↗" + a grounding label — design them as a signature element (chip + link lockup), not a footnote.
3. **No dark patterns.** Soft-stop at ~10 min is a *designed moment* ("keep going, or bank it?"); streaks never shame; notifications are answerable questions, not FOMO hooks.
4. **Lean-in by default** (F14): active recall density — the Feed is a *session*, not an infinite scroll; the soft-stop card visually closes the loop.
5. **One mastery map, three surfaces:** Feed, Tutor, Podcast must read as one product — shared card anatomy, shared domain-chip system, shared verdict language.

### 2.3 Screen inventory to design (from 05; MVP first)
Priority order for the Claude Design session:
1. **SC2 Feed** — the product. Card anatomy per type (fact / question / micro-lesson / scenario-step / clip / reward), answer states, explain-this expansion, soft-stop card, session summary. *The money screen.*
2. **SC5 Readiness** — headline ring + per-domain rings on the grade ramp, two-part gate (floor + mock), verdict typography, mock result + trajectory sparkline.
3. **SC1/SC1b Onboarding** — disclaimer/age beat (compliance copy as designed moments, not walls of text), Clerk sign-in, path/level/free-select chooser + pathfinder Q&A.
4. **SC7 Settings + SC8 notification/widget surfaces** — answerable notification layout, lock-screen widget (streak + due + readiness at a glance), quiet-hours, the trust block, deletion flows (two clearly-different blast-radius designs).
5. **SC6 Library** — cheat-sheet reading surface.
6. **SC3 Voice Tutor + SC4 Podcast** (Stage-2 skeletons exist) — design can lead the build here: chat-with-citations layout, degrade states, player + chapters + transcript + recall-bridge cards.

### 2.4 What Claude Design should produce
- A **design system** (tokens, type scale, spacing, card anatomy, chip/label/ring components) mapped 1:1 to `src/theme/` + component names in the app repo — that mapping is what `/design-sync` walks during build.
- **Hi-fi comps per screen** above, both moods, plus the empty/offline/degrade states (05's offline posture table — the unhappy paths are half the product).
- A **component checklist** ordered for `/design-sync` sessions (one component at a time, code updated to match, screenshot compared).

## 3. Process (D5 flow, made concrete)

1. Gerard opens Claude Design with this brief + doc 05 + `academy.css` (+ screenshots of the current functional screens once `npm start` runs).
2. Output lands as a design-system doc + comps; a `DESIGN-SYSTEM.md` pointer goes in the app repo.
3. `/design-sync` sessions during W2/W3: pick a component, align code to comp, screenshot-verify, commit — no big-bang reskin.
4. **O3 (name) gates only the lockup/app-icon/store assets** — everything else proceeds under the placeholder.

## 4. Non-goals

No new flows (05 is the flow truth; design polishes, never re-flows without a PRD change). No vendor logos (06 §4 — plain-text marks only). No paywall/plan screens (D1). No lean-back autoplay aesthetic (F14).

## 5. Acceptance

- [ ] Claude Design system exists with the token/component mapping to `src/theme/`
- [ ] SC2 + SC5 hi-fi (both moods, incl. empty/offline states) approved by Gerard
- [ ] First `/design-sync` pass lands on Feed card anatomy without functional regressions (CI green)
- [ ] App icon/lockup parked pending O3 — placeholder art explicitly temporary
