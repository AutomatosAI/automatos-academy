// Admin console composition root (PRD-ADMIN-CONSOLE). Mounted from server.js
// inside the SPINE_ENABLED block, sharing the Spine's pg pool + auth + role
// gate. Fail-closed: /api/admin/* requires an admin role; /api/billing is
// learner-authed (checkout/portal) or Stripe-signed (webhook) and 503s until
// STRIPE_* is configured.

import { createUsersRouter } from "./users.js";
import { createAuditor } from "./audit.js";
import { mountBilling } from "./billing.js";
import { errorHandler } from "../spine/http.js";

export function mountAdminConsole(app, { pool, index, auth, requireRole, clerkUserDeleter, env = process.env } = {}) {
  const audit = createAuditor(pool);

  // Users + progress admin — admin role minimum (role CHANGES are owner-gated
  // inside the router).
  app.use(
    "/api/admin/users",
    auth,
    requireRole("admin"),
    createUsersRouter({ pool, index, audit, clerkUserDeleter }),
    errorHandler,
  );

  // Payments (Stripe) — checkout/portal (learner) + webhook (signed).
  const billing = mountBilling(app, { pool, auth, env });

  return { billing };
}
