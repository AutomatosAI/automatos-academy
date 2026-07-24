// Serve-time content overlay (PRD-CONTENT-LIFECYCLE S4). The text twin of the
// media overlay (server/media/overlay.js): an APPROVED draft for a scope
// renders over the git/DB base at /api/catalog WITHOUT a republish. Pure — the
// served index is shared + cached, so this returns a decision, never mutates.
//
// A content override is a WHOLE-document swap (byte-fidelity: we serve exactly
// JSON.parse(canonical), and fold the draft's sha into the ETag so the change
// busts caches within one overlay refresh). Fail-soft: a malformed draft (which
// approval already guards against) is ignored — serving the base is always
// safe, an override never white-screens the catalog.

/**
 * @param base        the git/DB document object for this scope
 * @param baseHash    its content hash (the ETag hash absent an override)
 * @param override    { canonical, sha256 } | null  (an approved draft's bytes)
 * @returns { body, hash } — the base untouched, or the override's parsed body
 *          with a folded hash. Never throws.
 */
export function applyContentOverride(base, baseHash, override) {
  if (!override || typeof override.canonical !== "string") return { body: base, hash: baseHash };
  let parsed;
  try {
    parsed = JSON.parse(override.canonical);
  } catch {
    return { body: base, hash: baseHash }; // malformed → base wins, silently
  }
  if (!parsed || typeof parsed !== "object") return { body: base, hash: baseHash };
  const tag = typeof override.sha256 === "string" ? override.sha256.slice(0, 12) : "ov";
  return { body: parsed, hash: `${baseHash}-${tag}` };
}
