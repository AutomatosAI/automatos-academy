// Shareable completion certificate (PRD-CREDENTIALS v1) — the claim panel
// (rendered on readiness/progress views) and the public certificate page.
// v1 is honest social proof: the payload checksum deters casual URL edits,
// nothing more — copy never says "verified".
import { el } from "../ui.js";
import { url } from "../router.js";
import { loadCatalog, loadTrack } from "../content.js";
import { encodeCert, decodeCert, badgeCopy, linkedInAddUrl, isSkillsTrack } from "../engine/certificate.js";
import { user as authUser } from "../auth.js";
import { nativeShareButton } from "../share.js";
import { track as tk } from "../analytics.js";
import { accountAsk } from "../account-ask.js";

const NAME_KEY = "automatos-academy:v1:claim-name";
const certHash = (payload) => `/cert/${payload}`;
const absoluteCertUrl = (payload) => `${location.origin}/cert/${payload}`;

// v2 signed badges (PRD-CREDENTIALS §4). The "~" separator survives the router
// param regex ([^\/]+) and can't appear in base64url, the "." checksum, or a
// hex sig — so a signed link is "<payload>~<sig>", an unsigned one just "<payload>".
const SIG_SEP = "~";
const splitSig = (raw) => {
  const i = (raw || "").indexOf(SIG_SEP);
  return i === -1 ? { payload: raw || "", sig: "" } : { payload: raw.slice(0, i), sig: raw.slice(i + 1) };
};

// Ask the server to sign the payload. Signing is progressive enhancement:
// any failure (offline, 501 no-backend, 429, malformed) resolves to "" and the
// caller silently falls back to the unsigned link.
async function signBadge(payload) {
  try {
    const r = await fetch("/api/badge/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return typeof j.sig === "string" ? j.sig : "";
  } catch (_) { return ""; }
}

async function verifyBadge(payload, sig) {
  if (!sig) return false;
  try {
    const q = new URLSearchParams({ payload, sig });
    const r = await fetch(`/api/badge/verify?${q.toString()}`);
    if (!r.ok) return false;
    const j = await r.json();
    return j.valid === true;
  } catch (_) { return false; }
}

// ── claim panel ──────────────────────────────────────────────────────────
export function claimPanel(trackData, comp) {
  const requirement = comp.kind === "exam"
    ? "Reach A+ (≥90% weighted mastery and a full mock passed with margin) to claim your completion badge."
    : "Complete every lesson to claim your completion badge.";

  if (!comp.complete) {
    return el("div", { class: "panel", style: { marginTop: "26px" } }, [
      el("span", { class: "mono-label", text: "Completion badge" }),
      el("p", { class: "muted", style: { margin: "8px 0 0", fontSize: "14px" }, text: requirement }),
    ]);
  }

  let savedName = "";
  try { savedName = localStorage.getItem(NAME_KEY) || ""; } catch (_) {}
  // Prefill (PRD-U1): an explicitly saved claim-name wins; otherwise a
  // signed-in learner's Clerk profile name starts the field. Always editable.
  const clerkName = (authUser() && authUser().name) || "";
  const input = el("input", { class: "claim-input", type: "text", placeholder: "Your name, as it should appear", value: savedName || clerkName, "aria-label": "Your name for the certificate" });
  const go = el("button", { class: "ac-btn ac-btn-solid", type: "button" }, ["Claim your badge ", el("span", { class: "arr", text: "→" })]);
  const hint = el("p", { class: "muted", style: { margin: "10px 0 0", fontSize: "12.5px" }, text: "Generates a shareable certificate page — add it to LinkedIn in one click. Your name goes into the certificate link itself; while you're signed out, nothing is stored on our servers." });

  go.addEventListener("click", async () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    try { localStorage.setItem(NAME_KEY, name); } catch (_) {}
    const payload = encodeCert({
      name,
      vendorId: trackData.vendorId,
      trackId: trackData.trackId,
      code: trackData.code || "",
      date: new Date().toISOString().slice(0, 10),
    });
    tk("badge_claim", { track: trackData.trackId });
    // Progressive enhancement: try to server-sign, else navigate unsigned.
    go.disabled = true;
    const sig = await signBadge(payload);
    location.hash = certHash(sig ? `${payload}${SIG_SEP}${sig}` : payload);
  });

  return el("div", { class: "panel claim-box", style: { marginTop: "26px" } }, [
    el("span", { class: "mono-label", text: "Completion badge — earned" }),
    el("h3", { class: "serif-i", style: { fontSize: "24px", margin: "10px 0 4px" }, text: badgeCopy(trackData).completionLabel }),
    el("div", { class: "row", style: { gap: "10px", marginTop: "14px", flexWrap: "wrap" } }, [input, go]),
    hint,
    // PRD-WEB-LOOP §4.2 rider (D-WL3): the claim moment is peak earned value —
    // one extra line, same shared cooldown ledger, so a learner never sees
    // two asks in a week. Null when signed in / cooling down / retired.
    accountAsk("badge_claim"),
  ]);
}

// ── certificate page (#/cert/:payload) ───────────────────────────────────
export async function certificateView({ params }) {
  // A signed link is "<payload>~<sig>"; unsigned links decode exactly as v1.
  const { payload, sig } = splitSig(params.payload);
  const cert = decodeCert(payload);
  if (!cert) {
    return el("div", { class: "section" }, [el("div", { class: "wrap" }, [
      el("span", { class: "mono-label", text: "Certificate" }),
      el("h1", { class: "serif-i", style: { fontSize: "40px", marginTop: "10px" }, text: "That link doesn't check out." }),
      el("p", { class: "muted", text: "The certificate payload is malformed or was edited. Ask the holder to re-share it." }),
      el("a", { class: "ac-btn", href: "#" + url.catalog(), style: { marginTop: "18px" } }, ["← To the Academy"]),
    ])]);
  }

  // Names come from content when the track is known; the cert stays renderable
  // (from its own payload) even if a track is later renamed or retired.
  let trackData = null;
  try { trackData = await loadTrack(cert.vendorId, cert.trackId); } catch (_) {}
  let vendorName = cert.vendorId, trackName = cert.code || cert.trackId;
  if (trackData) { vendorName = trackData.vendorName || vendorName; trackName = trackData.name; }
  else {
    try {
      const cat = await loadCatalog();
      const vend = cat.vendors.find((x) => x.id === cert.vendorId);
      const tr = vend && vend.tracks.find((x) => x.trackId === cert.trackId);
      if (vend) vendorName = vend.name;
      if (tr) trackName = tr.name;
    } catch (_) {}
  }
  const copy = trackData ? badgeCopy(trackData) : { completionLabel: `Completed — ${trackName}`, definition: `Completed the Automatos Academy ${trackName} track.` };
  tk("badge_view", { track: cert.trackId });

  const certName = `Automatos Academy — ${copy.completionLabel}`;
  const liHref = linkedInAddUrl({ certName, certUrl: absoluteCertUrl(params.payload), certId: cert.certId, issued: cert.date });

  const copyBtn = el("button", { class: "ac-btn", type: "button" }, ["Copy link"]);
  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(absoluteCertUrl(params.payload)); copyBtn.textContent = "Copied ✓"; } catch (_) { copyBtn.textContent = absoluteCertUrl(params.payload); }
  });

  // Filled asynchronously with the "Signed by the Academy" chip iff a valid
  // sig verifies. On invalid/absent sig it stays empty — never an error banner.
  const signedChip = el("div", { class: "no-print", style: { marginTop: "12px" } });

  const card = el("div", { class: "cert-card" }, [
    el("div", { class: "row", style: { justifyContent: "space-between", alignItems: "baseline" } }, [
      el("span", { class: "mono-label", text: "Automatos Academy" }),
      el("span", { class: "mono-label", text: cert.date }),
    ]),
    el("p", { class: "mono-label", style: { marginTop: "34px" }, text: "This certifies that" }),
    el("h1", { class: "serif-i", style: { fontSize: "clamp(34px,6vw,58px)", margin: "8px 0 0" }, text: cert.name }),
    el("p", { class: "lede", style: { marginTop: "18px", maxWidth: "58ch" }, text: copy.completionLabel }),
    el("p", { class: "muted", style: { marginTop: "14px", maxWidth: "62ch", fontSize: "14px" }, text: copy.definition }),
    el("div", { class: "row", style: { justifyContent: "space-between", marginTop: "36px", paddingTop: "16px", borderTop: "1px dashed var(--rule)" } }, [
      el("span", { class: "mono-label", text: `${vendorName} · ${trackName}` }),
      el("span", { class: "mono-label", text: `Ref ${cert.certId}` }),
    ]),
    signedChip,
  ]);

  // Progressive enhancement: verify the sig (if any) and reveal the chip.
  if (sig) {
    verifyBadge(payload, sig).then((valid) => {
      if (valid) signedChip.appendChild(el("span", { class: "mono-label", text: "✓ Signed by the Academy" }));
    });
  }

  return el("div", {}, [
    el("section", { class: "section" }, [el("div", { class: "wrap", style: { maxWidth: "820px" } }, [
      card,
      el("div", { class: "row no-print", style: { gap: "10px", marginTop: "22px", flexWrap: "wrap" } }, [
        el("a", { class: "ac-btn ac-btn-solid", href: liHref, target: "_blank", rel: "noopener" }, ["Add to LinkedIn profile ↗"]),
        copyBtn,
        // PRD-COMMUNITY S1: native share sheet where the platform has one
        // (el() skips the null this returns elsewhere; Copy link covers it).
        nativeShareButton({ title: certName, url: absoluteCertUrl(params.payload) }),
        el("button", { class: "ac-btn", type: "button", onClick: () => window.print() }, ["Save as PDF"]),
        el("a", { class: "ac-btn", href: "#" + url.track(cert.vendorId, cert.trackId) }, ["Start this track →"]),
      ]),
      el("p", { class: "muted no-print", style: { marginTop: "18px", fontSize: "12.5px", maxWidth: "70ch" }, text:
        "Automatos Academy is independent, free training. Completion badges certify Academy work — never an external credential, which only its certification body can issue. Not affiliated with or endorsed by any certification body." }),
    ])]),
  ]);
}
