// Per-user in-memory rate limit for the sync routes (PRD-MT-02 US-023) —
// the same fixed-window pattern as server.js's badge-sign limiter, keyed by
// users.id instead of IP. Ephemeral by design; resets on restart.
import { fail } from "./http.js";

const SWEEP_THRESHOLD = 5000;

/**
 * @param {{max?: number, windowMs?: number}} opts — requests allowed per user
 *        per window. Injectable so tests can trip the limit cheaply.
 */
export function createUserRateLimiter({ max = 60, windowMs = 60_000 } = {}) {
  const hits = new Map();
  return function userRateLimit(req, res, next) {
    // Runs behind auth, so spineUser is always present; fall back to IP just
    // in case someone re-mounts it ahead of auth.
    const key = req.spineUser ? req.spineUser.id : req.ip || "unknown";
    const now = Date.now();
    const rec = hits.get(key);
    if (!rec || now - rec.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
      if (hits.size > SWEEP_THRESHOLD) {
        for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
      }
      return next();
    }
    rec.count += 1;
    if (rec.count > max) return fail(res, 429, "rate_limited");
    next();
  };
}
