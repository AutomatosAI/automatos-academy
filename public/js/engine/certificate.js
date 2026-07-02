// Completion + shareable-certificate model (PRD-CREDENTIALS v1).
//
// Pure module — no DOM, no fetch — so server.js can import it too (the /cert
// OG route decodes the same payload). v1 badges are SOCIAL PROOF, not
// verification: the checksum only deters casual URL editing. Signed badges
// with a verify endpoint are v2 (PRD-CREDENTIALS §4) — never render the word
// "verified" from this module.

// A track without a scored exam is a skills track (APA/ABF shape): no mock,
// no A+ gate; completion = every lesson done.
export const isSkillsTrack = (track) => !track.exam || !track.exam.questionCount;

export function completion(track, store, verdictFn) {
  if (isSkillsTrack(track)) {
    let total = 0, done = 0;
    for (const d of track.domains || []) {
      for (const l of d.lessons || []) { total++; if (store.lessonDone(l.id)) done++; }
    }
    const pct = total ? done / total : 0;
    return { kind: "skills", complete: total > 0 && done === total, pct, done, total };
  }
  const v = verdictFn(track, store);
  return { kind: "exam", complete: v.qualified, pct: v.overall.mastery, verdict: v };
}

// ── payload codec: base64url(JSON) + "." + checksum ─────────────────────
// Fields kept one-letter so certificate URLs stay shareable-short.
const SALT = "automatos-academy-cert-v1";

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const b64encode = (s) => {
  const utf8 = typeof Buffer !== "undefined"
    ? Buffer.from(s, "utf8").toString("base64")
    : btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  return utf8.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64decode = (s) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
};

export function encodeCert({ name, vendorId, trackId, code, date }) {
  const body = b64encode(JSON.stringify({ n: name, v: vendorId, t: trackId, c: code || "", d: date }));
  return `${body}.${djb2(SALT + body)}`;
}

export function decodeCert(payload) {
  const dot = (payload || "").lastIndexOf(".");
  if (dot < 1) return null;
  const body = payload.slice(0, dot), sum = payload.slice(dot + 1);
  if (djb2(SALT + body) !== sum) return null;
  try {
    const o = JSON.parse(b64decode(body));
    if (!o.n || !o.v || !o.t || !o.d) return null;
    return { name: o.n, vendorId: o.v, trackId: o.t, code: o.c || "", date: o.d, certId: sum };
  } catch (_) {
    return null;
  }
}

// Honest badge copy (PRD-CREDENTIALS §2): we certify PREP/TRACK completion,
// never the external credential. track.badge{} in track.json can override.
export function badgeCopy(track) {
  const badge = track.badge || {};
  if (badge.completionLabel && badge.definition) return badge;
  if (isSkillsTrack(track)) {
    return {
      completionLabel: `Completed — ${track.name}`,
      definition: `Completed the Automatos Academy ${track.name} track, including every module's hands-on work.`,
    };
  }
  return {
    completionLabel: `Prep completed — ${track.code || track.name}`,
    definition: `Completed the Automatos Academy ${track.code || track.name} preparation track to the A+ readiness standard (≥90% weighted mastery and a full-length mock passed with margin). This certifies preparation completion — not the credential itself, which only the certification body issues.`,
  };
}

// LinkedIn "Add to profile" deep link. Parameter set per LinkedIn's
// documented add-to-profile URL — RE-VERIFY against their docs at launch
// (PRD-CREDENTIALS §3.3; params have drifted before).
export function linkedInAddUrl({ certName, certUrl, certId, issued }) {
  const d = new Date(issued);
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: certName,
    organizationName: "Automatos AI",
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certUrl,
    certId,
  });
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}
