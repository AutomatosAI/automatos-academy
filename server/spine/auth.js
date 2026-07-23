// Clerk auth middleware (PRD-MT-02 US-022). Identity comes from the verified
// token ONLY — no route ever trusts a client-supplied user id. The verifier
// is injectable so tests run a fixture without Clerk keys; production wires
// @clerk/backend's verifyToken (loaded lazily, so the disabled-spine boot
// path never touches the Clerk SDK).
//
// Status split, per the PRD:
//   401 — missing / unverifiable token (authenticate again)
//   403 — token verified but the wrong shape (no `sub`) — re-authing with
//         the same credential won't help
import { fail } from "./http.js";

// First authenticated call creates the users row, minting a fresh
// workspace_id (workspace-per-user tenancy, 02 §3). $2 is the bootstrap role:
// 'owner' when the caller's clerk id is in the ACADEMY_ADMIN_CLERK_IDS allowlist,
// else 'learner'. The DO UPDATE promotes an allow-listed user to owner on any
// sign-in but NEVER demotes (a role set later via the admin console is kept),
// and still makes RETURNING yield the row on the existing-user path, race-free.
const UPSERT_USER_SQL = `
  INSERT INTO users (clerk_user_id, workspace_id, role)
  VALUES ($1, gen_random_uuid(), $2)
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET role = CASE WHEN $2 = 'owner' THEN 'owner' ELSE users.role END
  RETURNING id, clerk_user_id, workspace_id, plan, role, created_at
`;

// Role hierarchy (PRD-ADMIN-CONSOLE S1): owner ⊇ admin ⊇ learner.
export const ROLE_RANK = { learner: 0, admin: 1, owner: 2 };

/** ACADEMY_AUTHORIZED_PARTIES ("https://a.example,https://b.example") → array.
 *  Exported pure so a unit test can cover it without env games. */
export function parseAuthorizedParties(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Production verifier: Clerk session-token verification via the secret key.
 *
 * Hardening (PRD-U1 S3): when ACADEMY_AUTHORIZED_PARTIES is set, the token's
 * azp (authorized party) must be one of those origins — so a session token
 * minted for a DIFFERENT app on the same Clerk instance, or replayed from an
 * unexpected origin, verifies cryptographically but is still refused. Unset →
 * no azp check (today's dev behavior); production must set it. */
export function createClerkVerifier(secretKey) {
  if (!secretKey) {
    throw new Error("[spine] CLERK_SECRET_KEY is required when SPINE_ENABLED=true");
  }
  const authorizedParties = parseAuthorizedParties(process.env.ACADEMY_AUTHORIZED_PARTIES);
  return async function clerkVerifier(token) {
    const { verifyToken } = await import("@clerk/backend");
    return verifyToken(token, authorizedParties.length ? { secretKey, authorizedParties } : { secretKey });
  };
}

/** Production deleter for DELETE /api/me/account: removes the Clerk identity. */
export function createClerkUserDeleter(secretKey) {
  return async function clerkUserDeleter(clerkUserId) {
    const { createClerkClient } = await import("@clerk/backend");
    await createClerkClient({ secretKey }).users.deleteUser(clerkUserId);
  };
}

/**
 * Express middleware guarding every /api/me/* + /api/sync/* route.
 * @param {{verifier: (token:string)=>Promise<object>, pool: import("pg").Pool,
 *          adminAllowlist?: Set<string>}} deps — adminAllowlist bootstraps owners.
 */
export function createAuthMiddleware({ verifier, pool, adminAllowlist }) {
  const allow = adminAllowlist instanceof Set ? adminAllowlist : new Set();
  return async function spineAuth(req, res, next) {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (!token) return fail(res, 401, "missing_token");

      let claims;
      try {
        claims = await verifier(token);
      } catch (_e) {
        return fail(res, 401, "invalid_token");
      }
      const clerkUserId = claims && typeof claims.sub === "string" && claims.sub ? claims.sub : null;
      if (!clerkUserId) return fail(res, 403, "token_missing_subject");

      const bootstrapRole = allow.has(clerkUserId) ? "owner" : "learner";
      const { rows } = await pool.query(UPSERT_USER_SQL, [clerkUserId, bootstrapRole]);
      req.spineUser = rows[0];
      next();
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Gate a route on a minimum role (owner ⊇ admin ⊇ learner). Runs AFTER
 * spineAuth (which sets req.spineUser). Fail-closed: an unknown/absent role is
 * treated as below everything. e.g. app.use("/api/admin", auth, requireRole("admin"), router).
 */
export function requireRole(minRole) {
  const min = ROLE_RANK[minRole] ?? Infinity;
  return function requireRoleMw(req, res, next) {
    const role = (req.spineUser && req.spineUser.role) || "learner";
    if ((ROLE_RANK[role] ?? -1) >= min) return next();
    return fail(res, 403, "forbidden_role");
  };
}
