// Admin gate for the content-ops plane (PRD-WAVE-CONTENT-OPS C3, D-CO1).
// Two principals, one gate:
//   • MACHINE (Automatos): X-Admin-Key, timing-safe vs ACADEMY_ADMIN_KEY
//     (the digest x-…-admin-key precedent).
//   • BROWSER (Gerard): a Clerk-verified Bearer token whose subject is in the
//     ACADEMY_ADMIN_CLERK_IDS allowlist.
// Fail-closed: no key and no allow-listed token ⇒ 403. Self-contained — it
// verifies the token itself (via the injected verifier), so machine callers
// never need Clerk and the media plane doesn't depend on the Spine's
// mandatory auth middleware.

import crypto from "node:crypto";

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function parseAllowlist(raw) {
  return new Set(
    String(raw || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * @param adminKey  ACADEMY_ADMIN_KEY (machine path); falsy ⇒ machine path off
 * @param allowlist Set of allowed Clerk user ids (browser path)
 * @param verifier  async (token) → claims ({sub}); falsy ⇒ browser path off
 */
export function createRequireAdmin({ adminKey, allowlist, verifier }) {
  const ids = allowlist instanceof Set ? allowlist : parseAllowlist(allowlist);
  return function requireAdmin(req, res, next) {
    (async () => {
      const key = req.headers["x-admin-key"];
      if (adminKey && key && safeEqual(key, adminKey)) {
        req.adminActor = "machine";
        return next();
      }
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (token && verifier && ids.size > 0) {
        const claims = await verifier(token).catch(() => null);
        const sub = claims && typeof claims.sub === "string" ? claims.sub : null;
        if (sub && ids.has(sub)) {
          req.adminActor = sub;
          return next();
        }
      }
      return res.status(403).json({ error: "forbidden" });
    })().catch(next);
  };
}
