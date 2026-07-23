# PRD — Media plane: domain-level slots + audio kinds

**Status:** domain VIDEO slots BUILT 2026-07-23 (overlay + slot-lookup + domain endpoint); audio-kind overlay + podcast `.m4a`→CDN are the remaining follow-up. **Why:** the admin Upload button + serve-overlay recognised **only track-level `videos[]`** (the `v-ov-*` overview slots). Domain videos (`v-m00-1`, every `-2`) rendered an Upload button but **presign 404'd (`unknown_slot`)** — so the button couldn't map the videos that make up ~90% of the content. Now fixed for video.

## Root cause (file:line)
- `server/media/routes.js:36-38` `videoSlotExists` checks only `t.track.data.videos`.
- `server/media/overlay.js:10` `overlayTrackVideos` maps only `trackData.videos`; applied **only** on the track endpoint (`server/catalog.js:415`). The domain endpoint serves `d.data` verbatim — no overlay.

## Changes
1. **Slot lookup:** extend `videoSlotExists` (and the presign/bind guards) to also match a `slotId` in any **domain**'s `videos[]`. A small index `{slotId → {scope:'track'|'domain', domainId}}` built from the content index.
2. **Overlay:** add `overlayDomainVideos(domainData, bySlot)` (same immutable shape as `overlayTrackVideos`), and apply it on the **domain endpoint** in `catalog.js` so a bound domain slot renders `published` at serve time. Fold the domain-slot version into the ETag like the track overlay.
3. **Audio/transcript kinds:** `media_bindings` already reserves `kind:'audio'|'transcript'` (migration `1784620000000`). Wire the overlay + slot-lookup for audio slots too (podcast audio + TTS land here — see PRD-VOICE-PIPELINE / PRD-CONTENT-LIFECYCLE). This is the single media abstraction the architecture doc targets.
4. **Podcast `.m4a` off git:** `.gitignore` currently only blocks `.mp4/.mp3`; add `.m4a`. Move the 2 committed episodes to the CDN (`academy/<vendor>/podcasts/`) as `kind:'audio'` bindings; `server/podcasts.js` resolves url via the overlay.

## Video-page fixes (Part 1a — shipped in PR #58, referenced here for completeness)
- Module-00 videos lifted into "Start here"; unproduced `-2` slots hidden from visitors, shown to admins (`content.js` `trackVideoSections`).

## Verification
- Signed-in admin uploads an MP4 to a **domain** slot (`v-m00-1`) → presign 200, bind 200, overlay serves it `published` on the domain endpoint (no git commit).
- A bound audio slot serves its CDN url. Podcast episodes serve from the CDN, none in git.
- 66 already-live videos unaffected (git-JSON urls still valid; overlay only augments).
