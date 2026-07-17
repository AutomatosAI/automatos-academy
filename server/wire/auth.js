// X-Wire-Key guard (PRD-WIRE §4.2). WIRE_INGEST_KEY is a server-held secret —
// the REVERSE edge of the tutor integration: the tutor calls out with a
// public ak_pub_* key, the Wire is called INTO by a platform mission holding
// a private key. It is never hydrated into any public/ config file.
//
// Compare is timing-safe (the server.js sigMatches posture): both sides are
// sha256-digested first so timingSafeEqual always sees equal-length buffers
// and neither content nor length leaks through response timing. 401 never
// says WHY the key failed.
import { createHash, timingSafeEqual } from "crypto";

const digest = (s) => createHash("sha256").update(String(s), "utf8").digest();

/** Pure comparator, exported for tests: (expectedKey) → (candidate) → bool. */
export function keyMatcher(expectedKey) {
  const expected = digest(expectedKey);
  return (candidate) =>
    typeof candidate === "string" && candidate.length > 0 && timingSafeEqual(digest(candidate), expected);
}

/** Express middleware guarding every write route under /api/wire. */
export function createKeyGuard(ingestKey) {
  if (!ingestKey) throw new Error("[wire] createKeyGuard requires the ingest key");
  const matches = keyMatcher(ingestKey);
  return function requireWireKey(req, res, next) {
    if (!matches(req.get("x-wire-key"))) return res.status(401).json({ error: "unauthorized" });
    next();
  };
}
