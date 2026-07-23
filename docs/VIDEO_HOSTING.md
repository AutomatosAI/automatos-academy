# Video hosting — S3 + CloudFront (the widget-CDN pattern)

Videos live on the widget CDN bucket under `/academy/…`, served from
`https://widgets.automatos.app/academy/…`. The git repo carries **no media** —
the player keys off the URL, so hosting is pure data
([PRD-GROWTH](./prds/PRD-GROWTH.md) scale note; ~70+ videos ≈ 2GB+ would break
git pushes and bloat every Railway deploy).

## One-time setup (owner, ~2 min)

Copy the **same five secrets** from `automatos-widget-sdk` → `automatos-academy`
(Settings → Secrets → Actions, or promote them to org-level):

```
AWS_SDK_DEPLOY_ACCESS_KEY_ID
AWS_SDK_DEPLOY_SECRET_ACCESS_KEY
AWS_SDK_DEPLOY_REGION
AWS_SDK_DEPLOY_BUCKET
AWS_SDK_DEPLOY_DISTRIBUTION_ID
```

GitHub never exposes secret values, so this is the one step tooling can't do.

## One-time migration (the 25 legacy MP4s, ~700MB out of git)

1. Merge the open track PRs so `main` is current.
2. **Actions → "Deploy academy media to CDN" → Run workflow** on `main`, mode
   **migrate** (tick dry-run first if you want a preview). This syncs
   `public/content/<vendor>/videos/` → `s3://$BUCKET/academy/<vendor>/videos/`.
3. Spot-check one URL, e.g.
   `https://widgets.automatos.app/academy/anthropic/videos/d1.mp4`.
4. Swap the registered URLs and drop the binaries (Claude does this as a PR):
   ```bash
   node scripts/register-videos.mjs --swap-cdn
   git rm -r public/content/anthropic/videos public/content/github-copilot/videos
   npm run validate && npm test
   ```
   History keeps the old blobs (we don't rewrite shared history); the repo just
   stops growing.

## Ongoing flow (new videos from the NotebookLM/Haiku pipeline)

**Name every file after its video-slot id** — `v-d1-2.mp4`, `v-ov-1.mp4`,
`v-m3-1.mp4` — that's what makes registration automatic. Slot ids live in each
track/domain JSON's `videos[]` (status `placeholder`).

**Route A0 — one dispatch, bind the whole batch (recommended, C3 DB path).**
Binds into `media_bindings`; the serve-time overlay renders the slot published
with **no redeploy and no committed JSON** — the bulk equivalent of the browser
Upload button. Needs the `ACADEMY_ADMIN_KEY` repo secret (same value as the
server's env) and the server's AWS creds set (so it can verify each object).
1. Branch, drop files under `media-staging/<vendor>/<track>/` (named by slot id), push.
2. **Actions → Deploy academy media → Run workflow** on that branch, mode
   **staging**, **bind = true** (tick **dry_run** first to preview the plan).
   → syncs to S3, then POSTs each `<slotId>.mp4` to `/api/admin/media/bind`.
3. Delete the branch (media never reaches `main`). Nothing else to commit.

Idempotent — re-running upserts. A file whose slot id isn't in the track JSON is
reported (`unknown_slot`), never guessed. Or run it yourself against any dir:
`ACADEMY_ADMIN_KEY=… npm run bulk-bind -- --dir ./out` (`--dry-run` to preview).

Route A — no local AWS credentials, **legacy git-JSON path** (writes urls into
the track JSON instead of `media_bindings` — use A0 unless you specifically want
the url baked into git):
1. Branch, drop files under `media-staging/<vendor>/<track>/`, push the branch.
2. **Actions → Deploy academy media → Run workflow** on that branch, mode
   **staging** → syncs to `s3://$BUCKET/academy/<vendor>/<track>/`.
3. Delete the branch (media never reaches `main`).
4. Register:
   ```bash
   node scripts/register-videos.mjs --publish <dir> --vendor <v> --track <t>
   ```
   → flips matching placeholders to `published` with the CDN URL; unmatched
   files are listed, never guessed. Commit the JSON changes.

Route B — with `aws login` done locally:
```bash
aws s3 sync ./out "s3://$BUCKET/academy/<vendor>/<track>/" \
  --exclude "*" --include "*.mp4" --cache-control "public, max-age=2592000"
node scripts/register-videos.mjs --publish ./out --vendor <v> --track <t>
```

## Notes

- Cache: 30 days + a `/academy/*` CloudFront invalidation on every workflow run;
  re-uploading a changed file under the same name is fine.
- Captions: drop `.vtt` files alongside (the sync includes them) — transcript
  work is on the improvement list.
- If a dedicated `media.automatos.app` domain lands later, it's a one-flag
  re-run: `node scripts/register-videos.mjs --swap-cdn --base https://media.automatos.app`
  (plus re-pointing the publish `--base`).
