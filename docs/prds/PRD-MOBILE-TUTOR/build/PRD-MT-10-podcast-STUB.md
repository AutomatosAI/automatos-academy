# PRD-MT-10 — Podcast + recall bridge (SC4) — Stage-2 STUB

**Status:** STUB — full PRD written at Stage-2 scoping, pending **O2** (Gerard: full Podcast in pilot vs v2; recommendation v2 + one-episode prototype during the pilot as a side track, not MVP critical path — 07 §2).
**Repo:** app · **Wave:** 3

## What is already locked

- Surface shape (05 SC4): episode list → stream/downloaded → player (chapters, synced transcript, background/screen-off audio) → **recall bridge: 2–3 Feed-shaped cards after the episode, offline-capable**, wrong → tutor.
- Audio grounding label (F7): transcript-verified + synthesis spot-check label rendered distinctly; provenance links from chapters.
- Media never prefetched by F16 policy — explicit download or stream only.
- F12 line: the audio *player capability* is app code (App-Store release); episodes are content.

## Inputs the scoping pass must resolve

- O2 decision + whether the pilot side-prototype (one D-level episode + recall bridge) taught anything that changes the surface.
- Hosting/CDN for episodes (academy already has an S3/CloudFront media lane — `deploy-media.yml`), download size policy, cellular behavior.
- Recall-bridge card sourcing: generated per-episode by the factory (Stage-3 dependency) vs hand-authored for early episodes.
