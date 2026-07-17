// Badge/share HMAC signing (PRD-CREDENTIALS §4, extracted from server.js for
// PRD-COMMUNITY S1 so the round-trip is unit-testable). The signature attests
// only that THIS deploy signed the payload — for certificates "the Academy
// issued this link", for share cards "the Spine attested this number". Copy
// is always "Signed by the Academy", never "verified". Stateless: the HMAC is
// recomputable from the payload alone, so it works on ephemeral instances.
import { createHmac, timingSafeEqual } from "crypto";

/**
 * @param {string} secret — BADGE_SIGNING_SECRET (or the dev default)
 * @returns {{sign: (payload:string)=>string, matches: (payload:string, sig:string)=>boolean}}
 */
export function createSigner(secret) {
  if (!secret) throw new Error("createSigner requires a secret");

  // HMAC-SHA256(payload) as lowercase hex — chars are [0-9a-f] only, so a sig
  // never collides with base64url ([A-Za-z0-9-_]), the "." checksum separator,
  // or the "~" payload~sig separator used in cert/share URLs.
  const sign = (payload) => createHmac("sha256", secret).update(payload).digest("hex");

  const matches = (payload, sig) => {
    if (typeof payload !== "string" || !payload) return false;
    if (typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
    const expected = Buffer.from(sign(payload), "utf8");
    const got = Buffer.from(sig, "utf8");
    return expected.length === got.length && timingSafeEqual(expected, got);
  };

  return { sign, matches };
}
