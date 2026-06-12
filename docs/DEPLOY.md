# Deploy — academy.automatos.app

The app is a **static SPA with hash routing** plus a thin Express server. Hash routing means every route lives under `/#/…`, so the only real server paths are `/` and static assets — **it deploys anywhere**, with or without the server.

## Option A — Static host (simplest)

Serve the `public/` directory as the site root on any static host (Cloudflare Pages, Netlify, Vercel static, GitHub Pages, S3+CloudFront).

- Build command: *none*
- Output / publish directory: `public`
- No SPA rewrite rules needed (hash routing). A catch-all → `/index.html` is harmless if the host adds one.

## Option B — Express server (matches the Automatos landing/Railway pattern)

Run the included `server.js` (Node ≥ 20). It serves `public/`, adds cache headers, reserves `/api/*` for the future backend, and has an SPA fallback.

```bash
npm install
npm start            # PORT env (default 4321)
```

- **Railway:** new service from this repo → it runs `npm start` → set no special config. The `Dockerfile` is provided if you prefer container builds.
- Health check: `GET /healthz` → `{ ok: true }`.

Pick Option B when you'll add accounts / progress-sync / a content CMS (the `/api` namespace is already reserved). Otherwise Option A is less to operate.

## DNS — point the subdomain

Wherever automatos.app's DNS lives (Cloudflare / registrar):

| Type | Name | Value |
|---|---|---|
| CNAME | `academy` | the target your host gives you (e.g. `cname.vercel-dns.com`, `<proj>.pages.dev`, or the Railway domain) |

Then add `academy.automatos.app` as a custom domain in the host's dashboard so it issues the TLS cert. Propagation is usually minutes. (Want `learning.automatos.app` too? Add a second CNAME + custom domain aliasing the same deploy.)

## Verify after deploy

1. `https://academy.automatos.app/` loads the catalog.
2. Start the flagship track → curriculum shows 5 weighted domains.
3. Open a D1 lesson, answer the knowledge check (feedback appears).
4. Run a mock exam → timer counts down, score is /1000, review shows explanations.
5. Readiness shows a grade seal and the "A+ to qualify" verdict.
6. Toggle Bone/Pitch — theme persists (shared `automatos-mood` key with the main site).

## Notes

- **Local-first:** progress is in the visitor's `localStorage`. Clearing site data resets it. A synced backend is a Phase-2 addition behind the reserved `/api`.
- **CORS:** none needed — content JSON is same-origin under `/content`.
