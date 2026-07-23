// Media admin plane composition root (PRD-WAVE-CONTENT-OPS C3). Mounted from
// server.js after the Spine (shares its pg pool + Clerk verifier). Admin gate
// is fail-closed: without ACADEMY_ADMIN_KEY and without an ACADEMY_ADMIN_CLERK_IDS
// allowlist, every route answers 403 — so mounting is harmless when unconfigured.

import { createRequireAdmin, parseAllowlist } from "./admin.js";
import { registerMediaRoutes } from "./routes.js";
import { mediaS3FromEnv } from "./s3.js";

export function mountMediaAdmin(app, { pool, verifier, getIndex, env = process.env } = {}) {
  const requireAdmin = createRequireAdmin({
    adminKey: env.ACADEMY_ADMIN_KEY,
    allowlist: parseAllowlist(env.ACADEMY_ADMIN_CLERK_IDS),
    verifier,
  });
  const s3 = mediaS3FromEnv(env); // null when creds absent → presign 503
  registerMediaRoutes(app, {
    pool,
    requireAdmin,
    s3,
    cdnBase: env.MEDIA_CDN_BASE,
    getIndex,
  });
  return { configured: Boolean(env.ACADEMY_ADMIN_KEY || env.ACADEMY_ADMIN_CLERK_IDS), s3Ready: Boolean(s3) };
}
