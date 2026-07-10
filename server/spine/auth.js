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
// workspace_id (workspace-per-user tenancy, 02 §3). The no-op DO UPDATE makes
// RETURNING yield the row on the existing-user path too, race-free.
const UPSERT_USER_SQL = `
  INSERT INTO users (clerk_user_id, workspace_id)
  VALUES ($1, gen_random_uuid())
  ON CONFLICT (clerk_user_id) DO UPDATE SET clerk_user_id = EXCLUDED.clerk_user_id
  RETURNING id, clerk_user_id, workspace_id, plan, created_at
`;

/** Production verifier: Clerk session-token verification via the secret key. */
export function createClerkVerifier(secretKey) {
  if (!secretKey) {
    throw new Error("[spine] CLERK_SECRET_KEY is required when SPINE_ENABLED=true");
  }
  return async function clerkVerifier(token) {
    const { verifyToken } = await import("@clerk/backend");
    return verifyToken(token, { secretKey });
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
 * @param {{verifier: (token:string)=>Promise<object>, pool: import("pg").Pool}} deps
 */
export function createAuthMiddleware({ verifier, pool }) {
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

      const { rows } = await pool.query(UPSERT_USER_SQL, [clerkUserId]);
      req.spineUser = rows[0];
      next();
    } catch (e) {
      next(e);
    }
  };
}
