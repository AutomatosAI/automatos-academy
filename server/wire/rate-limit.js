// Per-IP in-memory rate limit for the wire WRITE routes (PRD-WIRE §4.2) —
// the same fixed-window pattern as server.js's badge-sign limiter. It runs
// BEFORE the key guard so key-probing is throttled too. Ephemeral by design;
// resets on restart. The daily mission makes a handful of calls — anything
// hot against this API is not the mission.
const SWEEP_THRESHOLD = 5000;

/**
 * @param {{max?: number, windowMs?: number}} opts — requests allowed per IP
 *        per window. Injectable so tests can trip the limit cheaply.
 */
export function createIpRateLimiter({ max = 60, windowMs = 60_000 } = {}) {
  const hits = new Map();
  return function wireRateLimit(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
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
    if (rec.count > max) return res.status(429).json({ error: "rate_limited" });
    next();
  };
}
