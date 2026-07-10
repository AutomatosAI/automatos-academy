// Spine assembly (PRD-MT-02) — Postgres user-state + Clerk auth + sync +
// GDPR surface, mounted as /api/sync/* and /api/me/*.
//
// Only ever imported when SPINE_ENABLED=true (server.js dynamic-imports it),
// so the default academy boot stays byte-identical to today: no pg, no Clerk
// SDK, no DATABASE_URL needed. When enabled, missing config fails the boot
// loudly — a half-configured Spine must never limp into serving.
//
// Every dependency with an outside edge is injectable for tests:
//   pool             — pg Pool          (default: from DATABASE_URL)
//   verifier         — token → claims   (default: Clerk via CLERK_SECRET_KEY)
//   clerkUserDeleter — clerkUserId → ∅  (default: Clerk client; null = unavailable)
//   rateLimit        — {max, windowMs}  (default: 60/min per user)
import { createPool } from "./db.js";
import { createAuthMiddleware, createClerkVerifier, createClerkUserDeleter } from "./auth.js";
import { createUserRateLimiter } from "./rate-limit.js";
import { createSyncRouter } from "./sync-routes.js";
import { createMeRouter } from "./me-routes.js";
import { errorHandler } from "./http.js";

export function mountSpine(app, opts = {}) {
  const { contentIndex } = opts;
  if (!contentIndex) throw new Error("[spine] mountSpine requires the contentIndex (path membership + blueprint weights)");

  const pool = opts.pool || createPool(process.env.DATABASE_URL);
  const verifier = opts.verifier || createClerkVerifier(process.env.CLERK_SECRET_KEY);
  const clerkUserDeleter = opts.clerkUserDeleter !== undefined
    ? opts.clerkUserDeleter
    : (process.env.CLERK_SECRET_KEY ? createClerkUserDeleter(process.env.CLERK_SECRET_KEY) : null);

  const auth = createAuthMiddleware({ verifier, pool });
  const limiter = createUserRateLimiter(opts.rateLimit);

  app.use("/api/sync", auth, createSyncRouter({ pool, index: contentIndex, limiter }), errorHandler);
  app.use("/api/me", auth, createMeRouter({ pool, index: contentIndex, clerkUserDeleter }), errorHandler);

  return { pool };
}
