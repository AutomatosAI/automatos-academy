// Content write-back plane composition root (PRD-CONTENT-LIFECYCLE). Mounted
// from server.js after the Spine, beside the media plane, sharing its pg pool +
// Clerk verifier and the SAME two-principal gate (machine X-Admin-Key / browser
// Clerk allowlist — server/media/admin.js). Fail-closed: without ACADEMY_ADMIN_KEY
// and without an ACADEMY_ADMIN_CLERK_IDS allowlist every route answers 403, so
// mounting is harmless when unconfigured.
//
// Owns the approved-draft overrides cache; server.js reads it through a getter
// wired into createCatalogRouter (exactly like media bindings), so an approval
// serves live within one refresh (immediate via onChange).

import { createRequireAdmin, parseAllowlist } from "../media/admin.js";
import { registerContentRoutes } from "./routes.js";
import { createOverridesCache } from "./overrides-cache.js";

export function mountContentAdmin(app, { pool, verifier, env = process.env } = {}) {
  const requireAdmin = createRequireAdmin({
    adminKey: env.ACADEMY_ADMIN_KEY,
    allowlist: parseAllowlist(env.ACADEMY_ADMIN_CLERK_IDS),
    verifier,
  });
  const overridesCache = createOverridesCache({ pool }).start();
  registerContentRoutes(app, {
    pool,
    requireAdmin,
    onChange: () => overridesCache.refresh(), // approve/reject → overlay live at once
  });
  return {
    overridesCache,
    configured: Boolean(env.ACADEMY_ADMIN_KEY || env.ACADEMY_ADMIN_CLERK_IDS),
  };
}
